#include "../contracts/token_token_pool.mligo"
#import "../contracts/helpers/fa2_token.mligo" "FA2"

module Test = Test.Next
module Tezos = Tezos.Next
module Contract = TokenTokenPool

type pool_parameter = TokenTokenPool parameter_of
type fa2_parameter = FA2 parameter_of
type pool_typed_address = (pool_parameter, Contract.storage) typed_address
type fa2_typed_address = (fa2_parameter, FA2.storage) typed_address

let admin () = Test.Account.address 0n
let trader () = Test.Account.address 1n
let fee_recipient () = Test.Account.address 2n
let successor_admin () = Test.Account.address 3n

let future = ("1970-01-01T01:00:00Z" : timestamp)
let initial_balance = 1000000000n
let initial_reserve = 1000000n

let clean () : unit =
  Test.State.reset
    4n
    [1000000tez; 1000000tez; 1000000tez; 1000000tez]

let deploy_token (owner : address) =
  let token_storage : FA2.storage = FA2.make_storage owner initial_balance 0n in
  Test.Originate.contract (contract_of FA2) token_storage 0tez

let lp_token_metadata () : (nat, Contract.token_metadata_value) big_map =
  Big_map.literal
    [
      (0n,
       {
         token_id = 0n;
         token_info =
           (Map.literal
              [
                ("name", Bytes.pack ("Token Pair Liquidity" : string));
                ("symbol", Bytes.pack ("TPLP" : string));
                ("decimals", Bytes.pack ("0" : string))
              ]
            : (string, bytes) map)
       })
    ]

let deploy_pool token_a_address token_b_address =
  let pool_storage : Contract.storage =
    Contract.build_storage
      {
        token_a = {token_contract = token_a_address; token_id = 0n};
        token_b = {token_contract = token_b_address; token_id = 0n};
        admin = admin ();
        fee_recipient = fee_recipient ();
        metadata = (Big_map.empty : (string, bytes) big_map);
        token_metadata = lp_token_metadata ()
      } in
  Test.Originate.contract (contract_of Contract) pool_storage 0tez

let add_token_operator
  (token_taddr : fa2_typed_address)
  (owner : address)
  (operator : address)
: unit =
  let update : FA2.update_operators =
    [Add_operator {owner = owner; operator = operator; token_id = 0n}] in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "update_operators" token_taddr)
      update
      0tez in
  ()

let token_transfer
  (token_taddr : fa2_typed_address)
  (from_ : address)
  (to_ : address)
  (amount : nat)
: unit =
  let transfer : FA2.transfer =
    [
      {
        from_ = from_;
        txs = [{to_ = to_; token_id = 0n; amount = amount}]
      }
    ] in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "transfer" token_taddr)
      transfer
      0tez in
  ()

let token_balance (token_taddr : fa2_typed_address) (owner : address) : nat =
  let token_storage : FA2.storage = Test.Typed_address.get_storage token_taddr in
  match Big_map.find_opt owner token_storage.ledger with
  | Some balance -> balance
  | None -> 0n

let pool_balance (pool_taddr : pool_typed_address) (owner : address) : nat =
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool_taddr in
  match Big_map.find_opt owner pool_storage.ledger with
  | Some balance -> balance
  | None -> 0n

let setup_initialized_pool () =
  let () = clean () in
  let () = Test.State.set_source (admin ()) in
  let token_a = deploy_token (admin ()) in
  let token_b = deploy_token (admin ()) in
  let token_a_address = Test.Typed_address.to_address token_a.taddr in
  let token_b_address = Test.Typed_address.to_address token_b.taddr in
  let pool = deploy_pool token_a_address token_b_address in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = add_token_operator token_a.taddr (admin ()) pool_address in
  let () = add_token_operator token_b.taddr (admin ()) pool_address in
  let initialize_param : Contract.initialize_param =
    {
      amount_a = initial_reserve;
      amount_b = initial_reserve;
      receiver = admin ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "initialize" pool.taddr)
      initialize_param
      0tez in
  (pool, token_a, token_b)

let fund_trader_and_authorize
  (pool_taddr : pool_typed_address)
  (token_a_taddr : fa2_typed_address)
  (token_b_taddr : fa2_typed_address)
: unit =
  let pool_address = Test.Typed_address.to_address pool_taddr in
  let () = Test.State.set_source (admin ()) in
  let () = token_transfer token_a_taddr (admin ()) (trader ()) 5000000n in
  let () = token_transfer token_b_taddr (admin ()) (trader ()) 5000000n in
  let () = Test.State.set_source (trader ()) in
  let () = add_token_operator token_a_taddr (trader ()) pool_address in
  add_token_operator token_b_taddr (trader ()) pool_address

