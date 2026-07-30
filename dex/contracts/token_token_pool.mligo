(*
  Asset-agnostic FA2-to-FA2 constant-product pool.

  Design lineage:
  - QuipuSwap Core V2, pinned at 684f17d42293034764fd2ff70ce1075b912406da
  - Reworked as an isolated, single-pair pool with an integrated FA2 LP ledger.

  The fee schedule is intentionally immutable:
  - 25 basis points remain in the pool for liquidity providers.
  - 5 basis points accrue separately for the protocol fee recipient.
*)

module TokenTokenPool = struct
  (* ----------------------------------------------------------------------- *)
  (* Constants and errors                                                    *)
  (* ----------------------------------------------------------------------- *)

  let fee_denominator = 10000n
  let lp_fee_bps = 25n
  let protocol_fee_bps = 5n
  let total_fee_bps = lp_fee_bps + protocol_fee_bps
  let minimum_liquidity = 1000n
  let lp_token_id = 0n

  let err_non_payable = "POOL_NON_PAYABLE"
  let err_busy = "POOL_BUSY"
  let err_paused = "POOL_PAUSED"
  let err_not_paused = "POOL_NOT_PAUSED"
  let err_not_admin = "POOL_NOT_ADMIN"
  let err_not_pending_admin = "POOL_NOT_PENDING_ADMIN"
  let err_not_fee_recipient = "POOL_NOT_FEE_RECIPIENT"
  let err_initialized = "POOL_ALREADY_INITIALIZED"
  let err_not_initialized = "POOL_NOT_INITIALIZED"
  let err_same_asset = "POOL_IDENTICAL_ASSETS"
  let err_expired = "POOL_DEADLINE_EXPIRED"
  let err_zero_amount = "POOL_ZERO_AMOUNT"
  let err_zero_output = "POOL_ZERO_OUTPUT"
  let err_slippage = "POOL_SLIPPAGE"
  let err_insufficient_liquidity = "POOL_INSUFFICIENT_LIQUIDITY"
  let err_insufficient_lp = "FA2_INSUFFICIENT_BALANCE"
  let err_not_operator = "FA2_NOT_OPERATOR"
  let err_undefined_token = "FA2_TOKEN_UNDEFINED"
  let err_invalid_callback = "POOL_INVALID_BALANCE_CALLBACK"
  let err_invalid_balance_delta = "POOL_INVALID_BALANCE_DELTA"
  let err_insolvent = "POOL_INSOLVENT"
  let err_no_fees = "POOL_NO_PROTOCOL_FEES"
  let err_invalid_recipient = "POOL_INVALID_RECIPIENT"
  let err_locked_liquidity = "POOL_LOCKED_LIQUIDITY"
  let err_missing_transfer = "POOL_MISSING_FA2_TRANSFER"
  let err_missing_balance_of = "POOL_MISSING_FA2_BALANCE_OF"

  (* ----------------------------------------------------------------------- *)
  (* FA2 types used by the two underlying assets and the integrated LP token *)
  (* ----------------------------------------------------------------------- *)

  type asset =
    [@layout:comb]
    {
      token_contract : address;
      token_id : nat
    }

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

  type balance_request =
    [@layout:comb]
    {
      owner : address;
      token_id : nat
    }

  type balance_response =
    [@layout:comb]
    {
      request : balance_request;
      balance : nat
    }

  type balance_of_param =
    [@layout:comb]
    {
      requests : balance_request list;
      callback : (balance_response list) contract
    }

  type operator_param =
    [@layout:comb]
    {
      owner : address;
      operator : address;
      token_id : nat
    }

  type operator_update =
    | Add_operator of operator_param
    | Remove_operator of operator_param

  type token_metadata_value =
    [@layout:comb]
    {
      token_id : nat;
      token_info : (string, bytes) map
    }

  (* ----------------------------------------------------------------------- *)
  (* Pool actions and verified-transfer state machine                        *)
  (* ----------------------------------------------------------------------- *)

  type swap_direction = A_to_b | B_to_a
  type leg_mode = Inbound | Outbound

  type transfer_leg =
    [@layout:comb]
    {
      asset : asset;
      from_ : address;
      to_ : address;
      amount : nat;
      mode : leg_mode
    }

  type initialize_action =
    [@layout:comb]
    {
      receiver : address;
      amount_a : nat;
      amount_b : nat;
      total_shares : nat
    }

  type add_action =
    [@layout:comb]
    {
      receiver : address;
      amount_a : nat;
      amount_b : nat;
      shares : nat
    }

  type swap_action =
    [@layout:comb]
    {
      direction : swap_direction;
      amount_in : nat;
      amount_out : nat;
      protocol_fee : nat
    }

  type remove_action =
    [@layout:comb]
    {
      owner : address;
      shares : nat;
      amount_a : nat;
      amount_b : nat
    }

  type claim_action =
    [@layout:comb]
    {
      amount_a : nat;
      amount_b : nat
    }

  type final_action =
    | Finalize_initialize of initialize_action
    | Finalize_add of add_action
    | Finalize_swap of swap_action
    | Finalize_remove of remove_action
    | Finalize_claim of claim_action

  type pending_phase = First_before | First_after | Second_before | Second_after

  type pending_action =
    [@layout:comb]
    {
      final_action : final_action;
      first_leg : transfer_leg;
      second_leg : transfer_leg option;
      phase : pending_phase;
      observed_before : nat option;
      deadline : timestamp option
    }

  (* ----------------------------------------------------------------------- *)
  (* Public entrypoint parameters                                            *)
  (* ----------------------------------------------------------------------- *)

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
      min_shares : nat;
      receiver : address;
      deadline : timestamp
    }

  type remove_liquidity_param =
    [@layout:comb]
    {
      shares : nat;
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

  (* ----------------------------------------------------------------------- *)
  (* Storage                                                                 *)
  (* ----------------------------------------------------------------------- *)

  type storage =
    [@layout:comb]
    {
      token_a : asset;
      token_b : asset;
      reserve_a : nat;
      reserve_b : nat;
      protocol_fees_a : nat;
      protocol_fees_b : nat;
      total_supply : nat;
      ledger : (address, nat) big_map;
      operators : ((address * address), unit) big_map;
      metadata : (string, bytes) big_map;
      token_metadata : (nat, token_metadata_value) big_map;
      admin : address;
      pending_admin : address option;
      fee_recipient : address;
      paused : bool;
      pending : pending_action option
    }

  type result = operation list * storage

  (* ----------------------------------------------------------------------- *)
  (* Common helpers                                                          *)
  (* ----------------------------------------------------------------------- *)

  let assert_non_payable () : unit =
    Assert.Error.assert (Tezos.get_amount () = 0mutez) err_non_payable

  let assert_idle (s : storage) : unit =
    match s.pending with
    | None -> ()
    | Some _ -> failwith err_busy

  let assert_live (s : storage) : unit =
    Assert.Error.assert (not s.paused) err_paused

  let assert_initialized (s : storage) : unit =
    Assert.Error.assert (s.total_supply > 0n) err_not_initialized

  let assert_deadline (deadline : timestamp) : unit =
    Assert.Error.assert (Tezos.get_now () <= deadline) err_expired

  let assert_receiver (receiver : address) : unit =
    Assert.Error.assert (receiver <> Tezos.get_self_address ()) err_invalid_recipient

  let get_balance (owner : address) (ledger : (address, nat) big_map) : nat =
    match Big_map.find_opt owner ledger with
    | Some balance -> balance
    | None -> 0n

  let set_balance
    (owner : address)
    (balance : nat)
    (ledger : (address, nat) big_map)
  : (address, nat) big_map =
    if balance = 0n
    then Big_map.remove owner ledger
    else Big_map.update owner (Some balance) ledger

  let add_balance
    (owner : address)
    (amount : nat)
    (ledger : (address, nat) big_map)
  : (address, nat) big_map =
    set_balance owner (get_balance owner ledger + amount) ledger

  let sub_balance
    (owner : address)
    (amount : nat)
    (ledger : (address, nat) big_map)
  : (address, nat) big_map =
    let balance = get_balance owner ledger in
    let () = Assert.Error.assert (balance >= amount) err_insufficient_lp in
    set_balance owner (abs (balance - amount)) ledger

  let ceil_div (numerator : nat) (denominator : nat) : nat =
    match ediv numerator denominator with
    | None -> failwith err_insufficient_liquidity
    | Some (quotient, remainder) ->
        if remainder = 0n then quotient else quotient + 1n

  let min_nat (a : nat) (b : nat) : nat = if a < b then a else b

  let protocol_fee (amount : nat) : nat =
    (amount * protocol_fee_bps) / fee_denominator

  let quote_output (amount_in : nat) (reserve_in : nat) (reserve_out : nat) : nat =
    if amount_in = 0n || reserve_in = 0n || reserve_out = 0n
    then 0n
    else
      let amount_with_fee = amount_in * abs (fee_denominator - total_fee_bps) in
      (amount_with_fee * reserve_out)
      / ((reserve_in * fee_denominator) + amount_with_fee)

  let accounted_balance (selected : asset) (s : storage) : nat =
    if selected = s.token_a
    then s.reserve_a + s.protocol_fees_a
    else if selected = s.token_b
    then s.reserve_b + s.protocol_fees_b
    else failwith err_invalid_callback

  let transfer_asset (leg : transfer_leg) : operation =
    let token_entrypoint : fa2_transfer contract =
      match
        (Tezos.get_entrypoint_opt "%transfer" leg.asset.token_contract
          : fa2_transfer contract option)
      with
      | Some contract -> contract
      | None -> failwith err_missing_transfer in
    let transfer_param : fa2_transfer =
      [
        {
          from_ = leg.from_;
          txs =
            [
              {
                to_ = leg.to_;
                token_id = leg.asset.token_id;
                amount = leg.amount
              }
            ]
        }
      ] in
    Tezos.transaction transfer_param 0mutez token_entrypoint

  let first_before_callback () : (balance_response list) contract =
    match
      (Tezos.get_entrypoint_opt "%receive_first_before" (Tezos.get_self_address ())
        : (balance_response list) contract option)
    with
    | Some contract -> contract
    | None -> failwith err_invalid_callback

  let first_after_callback () : (balance_response list) contract =
    match
      (Tezos.get_entrypoint_opt "%receive_first_after" (Tezos.get_self_address ())
        : (balance_response list) contract option)
    with
    | Some contract -> contract
    | None -> failwith err_invalid_callback

  let second_before_callback () : (balance_response list) contract =
    match
      (Tezos.get_entrypoint_opt "%receive_second_before" (Tezos.get_self_address ())
        : (balance_response list) contract option)
    with
    | Some contract -> contract
    | None -> failwith err_invalid_callback

  let second_after_callback () : (balance_response list) contract =
    match
      (Tezos.get_entrypoint_opt "%receive_second_after" (Tezos.get_self_address ())
        : (balance_response list) contract option)
    with
    | Some contract -> contract
    | None -> failwith err_invalid_callback

  let request_balance_with
    (selected : asset)
    (callback : (balance_response list) contract)
  : operation =
    let balance_entrypoint : balance_of_param contract =
      match
        (Tezos.get_entrypoint_opt "%balance_of" selected.token_contract
          : balance_of_param contract option)
      with
      | Some contract -> contract
      | None -> failwith err_missing_balance_of in
    let param : balance_of_param =
      {
        requests =
          [{owner = Tezos.get_self_address (); token_id = selected.token_id}];
        callback = callback
      } in
    Tezos.transaction param 0mutez balance_entrypoint

  let current_leg (pending : pending_action) : transfer_leg =
    match pending.phase with
    | First_before -> pending.first_leg
    | First_after -> pending.first_leg
    | Second_before ->
        (match pending.second_leg with
         | Some leg -> leg
         | None -> failwith err_invalid_callback)
    | Second_after ->
        (match pending.second_leg with
         | Some leg -> leg
         | None -> failwith err_invalid_callback)

  let assert_pending_deadline (pending : pending_action) : unit =
    match pending.deadline with
    | Some deadline -> assert_deadline deadline
    | None -> ()

  let start_action (pending : pending_action) (s : storage) : result =
    ([request_balance_with pending.first_leg.asset (first_before_callback ())],
     {s with pending = Some pending})

  (* ----------------------------------------------------------------------- *)
  (* Finalization after every token transfer has been balance-verified        *)
  (* ----------------------------------------------------------------------- *)

  let finalize (action : final_action) (s : storage) : result =
    match action with
    | Finalize_initialize action ->
        let provider_shares = abs (action.total_shares - minimum_liquidity) in
        let ledger =
          add_balance
            action.receiver
            provider_shares
            (add_balance (Tezos.get_self_address ()) minimum_liquidity s.ledger) in
        ([],
         {
           s with
           reserve_a = action.amount_a;
           reserve_b = action.amount_b;
           total_supply = action.total_shares;
           ledger = ledger;
           pending = None
         })
    | Finalize_add action ->
        let ledger = add_balance action.receiver action.shares s.ledger in
        ([],
         {
           s with
           reserve_a = s.reserve_a + action.amount_a;
           reserve_b = s.reserve_b + action.amount_b;
           total_supply = s.total_supply + action.shares;
           ledger = ledger;
           pending = None
         })
    | Finalize_swap action ->
        (match action.direction with
         | A_to_b ->
             ([],
              {
                s with
                reserve_a = s.reserve_a + abs (action.amount_in - action.protocol_fee);
                reserve_b = abs (s.reserve_b - action.amount_out);
                protocol_fees_a = s.protocol_fees_a + action.protocol_fee;
                pending = None
              })
         | B_to_a ->
             ([],
              {
                s with
                reserve_a = abs (s.reserve_a - action.amount_out);
                reserve_b = s.reserve_b + abs (action.amount_in - action.protocol_fee);
                protocol_fees_b = s.protocol_fees_b + action.protocol_fee;
                pending = None
              }))
    | Finalize_remove action ->
        let ledger = sub_balance action.owner action.shares s.ledger in
        ([],
         {
           s with
           reserve_a = abs (s.reserve_a - action.amount_a);
           reserve_b = abs (s.reserve_b - action.amount_b);
           total_supply = abs (s.total_supply - action.shares);
           ledger = ledger;
           pending = None
         })
    | Finalize_claim action ->
        ([],
         {
           s with
           protocol_fees_a = abs (s.protocol_fees_a - action.amount_a);
           protocol_fees_b = abs (s.protocol_fees_b - action.amount_b);
           pending = None
         })

  (* ----------------------------------------------------------------------- *)
  (* Pool entrypoints                                                        *)
  (* ----------------------------------------------------------------------- *)

  [@entry]
  let initialize (param : initialize_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_live s in
    let () = Assert.Error.assert (Tezos.get_sender () = s.admin) err_not_admin in
    let () = Assert.Error.assert (s.total_supply = 0n) err_initialized in
    let () = Assert.Error.assert (s.token_a <> s.token_b) err_same_asset in
    let () = assert_deadline param.deadline in
    let () = assert_receiver param.receiver in
    let () =
      Assert.Error.assert (param.amount_a > 0n && param.amount_b > 0n) err_zero_amount in
    (* LP units are arbitrary; using the smaller seed amount avoids an
       unbounded square-root loop and follows the pinned Core V2 convention. *)
    let total_shares = min_nat param.amount_a param.amount_b in
    let () =
      Assert.Error.assert (total_shares > minimum_liquidity) err_insufficient_liquidity in
    let pool = Tezos.get_self_address () in
    let first_leg : transfer_leg =
      {
        asset = s.token_a;
        from_ = Tezos.get_sender ();
        to_ = pool;
        amount = param.amount_a;
        mode = Inbound
      } in
    let second_leg : transfer_leg =
      {
        asset = s.token_b;
        from_ = Tezos.get_sender ();
        to_ = pool;
        amount = param.amount_b;
        mode = Inbound
      } in
    let pending : pending_action =
      {
        final_action =
          Finalize_initialize
            {
              receiver = param.receiver;
              amount_a = param.amount_a;
              amount_b = param.amount_b;
              total_shares = total_shares
            };
        first_leg = first_leg;
        second_leg = Some second_leg;
        phase = First_before;
        observed_before = None;
        deadline = Some param.deadline
      } in
    start_action pending s

  [@entry]
  let add_liquidity (param : add_liquidity_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_live s in
    let () = assert_initialized s in
    let () = assert_deadline param.deadline in
    let () = assert_receiver param.receiver in
    let shares_a = (param.max_amount_a * s.total_supply) / s.reserve_a in
    let shares_b = (param.max_amount_b * s.total_supply) / s.reserve_b in
    let shares = min_nat shares_a shares_b in
    let () = Assert.Error.assert (shares > 0n) err_zero_amount in
    let () = Assert.Error.assert (shares >= param.min_shares) err_slippage in
    let amount_a = ceil_div (shares * s.reserve_a) s.total_supply in
    let amount_b = ceil_div (shares * s.reserve_b) s.total_supply in
    let () =
      Assert.Error.assert
        (amount_a <= param.max_amount_a && amount_b <= param.max_amount_b)
        err_slippage in
    let pool = Tezos.get_self_address () in
    let first_leg : transfer_leg =
      {
        asset = s.token_a;
        from_ = Tezos.get_sender ();
        to_ = pool;
        amount = amount_a;
        mode = Inbound
      } in
    let second_leg : transfer_leg =
      {
        asset = s.token_b;
        from_ = Tezos.get_sender ();
        to_ = pool;
        amount = amount_b;
        mode = Inbound
      } in
    let pending : pending_action =
      {
        final_action =
          Finalize_add
            {
              receiver = param.receiver;
              amount_a = amount_a;
              amount_b = amount_b;
              shares = shares
            };
        first_leg = first_leg;
        second_leg = Some second_leg;
        phase = First_before;
        observed_before = None;
        deadline = Some param.deadline
      } in
    start_action pending s

  [@entry]
  let swap (param : swap_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_live s in
    let () = assert_initialized s in
    let () = assert_deadline param.deadline in
    let () = assert_receiver param.receiver in
    let () = Assert.Error.assert (param.amount_in > 0n) err_zero_amount in
    let (input_asset, output_asset, reserve_in, reserve_out) =
      match param.direction with
      | A_to_b -> (s.token_a, s.token_b, s.reserve_a, s.reserve_b)
      | B_to_a -> (s.token_b, s.token_a, s.reserve_b, s.reserve_a) in
    let amount_out = quote_output param.amount_in reserve_in reserve_out in
    let () = Assert.Error.assert (amount_out > 0n) err_zero_output in
    let () = Assert.Error.assert (amount_out < reserve_out) err_insufficient_liquidity in
    let () = Assert.Error.assert (amount_out >= param.min_amount_out) err_slippage in
    let pool = Tezos.get_self_address () in
    let first_leg : transfer_leg =
      {
        asset = input_asset;
        from_ = Tezos.get_sender ();
        to_ = pool;
        amount = param.amount_in;
        mode = Inbound
      } in
    let second_leg : transfer_leg =
      {
        asset = output_asset;
        from_ = pool;
        to_ = param.receiver;
        amount = amount_out;
        mode = Outbound
      } in
    let pending : pending_action =
      {
        final_action =
          Finalize_swap
            {
              direction = param.direction;
              amount_in = param.amount_in;
              amount_out = amount_out;
              protocol_fee = protocol_fee param.amount_in
            };
        first_leg = first_leg;
        second_leg = Some second_leg;
        phase = First_before;
        observed_before = None;
        deadline = Some param.deadline
      } in
    start_action pending s

  [@entry]
  let remove_liquidity (param : remove_liquidity_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = assert_initialized s in
    let () = assert_deadline param.deadline in
    let () = assert_receiver param.receiver in
    let () = Assert.Error.assert (param.shares > 0n) err_zero_amount in
    let owner = Tezos.get_sender () in
    let () =
      Assert.Error.assert (get_balance owner s.ledger >= param.shares) err_insufficient_lp in
    let amount_a = (param.shares * s.reserve_a) / s.total_supply in
    let amount_b = (param.shares * s.reserve_b) / s.total_supply in
    let () =
      Assert.Error.assert (amount_a > 0n && amount_b > 0n) err_zero_output in
    let () =
      Assert.Error.assert
        (amount_a >= param.min_amount_a && amount_b >= param.min_amount_b)
        err_slippage in
    let pool = Tezos.get_self_address () in
    let first_leg : transfer_leg =
      {
        asset = s.token_a;
        from_ = pool;
        to_ = param.receiver;
        amount = amount_a;
        mode = Outbound
      } in
    let second_leg : transfer_leg =
      {
        asset = s.token_b;
        from_ = pool;
        to_ = param.receiver;
        amount = amount_b;
        mode = Outbound
      } in
    let pending : pending_action =
      {
        final_action =
          Finalize_remove
            {
              owner = owner;
              shares = param.shares;
              amount_a = amount_a;
              amount_b = amount_b
            };
        first_leg = first_leg;
        second_leg = Some second_leg;
        phase = First_before;
        observed_before = None;
        deadline = Some param.deadline
      } in
    start_action pending s

  [@entry]
  let claim_protocol_fees (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () =
      Assert.Error.assert (Tezos.get_sender () = s.fee_recipient) err_not_fee_recipient in
    let () =
      Assert.Error.assert (s.protocol_fees_a > 0n || s.protocol_fees_b > 0n) err_no_fees in
    let pool = Tezos.get_self_address () in
    let leg_a : transfer_leg =
      {
        asset = s.token_a;
        from_ = pool;
        to_ = s.fee_recipient;
        amount = s.protocol_fees_a;
        mode = Outbound
      } in
    let leg_b : transfer_leg =
      {
        asset = s.token_b;
        from_ = pool;
        to_ = s.fee_recipient;
        amount = s.protocol_fees_b;
        mode = Outbound
      } in
    let (first_leg, second_leg) =
      if s.protocol_fees_a > 0n && s.protocol_fees_b > 0n
      then (leg_a, Some leg_b)
      else if s.protocol_fees_a > 0n
      then (leg_a, None)
      else (leg_b, None) in
    let pending : pending_action =
      {
        final_action =
          Finalize_claim
            {amount_a = s.protocol_fees_a; amount_b = s.protocol_fees_b};
        first_leg = first_leg;
        second_leg = second_leg;
        phase = First_before;
        observed_before = None;
        deadline = None
      } in
    start_action pending s

  (* ----------------------------------------------------------------------- *)
  (* Balance callbacks: verify each inbound and outbound transfer exactly     *)
  (* ----------------------------------------------------------------------- *)

  let authenticated_balance
    (expected_asset : asset)
    (responses : balance_response list)
  : nat =
    let () = assert_non_payable () in
    let () =
      Assert.Error.assert
        (Tezos.get_sender () = expected_asset.token_contract)
        err_invalid_callback in
    let () = Assert.Error.assert (List.length responses = 1n) err_invalid_callback in
    let response =
      match List.head responses with
      | Some response -> response
      | None -> failwith err_invalid_callback in
    let () =
      Assert.Error.assert
        (response.request.owner = Tezos.get_self_address ()
         && response.request.token_id = expected_asset.token_id)
        err_invalid_callback in
    response.balance

  let assert_verified_delta
    (pending : pending_action)
    (leg : transfer_leg)
    (balance_after : nat)
  : unit =
    let before =
      match pending.observed_before with
      | Some before -> before
      | None -> failwith err_invalid_callback in
    let valid_delta =
      match leg.mode with
      | Inbound -> balance_after = before + leg.amount
      | Outbound -> before >= leg.amount && balance_after = abs (before - leg.amount) in
    Assert.Error.assert valid_delta err_invalid_balance_delta

  [@entry]
  let receive_first_before (responses : balance_response list) (s : storage) : result =
    let pending =
      match s.pending with
      | Some pending -> pending
      | None -> failwith err_invalid_callback in
    let () = assert_pending_deadline pending in
    let () = Assert.Error.assert (pending.phase = First_before) err_invalid_callback in
    let leg = current_leg pending in
    let balance_before = authenticated_balance leg.asset responses in
    let () =
      Assert.Error.assert
        (balance_before >= accounted_balance leg.asset s)
        err_insolvent in
    let updated_pending =
      {pending with phase = First_after; observed_before = Some balance_before} in
    ([transfer_asset leg;
      request_balance_with leg.asset (first_after_callback ())],
     {s with pending = Some updated_pending})

  [@entry]
  let receive_first_after (responses : balance_response list) (s : storage) : result =
    let pending =
      match s.pending with
      | Some pending -> pending
      | None -> failwith err_invalid_callback in
    let () = assert_pending_deadline pending in
    let () = Assert.Error.assert (pending.phase = First_after) err_invalid_callback in
    let leg = current_leg pending in
    let balance_after = authenticated_balance leg.asset responses in
    let () = assert_verified_delta pending leg balance_after in
    match pending.second_leg with
    | Some next_leg ->
        let updated_pending =
          {pending with phase = Second_before; observed_before = None} in
        ([request_balance_with next_leg.asset (second_before_callback ())],
         {s with pending = Some updated_pending})
    | None -> finalize pending.final_action s

  [@entry]
  let receive_second_before (responses : balance_response list) (s : storage) : result =
    let pending =
      match s.pending with
      | Some pending -> pending
      | None -> failwith err_invalid_callback in
    let () = assert_pending_deadline pending in
    let () = Assert.Error.assert (pending.phase = Second_before) err_invalid_callback in
    let leg = current_leg pending in
    let balance_before = authenticated_balance leg.asset responses in
    let () =
      Assert.Error.assert
        (balance_before >= accounted_balance leg.asset s)
        err_insolvent in
    let updated_pending =
      {pending with phase = Second_after; observed_before = Some balance_before} in
    ([transfer_asset leg;
      request_balance_with leg.asset (second_after_callback ())],
     {s with pending = Some updated_pending})

  [@entry]
  let receive_second_after (responses : balance_response list) (s : storage) : result =
    let pending =
      match s.pending with
      | Some pending -> pending
      | None -> failwith err_invalid_callback in
    let () = assert_pending_deadline pending in
    let () = Assert.Error.assert (pending.phase = Second_after) err_invalid_callback in
    let leg = current_leg pending in
    let balance_after = authenticated_balance leg.asset responses in
    let () = assert_verified_delta pending leg balance_after in
    finalize pending.final_action s

  (* ----------------------------------------------------------------------- *)
  (* Integrated LP-token FA2 entrypoints                                     *)
  (* ----------------------------------------------------------------------- *)

  let is_operator (owner : address) (operator : address) (s : storage) : bool =
    owner = operator || Big_map.mem (owner, operator) s.operators

  [@entry]
  let transfer (transfers : fa2_transfer) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    (* A single-pair pool deliberately accepts one FA2 transfer item and one
       destination per call. This bounds gas and keeps the LP/reserve update
       atomic; callers can submit additional transfers as separate operations. *)
    let () = Assert.Error.assert (List.length transfers = 1n) err_invalid_callback in
    let transfer_item =
      match List.head transfers with
      | Some transfer_item -> transfer_item
      | None -> failwith err_invalid_callback in
    let () = Assert.Error.assert (List.length transfer_item.txs = 1n) err_invalid_callback in
    let tx =
      match List.head transfer_item.txs with
      | Some tx -> tx
      | None -> failwith err_invalid_callback in
    let () =
      Assert.Error.assert
        (is_operator transfer_item.from_ (Tezos.get_sender ()) s)
        err_not_operator in
    let () = Assert.Error.assert (tx.token_id = lp_token_id) err_undefined_token in
    let () =
      Assert.Error.assert (tx.to_ <> Tezos.get_self_address ()) err_locked_liquidity in
    let ledger =
      add_balance tx.to_ tx.amount
        (sub_balance transfer_item.from_ tx.amount s.ledger) in
    ([], {s with ledger = ledger})

  [@entry]
  let update_operators (updates : operator_update list) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = Assert.Error.assert (List.length updates = 1n) err_invalid_callback in
    let update =
      match List.head updates with
      | Some update -> update
      | None -> failwith err_invalid_callback in
    let operators =
      match update with
      | Add_operator operator ->
          let () =
            Assert.Error.assert (operator.token_id = lp_token_id) err_undefined_token in
          let () =
            Assert.Error.assert (operator.owner = Tezos.get_sender ()) err_not_operator in
          Big_map.update (operator.owner, operator.operator) (Some ()) s.operators
      | Remove_operator operator ->
          let () =
            Assert.Error.assert (operator.token_id = lp_token_id) err_undefined_token in
          let () =
            Assert.Error.assert (operator.owner = Tezos.get_sender ()) err_not_operator in
          Big_map.remove (operator.owner, operator.operator) s.operators in
    ([], {s with operators = operators})

  [@entry]
  let balance_of (param : balance_of_param) (s : storage) : result =
    let () = assert_non_payable () in
    let () = Assert.Error.assert (List.length param.requests = 1n) err_invalid_callback in
    let request =
      match List.head param.requests with
      | Some request -> request
      | None -> failwith err_invalid_callback in
    let () = Assert.Error.assert (request.token_id = lp_token_id) err_undefined_token in
    let responses : balance_response list =
      [{request = request; balance = get_balance request.owner s.ledger}] in
    ([Tezos.transaction responses 0mutez param.callback], s)

  (* ----------------------------------------------------------------------- *)
  (* Bounded administration                                                  *)
  (* ----------------------------------------------------------------------- *)

  [@entry]
  let set_paused (paused : bool) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = Assert.Error.assert (Tezos.get_sender () = s.admin) err_not_admin in
    let () =
      if paused
      then Assert.Error.assert (not s.paused) err_paused
      else Assert.Error.assert s.paused err_not_paused in
    ([], {s with paused = paused})

  [@entry]
  let propose_admin (new_admin : address) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () = Assert.Error.assert (Tezos.get_sender () = s.admin) err_not_admin in
    ([], {s with pending_admin = Some new_admin})

  [@entry]
  let accept_admin (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    let () = assert_idle s in
    let () =
      match s.pending_admin with
      | Some pending_admin ->
          Assert.Error.assert (Tezos.get_sender () = pending_admin) err_not_pending_admin
      | None -> failwith err_not_pending_admin in
    ([], {s with admin = Tezos.get_sender (); pending_admin = None})

  [@entry]
  let default (_ : unit) (s : storage) : result =
    let () = assert_non_payable () in
    ([], s)

  (* ----------------------------------------------------------------------- *)
  (* Views                                                                   *)
  (* ----------------------------------------------------------------------- *)

  [@view]
  let get_reserves (_ : unit) (s : storage) : nat * nat =
    (s.reserve_a, s.reserve_b)

  [@view]
  let get_protocol_fees (_ : unit) (s : storage) : nat * nat =
    (s.protocol_fees_a, s.protocol_fees_b)

  [@view]
  let get_fee_bps (_ : unit) (_s : storage) : nat * nat * nat =
    (lp_fee_bps, protocol_fee_bps, total_fee_bps)

  [@view]
  let quote_swap (param : swap_direction * nat) (s : storage) : nat =
    let (direction, amount_in) = param in
    match direction with
    | A_to_b -> quote_output amount_in s.reserve_a s.reserve_b
    | B_to_a -> quote_output amount_in s.reserve_b s.reserve_a

  [@view]
  let get_balance_view (param : address * nat) (s : storage) : nat =
    let (owner, token_id) = param in
    let () = Assert.Error.assert (token_id = lp_token_id) err_undefined_token in
    get_balance owner s.ledger

  [@view]
  let total_supply (token_id : nat) (s : storage) : nat =
    let () = Assert.Error.assert (token_id = lp_token_id) err_undefined_token in
    s.total_supply

  [@view]
  let all_tokens (_ : unit) (_s : storage) : nat set = Set.literal [lp_token_id]

  [@view]
  let token_metadata (token_id : nat) (s : storage) : token_metadata_value =
    match Big_map.find_opt token_id s.token_metadata with
    | Some metadata -> metadata
    | None -> failwith err_undefined_token

  [@view]
  let is_operator_view (operator : operator_param) (s : storage) : bool =
    operator.token_id = lp_token_id && is_operator operator.owner operator.operator s

  (* ----------------------------------------------------------------------- *)
  (* Origination helper                                                      *)
  (* ----------------------------------------------------------------------- *)

  type build_storage_param =
    [@layout:comb]
    {
      token_a : asset;
      token_b : asset;
      admin : address;
      fee_recipient : address;
      metadata : (string, bytes) big_map;
      token_metadata : (nat, token_metadata_value) big_map
    }

  let build_storage (param : build_storage_param) : storage =
    {
      token_a = param.token_a;
      token_b = param.token_b;
      reserve_a = 0n;
      reserve_b = 0n;
      protocol_fees_a = 0n;
      protocol_fees_b = 0n;
      total_supply = 0n;
      ledger = (Big_map.empty : (address, nat) big_map);
      operators = (Big_map.empty : ((address * address), unit) big_map);
      metadata = param.metadata;
      token_metadata = param.token_metadata;
      admin = param.admin;
      pending_admin = None;
      fee_recipient = param.fee_recipient;
      paused = false;
      pending = None
    }
end
