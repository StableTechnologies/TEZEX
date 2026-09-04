(*
  TEZEX single-pair token-to-token constant-product pool.

  Design lineage:
  - QuipuSwap TTDex commit 41fd4293029e2094a564141fb389fd9a1ef19185
  - QuipuSwap Core V2 transfer wrappers at
    684f17d42293034764fd2ff70ce1075b912406da
  - TEZEX external FA1.2 LQT and hardened inactive initialization lifecycle

  Each deployment serves one immutable FA1.2/FA2 pair. The fee schedule is
  immutable: 25 bp remains in the AMM reserve for LPs and 5 bp accrues outside
  the tradable reserve for the protocol recipient.
*)

module TokenTokenPool = struct
  (* --------------------------------------------------------------------- *)
  (* Constants and errors                                                  *)
  (* --------------------------------------------------------------------- *)

  let fee_denominator : nat = 10000n
  let lp_fee_bp : nat = 25n
  let protocol_fee_bp : nat = 5n
  let total_fee_bp : nat = 30n
  let swap_fee_numerator : nat = 9970n
  let minimum_lqt : nat = 1000n

  let err_non_payable = "POOL_NON_PAYABLE"
  let err_entered = "POOL_REENTRANCY"
  let err_not_entered = "POOL_NOT_ENTERED"
  let err_self_only = "POOL_SELF_ONLY"
  let err_not_manager = "POOL_NOT_MANAGER"
  let err_not_pending_manager = "POOL_NOT_PENDING_MANAGER"
  let err_not_pending_fee_recipient = "POOL_NOT_PENDING_FEE_RECIPIENT"
  let err_pending_manager = "POOL_PENDING_MANAGER"
  let err_pending_fee_recipient = "POOL_PENDING_FEE_RECIPIENT"
  let err_invalid_address = "POOL_INVALID_ADDRESS"
  let err_paused = "POOL_PAUSED"
  let err_not_active = "POOL_NOT_ACTIVE"
  let err_already_active = "POOL_ALREADY_ACTIVE"
  let err_lqt_not_set = "POOL_LQT_NOT_SET"
  let err_lqt_already_set = "POOL_LQT_ALREADY_SET"
  let err_same_asset = "POOL_IDENTICAL_ASSETS"
  let err_expired = "POOL_DEADLINE_EXPIRED"
  let err_zero_amount = "POOL_ZERO_AMOUNT"
  let err_zero_output = "POOL_ZERO_OUTPUT"
  let err_slippage = "POOL_SLIPPAGE"
  let err_insufficient_liquidity = "POOL_INSUFFICIENT_LIQUIDITY"
  let err_minimum_lqt = "POOL_MINIMUM_LQT"
  let err_no_protocol_fee = "POOL_NO_PROTOCOL_FEE"
  let err_nat_underflow = "POOL_NAT_UNDERFLOW"
  let err_missing_fa12_transfer = "POOL_MISSING_FA12_TRANSFER"
  let err_missing_fa2_transfer = "POOL_MISSING_FA2_TRANSFER"
  let err_missing_lqt_mint_burn = "POOL_MISSING_LQT_MINT_OR_BURN"
  let err_missing_lqt_supply_view = "POOL_MISSING_LQT_SUPPLY_VIEW"
  let err_lqt_supply_not_zero = "POOL_LQT_SUPPLY_NOT_ZERO"
  let err_dirty_initial_state = "POOL_DIRTY_INITIAL_STATE"
  let err_lqt_is_asset = "POOL_LQT_IS_RESERVE_ASSET"
  let err_missing_close = "POOL_MISSING_CLOSE"

  (* --------------------------------------------------------------------- *)
  (* Asset and external-contract types                                     *)
  (* --------------------------------------------------------------------- *)

  type fa2_token =
    [@layout:comb]
    {
      token : address;
      id : nat
    }

  type token =
    | Fa12 of address
    | Fa2 of fa2_token

  type token_side = Token_a | Token_b
  type swap_direction = A_to_b | B_to_a

  type fa12_transfer = address * (address * nat)

  type fa2_tx =
    [@layout:comb]
    {
      to_ : address;
      token_id : nat;
      amount : nat
    }

  type fa2_transfer_item =
    [@layout:comb]
    {
      from_ : address;
      txs : fa2_tx list
    }

  type fa2_transfer = fa2_transfer_item list

  type mint_or_burn =
    [@layout:comb]
    {
      quantity : int;
      target : address
    }

  (* --------------------------------------------------------------------- *)
  (* Public parameters and storage                                         *)
  (* --------------------------------------------------------------------- *)

  type initialize_param =
    [@layout:comb]
    {
      amount_a : nat;
      amount_b : nat;
      receiver : address;
      deadline : timestamp
    }

  type add_liquidity_param =
    [@layout:comb]
    {
      max_amount_a : nat;
      max_amount_b : nat;
      min_lqt_minted : nat;
      receiver : address;
      deadline : timestamp
    }

  type remove_liquidity_param =
    [@layout:comb]
    {
      lqt_burned : nat;
      min_amount_a : nat;
      min_amount_b : nat;
      receiver : address;
      deadline : timestamp
    }

  type swap_param =
    [@layout:comb]
    {
      direction : swap_direction;
      amount_in : nat;
      min_amount_out : nat;
      receiver : address;
      deadline : timestamp
    }

  type storage =
    [@layout:comb]
    {
      token_a : token;
      token_b : token;
      reserve_a : nat;
      reserve_b : nat;
      protocol_fee_a : nat;
      protocol_fee_b : nat;
      lqt_total : nat;
      lqt_address : address option;
      active : bool;
      paused : bool;
      entered : bool;
      manager : address;
      pending_manager : address option;
      protocol_fee_recipient : address;
      pending_fee_recipient : address option;
      metadata : (string, bytes) big_map
    }

  type result = operation list * storage

  (* --------------------------------------------------------------------- *)
  (* Checked arithmetic and common assertions                              *)
  (* --------------------------------------------------------------------- *)

  let assert_non_payable () : unit =
    Assert.Error.assert (Tezos.get_amount () = 0mutez) err_non_payable

  let assert_idle (s : storage) : unit =
    Assert.Error.assert (not s.entered) err_entered

  let assert_manager (s : storage) : unit =
    Assert.Error.assert (Tezos.get_sender () = s.manager) err_not_manager

  let assert_live (s : storage) : unit =
    Assert.Error.assert (not s.paused) err_paused

  let assert_ready (s : storage) : unit =
    Assert.Error.assert
      (s.active
       && s.reserve_a > 0n
       && s.reserve_b > 0n
       && s.lqt_total >= minimum_lqt)
      err_not_active

  let assert_deadline (deadline : timestamp) : unit =
    Assert.Error.assert (Tezos.get_now () <= deadline) err_expired

  let assert_external_address (candidate : address) : unit =
    Assert.Error.assert
      (candidate <> Tezos.get_self_address ())
      err_invalid_address

  let token_address (asset : token) : address =
    match asset with
    | Fa12 address -> address
    | Fa2 token_info -> token_info.token

  let assets_are_distinct (token_a : token) (token_b : token) : bool =
    match (token_a, token_b) with
    | (Fa12 address_a, Fa12 address_b) -> address_a <> address_b
    | (Fa12 address_a, Fa2 asset_b) -> address_a <> asset_b.token
    | (Fa2 asset_a, Fa12 address_b) -> asset_a.token <> address_b
    | (Fa2 asset_a, Fa2 asset_b) ->
        asset_a.token <> asset_b.token || asset_a.id <> asset_b.id

  let checked_sub (a : nat) (b : nat) : nat =
    match is_nat (a - b) with
    | Some value -> value
    | None -> failwith err_nat_underflow

  let ceil_div (numerator : nat) (denominator : nat) : nat =
    match ediv numerator denominator with
    | Some (quotient, remainder) ->
        if remainder = 0n then quotient else quotient + 1n
    | None -> failwith err_insufficient_liquidity

  let min_nat (a : nat) (b : nat) : nat = if a < b then a else b

  [@tailrec]
  let rec integer_sqrt_step (value : nat) (estimate : nat) : nat =
    let next = (estimate + (value / estimate)) / 2n in
    if next >= estimate
    then estimate
    else integer_sqrt_step value next

  let integer_sqrt (value : nat) : nat =
    if value < 2n
    then value
    else integer_sqrt_step value ((value / 2n) + 1n)

  let quote_output (amount_in : nat) (reserve_in : nat) (reserve_out : nat) : nat =
    if amount_in = 0n || reserve_in = 0n || reserve_out = 0n
    then 0n
    else
      let amount_with_fee = amount_in * swap_fee_numerator in
      (amount_with_fee * reserve_out)
      / ((reserve_in * fee_denominator) + amount_with_fee)

  let protocol_fee (amount_in : nat) : nat =
    (amount_in * protocol_fee_bp) / fee_denominator

  (* --------------------------------------------------------------------- *)
  (* Typed external operations                                             *)
  (* --------------------------------------------------------------------- *)

  let transfer_fa12
    (from_ : address)
    (to_ : address)
    (amount : nat)
    (token_address : address)
  : operation =
    let transfer_entrypoint : fa12_transfer contract =
      match
        (Tezos.get_entrypoint_opt "%transfer" token_address
          : fa12_transfer contract option)
      with
      | Some entrypoint -> entrypoint
      | None -> failwith err_missing_fa12_transfer in
    Tezos.transaction (from_, (to_, amount)) 0mutez transfer_entrypoint

  let transfer_fa2
    (from_ : address)
    (to_ : address)
    (amount : nat)
    (asset : fa2_token)
  : operation =
    let transfer_entrypoint : fa2_transfer contract =
      match
        (Tezos.get_entrypoint_opt "%transfer" asset.token
          : fa2_transfer contract option)
      with
      | Some entrypoint -> entrypoint
      | None -> failwith err_missing_fa2_transfer in
    let parameter : fa2_transfer =
      [
        {
          from_ = from_;
          txs = [{to_ = to_; token_id = asset.id; amount = amount}]
        }
      ] in
    Tezos.transaction parameter 0mutez transfer_entrypoint

  let transfer_token
    (from_ : address)
    (to_ : address)
    (amount : nat)
    (asset : token)
  : operation =
    match asset with
    | Fa12 token_address -> transfer_fa12 from_ to_ amount token_address
    | Fa2 token_info -> transfer_fa2 from_ to_ amount token_info

  let get_lqt_address (s : storage) : address =
    match s.lqt_address with
    | Some address -> address
    | None -> failwith err_lqt_not_set

  let mint_or_burn_lqt
    (lqt_address : address)
    (target : address)
    (quantity : int)
  : operation =
    let entrypoint : mint_or_burn contract =
      match
        (Tezos.get_entrypoint_opt "%mintOrBurn" lqt_address
          : mint_or_burn contract option)
      with
      | Some entrypoint -> entrypoint
      | None -> failwith err_missing_lqt_mint_burn in
    Tezos.transaction {quantity = quantity; target = target} 0mutez entrypoint

  let checked_lqt_total_supply (lqt_address : address) : nat =
    let (_mint_or_burn : mint_or_burn contract) =
      match
        (Tezos.get_entrypoint_opt "%mintOrBurn" lqt_address
          : mint_or_burn contract option)
      with
      | Some entrypoint -> entrypoint
      | None -> failwith err_missing_lqt_mint_burn in
    match
      (Tezos.call_view "get_total_supply" () lqt_address : nat option)
    with
    | Some total -> total
    | None -> failwith err_missing_lqt_supply_view

  let close_operation () : operation =
    let entrypoint : unit contract =
      match
        (Tezos.get_entrypoint_opt "%close" (Tezos.get_self_address ())
          : unit contract option)
      with
      | Some entrypoint -> entrypoint
      | None -> failwith err_missing_close in
    Tezos.transaction () 0mutez entrypoint

  (* --------------------------------------------------------------------- *)
  (* Pool lifecycle and user actions                                        *)
  (* --------------------------------------------------------------------- *)

  [@entry]
  let set_lqt_address (lqt_address : address) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    let () = Assert.Error.assert (not s.active) err_already_active in
    let () = assert_external_address lqt_address in
    let () =
      Assert.Error.assert
        (lqt_address <> token_address s.token_a
         && lqt_address <> token_address s.token_b)
        err_lqt_is_asset in
    let total_supply = checked_lqt_total_supply lqt_address in
    let () = Assert.Error.assert (total_supply = 0n) err_lqt_supply_not_zero in
    let () =
      match s.lqt_address with
      | None -> ()
      | Some _ -> failwith err_lqt_already_set in
    ([], {s with lqt_address = Some lqt_address})

  [@entry]
  let initialize (param : initialize_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    let () = Assert.Error.assert (not s.active) err_already_active in
    let () =
      Assert.Error.assert
        (assets_are_distinct s.token_a s.token_b)
        err_same_asset in
    let () =
      Assert.Error.assert
        (s.reserve_a = 0n
         && s.reserve_b = 0n
         && s.protocol_fee_a = 0n
         && s.protocol_fee_b = 0n
         && s.lqt_total = 0n)
        err_dirty_initial_state in
    let lqt_address = get_lqt_address s in
    let total_supply = checked_lqt_total_supply lqt_address in
    let () = Assert.Error.assert (total_supply = 0n) err_lqt_supply_not_zero in
    let () = assert_deadline param.deadline in
    let () = assert_external_address param.receiver in
    let () =
      Assert.Error.assert
        (param.amount_a > 0n && param.amount_b > 0n)
        err_zero_amount in
    let total = integer_sqrt (param.amount_a * param.amount_b) in
    let () = Assert.Error.assert (total > minimum_lqt) err_minimum_lqt in
    let provider_lqt = checked_sub total minimum_lqt in
    let sender = Tezos.get_sender () in
    let self = Tezos.get_self_address () in
    let operations =
      [
        transfer_token sender self param.amount_a s.token_a;
        transfer_token sender self param.amount_b s.token_b;
        mint_or_burn_lqt lqt_address self (int minimum_lqt);
        mint_or_burn_lqt lqt_address param.receiver (int provider_lqt);
        close_operation ()
      ] in
    (operations,
     {
       s with
       reserve_a = param.amount_a;
       reserve_b = param.amount_b;
       lqt_total = total;
       active = true;
       paused = true;
       entered = true
     })

  [@entry]
  let add_liquidity (param : add_liquidity_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_live s in
    let () = assert_ready s in
    let () = assert_deadline param.deadline in
    let () = assert_external_address param.receiver in
    let lqt_from_a = (param.max_amount_a * s.lqt_total) / s.reserve_a in
    let lqt_from_b = (param.max_amount_b * s.lqt_total) / s.reserve_b in
    let lqt_minted = min_nat lqt_from_a lqt_from_b in
    let () = Assert.Error.assert (lqt_minted > 0n) err_zero_amount in
    let () = Assert.Error.assert (lqt_minted >= param.min_lqt_minted) err_slippage in
    let amount_a = ceil_div (lqt_minted * s.reserve_a) s.lqt_total in
    let amount_b = ceil_div (lqt_minted * s.reserve_b) s.lqt_total in
    let () =
      Assert.Error.assert
        (amount_a <= param.max_amount_a && amount_b <= param.max_amount_b)
        err_slippage in
    let sender = Tezos.get_sender () in
    let self = Tezos.get_self_address () in
    let lqt_address = get_lqt_address s in
    let operations =
      [
        transfer_token sender self amount_a s.token_a;
        transfer_token sender self amount_b s.token_b;
        mint_or_burn_lqt lqt_address param.receiver (int lqt_minted);
        close_operation ()
      ] in
    (operations,
     {
       s with
       reserve_a = s.reserve_a + amount_a;
       reserve_b = s.reserve_b + amount_b;
       lqt_total = s.lqt_total + lqt_minted;
       entered = true
     })

  [@entry]
  let remove_liquidity (param : remove_liquidity_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_ready s in
    let () = assert_deadline param.deadline in
    let () = assert_external_address param.receiver in
    let () = Assert.Error.assert (param.lqt_burned > 0n) err_zero_amount in
    let () =
      Assert.Error.assert
        (param.lqt_burned <= checked_sub s.lqt_total minimum_lqt)
        err_minimum_lqt in
    let amount_a = (param.lqt_burned * s.reserve_a) / s.lqt_total in
    let amount_b = (param.lqt_burned * s.reserve_b) / s.lqt_total in
    let () = Assert.Error.assert (amount_a > 0n && amount_b > 0n) err_zero_output in
    let () =
      Assert.Error.assert
        (amount_a >= param.min_amount_a && amount_b >= param.min_amount_b)
        err_slippage in
    let new_reserve_a = checked_sub s.reserve_a amount_a in
    let new_reserve_b = checked_sub s.reserve_b amount_b in
    let new_total = checked_sub s.lqt_total param.lqt_burned in
    let () =
      Assert.Error.assert
        (new_reserve_a > 0n && new_reserve_b > 0n && new_total >= minimum_lqt)
        err_minimum_lqt in
    let self = Tezos.get_self_address () in
    let lqt_address = get_lqt_address s in
    let operations =
      [
        mint_or_burn_lqt lqt_address (Tezos.get_sender ()) (0 - int param.lqt_burned);
        transfer_token self param.receiver amount_a s.token_a;
        transfer_token self param.receiver amount_b s.token_b;
        close_operation ()
      ] in
    (operations,
     {
       s with
       reserve_a = new_reserve_a;
       reserve_b = new_reserve_b;
       lqt_total = new_total;
       entered = true
     })

  [@entry]
  let swap (param : swap_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_live s in
    let () = assert_ready s in
    let () = assert_deadline param.deadline in
    let () = assert_external_address param.receiver in
    let () = Assert.Error.assert (param.amount_in > 0n) err_zero_amount in
    let (input_token, output_token, reserve_in, reserve_out) =
      match param.direction with
      | A_to_b -> (s.token_a, s.token_b, s.reserve_a, s.reserve_b)
      | B_to_a -> (s.token_b, s.token_a, s.reserve_b, s.reserve_a) in
    let amount_out = quote_output param.amount_in reserve_in reserve_out in
    let () = Assert.Error.assert (amount_out > 0n) err_zero_output in
    let () = Assert.Error.assert (amount_out < reserve_out) err_insufficient_liquidity in
    let () = Assert.Error.assert (amount_out >= param.min_amount_out) err_slippage in
    let protocol_amount = protocol_fee param.amount_in in
    let reserve_input = checked_sub param.amount_in protocol_amount in
    let self = Tezos.get_self_address () in
    let operations =
      [
        transfer_token (Tezos.get_sender ()) self param.amount_in input_token;
        transfer_token self param.receiver amount_out output_token;
        close_operation ()
      ] in
    let updated =
      match param.direction with
      | A_to_b ->
          {
            s with
            reserve_a = s.reserve_a + reserve_input;
            reserve_b = checked_sub s.reserve_b amount_out;
            protocol_fee_a = s.protocol_fee_a + protocol_amount;
            entered = true
          }
      | B_to_a ->
          {
            s with
            reserve_a = checked_sub s.reserve_a amount_out;
            reserve_b = s.reserve_b + reserve_input;
            protocol_fee_b = s.protocol_fee_b + protocol_amount;
            entered = true
          } in
    (operations, updated)

  [@entry]
  let claim_protocol_fee (side : token_side) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_ready s in
    let self = Tezos.get_self_address () in
    let (asset, amount, updated) =
      match side with
      | Token_a ->
          (s.token_a, s.protocol_fee_a, {s with protocol_fee_a = 0n; entered = true})
      | Token_b ->
          (s.token_b, s.protocol_fee_b, {s with protocol_fee_b = 0n; entered = true}) in
    let () = Assert.Error.assert (amount > 0n) err_no_protocol_fee in
    ([transfer_token self s.protocol_fee_recipient amount asset; close_operation ()],
     updated)

  (* --------------------------------------------------------------------- *)
  (* Administration                                                        *)
  (* --------------------------------------------------------------------- *)

  [@entry]
  let set_paused (paused : bool) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    let () =
      if paused
      then ()
      else if not
        (s.active
         && s.reserve_a > 0n
         && s.reserve_b > 0n
         && s.lqt_total >= minimum_lqt)
      then failwith err_not_active
      else
        match s.pending_manager with
        | Some _ -> failwith err_pending_manager
        | None ->
            (match s.pending_fee_recipient with
            | Some _ -> failwith err_pending_fee_recipient
            | None -> ()) in
    ([], {s with paused = paused})

  [@entry]
  let propose_manager (new_manager : address) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    let () = assert_external_address new_manager in
    ([], {s with pending_manager = Some new_manager; paused = true})

  [@entry]
  let cancel_manager_transfer (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    ([], {s with pending_manager = None})

  [@entry]
  let accept_manager (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () =
      match s.pending_manager with
      | Some pending ->
          Assert.Error.assert
            (Tezos.get_sender () = pending)
            err_not_pending_manager
      | None -> failwith err_not_pending_manager in
    ([], {s with manager = Tezos.get_sender (); pending_manager = None})

  [@entry]
  let propose_protocol_fee_recipient (recipient : address) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    let () = assert_external_address recipient in
    ([], {s with pending_fee_recipient = Some recipient; paused = true})

  [@entry]
  let cancel_protocol_fee_recipient (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_manager s in
    ([], {s with pending_fee_recipient = None})

  [@entry]
  let accept_protocol_fee_recipient (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () =
      match s.pending_fee_recipient with
      | Some pending ->
          Assert.Error.assert
            (Tezos.get_sender () = pending)
            err_not_pending_fee_recipient
      | None -> failwith err_not_pending_fee_recipient in
    ([],
     {
       s with
       protocol_fee_recipient = Tezos.get_sender ();
       pending_fee_recipient = None
     })

  [@entry]
  let close (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = Assert.Error.assert s.entered err_not_entered in
    let () =
      Assert.Error.assert
        (Tezos.get_sender () = Tezos.get_self_address ())
        err_self_only in
    ([], {s with entered = false})

  [@entry]
  let default (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    ([], s)

  (* --------------------------------------------------------------------- *)
  (* Read-only views                                                        *)
  (* --------------------------------------------------------------------- *)

  [@view]
  let get_assets (_ : unit) (s : storage) : token * token =
    (s.token_a, s.token_b)

  [@view]
  let get_reserves (_ : unit) (s : storage) : nat * nat =
    (s.reserve_a, s.reserve_b)

  [@view]
  let get_protocol_fees (_ : unit) (s : storage) : nat * nat =
    (s.protocol_fee_a, s.protocol_fee_b)

  [@view]
  let get_lqt_total (_ : unit) (s : storage) : nat =
    s.lqt_total

  [@view]
  let get_minimum_lqt (_ : unit) (_s : storage) : nat =
    minimum_lqt

  [@view]
  let get_fee_bp (_ : unit) (_s : storage) : nat * nat * nat =
    (lp_fee_bp, protocol_fee_bp, total_fee_bp)

  [@view]
  let is_active (_ : unit) (s : storage) : bool =
    s.active

  [@view]
  let is_paused (_ : unit) (s : storage) : bool =
    s.paused

  [@view]
  let quote_a_to_b (amount_in : nat) (s : storage) : nat =
    if s.active && not s.paused
    then quote_output amount_in s.reserve_a s.reserve_b
    else 0n

  [@view]
  let quote_b_to_a (amount_in : nat) (s : storage) : nat =
    if s.active && not s.paused
    then quote_output amount_in s.reserve_b s.reserve_a
    else 0n

  (* --------------------------------------------------------------------- *)
  (* Origination storage                                                    *)
  (* --------------------------------------------------------------------- *)

  type build_storage_param =
    [@layout:comb]
    {
      token_a : token;
      token_b : token;
      manager : address;
      protocol_fee_recipient : address;
      metadata : (string, bytes) big_map
    }

  let build_storage (param : build_storage_param) : storage =
    {
      token_a = param.token_a;
      token_b = param.token_b;
      reserve_a = 0n;
      reserve_b = 0n;
      protocol_fee_a = 0n;
      protocol_fee_b = 0n;
      lqt_total = 0n;
      lqt_address = None;
      active = false;
      paused = true;
      entered = false;
      manager = param.manager;
      pending_manager = None;
      protocol_fee_recipient = param.protocol_fee_recipient;
      pending_fee_recipient = None;
      metadata = param.metadata
    }
end