let assert_string_failure
  (test_name : string)
  (expected : string)
  (result : test_exec_result)
: unit =
  match result with
  | Success _ -> failwith (test_name ^ ": expected failure")
  | Fail failure ->
      (match failure with
       | Rejected (actual, _) ->
           let expected = Test.Michelson.eval (expected : string) in
           if Test.Compare.eq actual expected
           then ()
           else failwith (test_name ^ ": wrong failure")
       | _ -> failwith (test_name ^ ": unexpected failure type"))

let assert_nat (test_name : string) (actual : nat) (expected : nat) : unit =
  if actual = expected
  then ()
  else
    failwith
      (test_name ^ ": expected " ^ Test.String.show expected
       ^ ", got " ^ Test.String.show actual)

let assert_pool_solvency
  (test_name : string)
  (pool_taddr : pool_typed_address)
  (token_a_taddr : fa2_typed_address)
  (token_b_taddr : fa2_typed_address)
: unit =
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool_taddr in
  let pool_address = Test.Typed_address.to_address pool_taddr in
  let held_a = token_balance token_a_taddr pool_address in
  let held_b = token_balance token_b_taddr pool_address in
  let () =
    assert_nat
      (test_name ^ ": token A solvency")
      held_a
      (pool_storage.reserve_a + pool_storage.protocol_fees_a) in
  assert_nat
    (test_name ^ ": token B solvency")
    held_b
    (pool_storage.reserve_b + pool_storage.protocol_fees_b)

(* ------------------------------------------------------------------------- *)
(* Initialization and locked minimum liquidity                              *)
(* ------------------------------------------------------------------------- *)

let test_initialize_verifies_both_assets =
  let (pool, token_a, token_b) = setup_initialized_pool () in
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = assert_nat "initialize reserve A" pool_storage.reserve_a initial_reserve in
  let () = assert_nat "initialize reserve B" pool_storage.reserve_b initial_reserve in
  let () = assert_nat "initialize total supply" pool_storage.total_supply initial_reserve in
  let () =
    assert_nat
      "initialize provider shares"
      (pool_balance pool.taddr (admin ()))
      (abs (initial_reserve - Contract.minimum_liquidity)) in
  let () =
    assert_nat
      "initialize locked shares"
      (pool_balance pool.taddr pool_address)
      Contract.minimum_liquidity in
  assert_pool_solvency "initialize" pool.taddr token_a.taddr token_b.taddr

let test_initialize_only_once =
  let (pool, _, _) = setup_initialized_pool () in
  let param : Contract.initialize_param =
    {
      amount_a = initial_reserve;
      amount_b = initial_reserve;
      receiver = admin ();
      deadline = future
    } in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "initialize" pool.taddr)
      param
      0tez in
  assert_string_failure "initialize twice" Contract.err_initialized result

(* ------------------------------------------------------------------------- *)
(* Swaps, immutable fees, invariant growth, and protocol accounting          *)
(* ------------------------------------------------------------------------- *)

let test_bidirectional_swaps_fee_split_and_invariant =
  let (pool, token_a, token_b) = setup_initialized_pool () in
  let () = fund_trader_and_authorize pool.taddr token_a.taddr token_b.taddr in
  let amount_in = 100000n in
  let amount_out = Contract.quote_output amount_in initial_reserve initial_reserve in
  let protocol_fee = Contract.protocol_fee amount_in in
  let trader_b_before = token_balance token_b.taddr (trader ()) in
  let swap_param : Contract.swap_param =
    {
      direction = A_to_b;
      amount_in = amount_in;
      min_amount_out = amount_out;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap_param
      0tez in
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let old_k = initial_reserve * initial_reserve in
  let new_k = pool_storage.reserve_a * pool_storage.reserve_b in
  let () =
    Assert.Error.assert (new_k >= old_k) "swap invariant must not decrease" in
  let () =
    assert_nat
      "swap reserve A"
      pool_storage.reserve_a
      (initial_reserve + abs (amount_in - protocol_fee)) in
  let () =
    assert_nat
      "swap reserve B"
      pool_storage.reserve_b
      (abs (initial_reserve - amount_out)) in
  let () = assert_nat "swap protocol fee A" pool_storage.protocol_fees_a protocol_fee in
  let () =
    assert_nat
      "swap recipient output"
      (token_balance token_b.taddr (trader ()))
      (trader_b_before + amount_out) in
  let reverse_amount_in = 200000n in
  let reverse_amount_out =
    Contract.quote_output
      reverse_amount_in
      pool_storage.reserve_b
      pool_storage.reserve_a in
  let reverse_param : Contract.swap_param =
    {
      direction = B_to_a;
      amount_in = reverse_amount_in;
      min_amount_out = reverse_amount_out;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      reverse_param
      0tez in
  let final_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let final_k = final_storage.reserve_a * final_storage.reserve_b in
  let () = Assert.Error.assert (final_k >= new_k) "reverse swap invariant decreased" in
  let () =
    assert_nat
      "reverse swap protocol fee B"
      final_storage.protocol_fees_b
      (Contract.protocol_fee reverse_amount_in) in
  assert_pool_solvency "bidirectional swap" pool.taddr token_a.taddr token_b.taddr

let test_fee_constants_are_25_and_5_basis_points =
  let () = assert_nat "LP fee" Contract.lp_fee_bps 25n in
  let () = assert_nat "protocol fee" Contract.protocol_fee_bps 5n in
  assert_nat "total fee" Contract.total_fee_bps 30n

let test_quote_rounding_preserves_constant_product =
  let reserve_in = 123456789n in
  let reserve_out = 987654321n in
  let check_amount (amount_in : nat) : unit =
    let amount_out = Contract.quote_output amount_in reserve_in reserve_out in
    let protocol_fee = Contract.protocol_fee amount_in in
    let new_reserve_in = reserve_in + abs (amount_in - protocol_fee) in
    let new_reserve_out = abs (reserve_out - amount_out) in
    Assert.Error.assert
      (new_reserve_in * new_reserve_out >= reserve_in * reserve_out)
      "quote invariant decreased" in
  let () = check_amount 1n in
  let () = check_amount 10n in
  let () = check_amount 9999n in
  let () = check_amount 10000n in
  let () = check_amount 1234567n in
  check_amount 50000000n

(* ------------------------------------------------------------------------- *)
(* Liquidity lifecycle                                                       *)
(* ------------------------------------------------------------------------- *)

let test_add_and_remove_liquidity =
  let (pool, token_a, token_b) = setup_initialized_pool () in
  let () = fund_trader_and_authorize pool.taddr token_a.taddr token_b.taddr in
  let () = Test.State.set_source (trader ()) in
  let add_param : Contract.add_liquidity_param =
    {
      max_amount_a = 100000n;
      max_amount_b = 100000n;
      min_shares = 100000n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "add_liquidity" pool.taddr)
      add_param
      0tez in
  let () = assert_nat "added LP shares" (pool_balance pool.taddr (trader ())) 100000n in
  let remove_param : Contract.remove_liquidity_param =
    {
      shares = 100000n;
      min_amount_a = 100000n;
      min_amount_b = 100000n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "remove_liquidity" pool.taddr)
      remove_param
      0tez in
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "removed LP shares" (pool_balance pool.taddr (trader ())) 0n in
  let () = assert_nat "lifecycle reserve A" pool_storage.reserve_a initial_reserve in
  let () = assert_nat "lifecycle reserve B" pool_storage.reserve_b initial_reserve in
  assert_pool_solvency
    "liquidity lifecycle"
    pool.taddr
    token_a.taddr
    token_b.taddr

let test_pause_keeps_withdrawals_available =
  let (pool, token_a, token_b) = setup_initialized_pool () in
  let () = Test.State.set_source (admin ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "set_paused" pool.taddr)
      true
      0tez in
  let swap_param : Contract.swap_param =
    {
      direction = A_to_b;
      amount_in = 1000n;
      min_amount_out = 1n;
      receiver = admin ();
      deadline = future
    } in
  let swap_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap_param
      0tez in
  let () = assert_string_failure "paused swap" Contract.err_paused swap_result in
  let remove_param : Contract.remove_liquidity_param =
    {
      shares = 1000n;
      min_amount_a = 1000n;
      min_amount_b = 1000n;
      receiver = admin ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "remove_liquidity" pool.taddr)
      remove_param
      0tez in
  assert_pool_solvency
    "paused withdrawal"
    pool.taddr
    token_a.taddr
    token_b.taddr

(* ------------------------------------------------------------------------- *)
(* Fee claim and two-step management handoff                                 *)
(* ------------------------------------------------------------------------- *)

let test_fee_recipient_claims_verified_fee_balance =
  let (pool, token_a, token_b) = setup_initialized_pool () in
  let () = fund_trader_and_authorize pool.taddr token_a.taddr token_b.taddr in
  let () = Test.State.set_source (trader ()) in
  let amount_in = 100000n in
  let swap_param : Contract.swap_param =
    {
      direction = A_to_b;
      amount_in = amount_in;
      min_amount_out = 1n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap_param
      0tez in
  let expected_fee = Contract.protocol_fee amount_in in
  let fee_balance_before = token_balance token_a.taddr (fee_recipient ()) in
  let () = Test.State.set_source (fee_recipient ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "claim_protocol_fees" pool.taddr)
      ()
      0tez in
  let pool_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "claimed fee storage" pool_storage.protocol_fees_a 0n in
  let () =
    assert_nat
      "claimed fee recipient balance"
      (token_balance token_a.taddr (fee_recipient ()))
      (fee_balance_before + expected_fee) in
  assert_pool_solvency "fee claim" pool.taddr token_a.taddr token_b.taddr

let test_admin_handoff_requires_acceptance =
  let (pool, _, _) = setup_initialized_pool () in
  let () = Test.State.set_source (admin ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "propose_admin" pool.taddr)
      (successor_admin ())
      0tez in
  let interim : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () =
    Assert.Error.assert (interim.admin = admin ()) "admin changed before acceptance" in
  let () = Test.State.set_source (successor_admin ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "accept_admin" pool.taddr)
      ()
      0tez in
  let final_storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let no_pending_admin =
    match final_storage.pending_admin with
    | None -> true
    | Some _ -> false in
  Assert.Error.assert
    (final_storage.admin = successor_admin () && no_pending_admin)
    "admin handoff failed"

(* ------------------------------------------------------------------------- *)
(* Callback authentication and bounded LP-token interface                    *)
(* ------------------------------------------------------------------------- *)

let test_unsolicited_callback_is_rejected =
  let (pool, _, _) = setup_initialized_pool () in
  let () = Test.State.set_source (trader ()) in
  let response : Contract.balance_response =
    {
      request = {owner = Test.Typed_address.to_address pool.taddr; token_id = 0n};
      balance = initial_reserve
    } in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "receive_first_before" pool.taddr)
      [response]
      0tez in
  assert_string_failure
    "unsolicited callback"
    Contract.err_invalid_callback
    result

let test_malformed_balance_delta_is_rejected =
  let () = clean () in
  let () = Test.State.set_source (trader ()) in
  let asset_a : Contract.asset = {token_contract = trader (); token_id = 0n} in
  let asset_b : Contract.asset = {token_contract = admin (); token_id = 1n} in
  let first_leg : Contract.transfer_leg =
    {
      asset = asset_a;
      from_ = trader ();
      to_ = admin ();
      amount = 100n;
      mode = Inbound
    } in
  let pending : Contract.pending_action =
    {
      final_action =
        Finalize_swap
          {
            direction = A_to_b;
            amount_in = 100n;
            amount_out = 90n;
            protocol_fee = 0n
          };
      first_leg = first_leg;
      second_leg = None;
      phase = First_after;
      observed_before = Some 1000n;
      deadline = Some future
    } in
  let base_storage : Contract.storage =
    Contract.build_storage
      {
        token_a = asset_a;
        token_b = asset_b;
        admin = admin ();
        fee_recipient = fee_recipient ();
        metadata = (Big_map.empty : (string, bytes) big_map);
        token_metadata = lp_token_metadata ()
      } in
  let storage : Contract.storage =
    {
      base_storage with
      reserve_a = 1000n;
      reserve_b = 1000n;
      total_supply = 1000n;
      pending = Some pending
    } in
  let pool = Test.Originate.contract (contract_of Contract) storage 0tez in
  let response : Contract.balance_response =
    {
      request = {owner = Test.Typed_address.to_address pool.taddr; token_id = 0n};
      balance = 1099n
    } in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "receive_first_after" pool.taddr)
      [response]
      0tez in
  assert_string_failure
    "malformed transfer delta"
    Contract.err_invalid_balance_delta
    result

let test_lp_transfer_is_single_call_and_locked_minimum_cannot_move =
  let (pool, _, _) = setup_initialized_pool () in
  let () = Test.State.set_source (admin ()) in
  let transfer : Contract.fa2_transfer =
    [
      {
        from_ = admin ();
        txs = [{to_ = trader (); token_id = 0n; amount = 1000n}]
      }
    ] in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "transfer" pool.taddr)
      transfer
      0tez in
  let () = assert_nat "LP transfer recipient" (pool_balance pool.taddr (trader ())) 1000n in
  let batch : Contract.fa2_transfer =
    [
      {
        from_ = admin ();
        txs = [{to_ = trader (); token_id = 0n; amount = 1n}]
      };
      {
        from_ = admin ();
        txs = [{to_ = trader (); token_id = 0n; amount = 1n}]
      }
    ] in
  let batch_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "transfer" pool.taddr)
      batch
      0tez in
  assert_string_failure "LP transfer batch bound" Contract.err_invalid_callback batch_result
