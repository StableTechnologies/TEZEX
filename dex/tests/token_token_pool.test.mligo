#include "../contracts/token_token_pool.mligo"
#import "../contracts/helpers/fa2_token.mligo" "FA2"
#import "../contracts/lqt_fa12.mligo" "LQT"

module Test = Test.Next
module LegacyTezos = Tezos
module Tezos = Tezos.Next
module Contract = TokenTokenPool

module FA12 = struct
  type transfer = address * (address * nat)
  type approve = address * nat
  type storage =
    {
      ledger : (address, nat) big_map;
      allowances : ((address * address), nat) big_map
    }
  type result = operation list * storage

  let balance (owner : address) (s : storage) : nat =
    match Big_map.find_opt owner s.ledger with
    | Some amount -> amount
    | None -> 0n

  let allowance (owner : address) (spender : address) (s : storage) : nat =
    match Big_map.find_opt (owner, spender) s.allowances with
    | Some amount -> amount
    | None -> 0n

  let checked_sub (a : nat) (b : nat) : nat =
    match is_nat (a - b) with
    | Some amount -> amount
    | None -> failwith "FA12_UNDERFLOW"

  [@entry]
  let transfer ((from_, (to_, amount)) : transfer) (s : storage) : result =
    let sender = Tezos.get_sender () in
    let allowances =
      if sender = from_
      then s.allowances
      else
        let remaining = checked_sub (allowance from_ sender s) amount in
        Big_map.update (from_, sender) (Some remaining) s.allowances in
    let from_balance = checked_sub (balance from_ s) amount in
    let to_balance = balance to_ s + amount in
    ([],
     {
       ledger =
         Big_map.update to_ (Some to_balance)
           (Big_map.update from_ (Some from_balance) s.ledger);
       allowances = allowances
     })

  [@entry]
  let approve ((spender, amount) : approve) (s : storage) : result =
    let owner = Tezos.get_sender () in
    let previous = allowance owner spender s in
    let () =
      Assert.Error.assert
        (previous = 0n || amount = 0n)
        "FA12_UNSAFE_ALLOWANCE_CHANGE" in
    ([],
     {
       s with
       allowances = Big_map.update (owner, spender) (Some amount) s.allowances
     })
end

(* A deliberately hostile FA1.2 test double. Once armed, every transfer calls
   back into the pool before its self-only close operation can run. *)
module ReentrantFA12 = struct
  type transfer = address * (address * nat)
  type approve = address * nat
  type storage =
    {
      ledger : (address, nat) big_map;
      allowances : ((address * address), nat) big_map;
      attack_target : address option
    }
  type result = operation list * storage

  let balance (owner : address) (s : storage) : nat =
    match Big_map.find_opt owner s.ledger with
    | Some amount -> amount
    | None -> 0n

  let allowance (owner : address) (spender : address) (s : storage) : nat =
    match Big_map.find_opt (owner, spender) s.allowances with
    | Some amount -> amount
    | None -> 0n

  let checked_sub (a : nat) (b : nat) : nat =
    match is_nat (a - b) with
    | Some amount -> amount
    | None -> failwith "REENTRANT_FA12_UNDERFLOW"

  [@entry]
  let transfer ((from_, (to_, amount)) : transfer) (s : storage) : result =
    let sender = Tezos.get_sender () in
    let allowances =
      if sender = from_
      then s.allowances
      else
        let remaining = checked_sub (allowance from_ sender s) amount in
        Big_map.update (from_, sender) (Some remaining) s.allowances in
    let ledger =
      Big_map.update to_ (Some (balance to_ s + amount))
        (Big_map.update from_ (Some (checked_sub (balance from_ s) amount)) s.ledger) in
    let operations : operation list =
      match s.attack_target with
      | None -> []
      | Some target ->
          let callback : bool contract =
            match
              (LegacyTezos.get_entrypoint_opt "%set_paused" target : bool contract option)
            with
            | Some entrypoint -> entrypoint
            | None -> failwith "REENTRANT_FA12_MISSING_TARGET" in
          [LegacyTezos.transaction true 0mutez callback] in
    (operations, {s with ledger = ledger; allowances = allowances})

  [@entry]
  let approve ((spender, amount) : approve) (s : storage) : result =
    let owner = Tezos.get_sender () in
    let previous = allowance owner spender s in
    let () =
      Assert.Error.assert
        (previous = 0n || amount = 0n)
        "REENTRANT_FA12_UNSAFE_ALLOWANCE_CHANGE" in
    ([],
     {
       s with
       allowances = Big_map.update (owner, spender) (Some amount) s.allowances
     })

  [@entry]
  let arm (target : address) (s : storage) : result =
    ([], {s with attack_target = Some target})
end

type pool_parameter = TokenTokenPool parameter_of
type fa2_parameter = FA2 parameter_of
type fa12_parameter = FA12 parameter_of
type lqt_parameter = LQT.LQT parameter_of
type reentrant_fa12_parameter = ReentrantFA12 parameter_of
type pool_typed_address = (pool_parameter, Contract.storage) typed_address
type fa2_typed_address = (fa2_parameter, FA2.storage) typed_address
type fa12_typed_address = (fa12_parameter, FA12.storage) typed_address
type lqt_typed_address = (lqt_parameter, LQT.LQT.storage) typed_address
type reentrant_fa12_typed_address =
  (reentrant_fa12_parameter, ReentrantFA12.storage) typed_address

let manager () = Test.Account.address 0n
let trader () = Test.Account.address 1n
let fee_recipient () = Test.Account.address 2n
let successor () = Test.Account.address 3n
let replacement_fee_recipient () = Test.Account.address 4n

let future = ("1970-01-01T01:00:00Z" : timestamp)
let initial_fa2_balance = 1000000000000n
let initial_fa12_balance = 100000000000000n
let seed_a = 1000000n
let seed_b = 100000000n
let expected_initial_lqt = 10000000n

let clean () : unit =
  Test.State.reset
    5n
    [1000000tez; 1000000tez; 1000000tez; 1000000tez; 1000000tez]

let assert_nat (label : string) (actual : nat) (expected : nat) : unit =
  if actual = expected
  then ()
  else
    failwith
      (label ^ ": expected " ^ Test.String.show expected
       ^ ", got " ^ Test.String.show actual)

let assert_true (label : string) (condition : bool) : unit =
  Assert.Error.assert condition label

let assert_string_failure
  (label : string)
  (expected : string)
  (result : test_exec_result)
: unit =
  match result with
  | Success _ -> failwith (label ^ ": expected failure")
  | Fail failure ->
      (match failure with
       | Rejected (actual, _) ->
           let expected_value = Test.Michelson.eval (expected : string) in
           if Test.Compare.eq actual expected_value
           then ()
           else failwith (label ^ ": wrong failure")
       | _ -> failwith (label ^ ": unexpected failure type"))

let deploy_fa2 (owner : address) =
  Test.Originate.contract
    (contract_of FA2)
    (FA2.make_storage owner initial_fa2_balance 0n)
    0tez

let deploy_fa12 (owner : address) =
  let storage : FA12.storage =
    {
      ledger = Big_map.literal [(owner, initial_fa12_balance)];
      allowances = (Big_map.empty : ((address * address), nat) big_map)
    } in
  Test.Originate.contract (contract_of FA12) storage 0tez

let deploy_reentrant_fa12 (owner : address) =
  let storage : ReentrantFA12.storage =
    {
      ledger = Big_map.literal [(owner, initial_fa12_balance)];
      allowances = (Big_map.empty : ((address * address), nat) big_map);
      attack_target = None
    } in
  Test.Originate.contract (contract_of ReentrantFA12) storage 0tez

let deploy_pool (token_a : Contract.token) (token_b : Contract.token) =
  let storage : Contract.storage =
    Contract.build_storage
      {
        token_a = token_a;
        token_b = token_b;
        manager = manager ();
        protocol_fee_recipient = fee_recipient ();
        metadata = (Big_map.empty : (string, bytes) big_map)
      } in
  Test.Originate.contract (contract_of Contract) storage 0tez

let deploy_lqt (pool_address : address) =
  let storage : LQT.LQT.storage =
    {
      tokens = (Big_map.empty : LQT.LQT.tokens);
      allowances = (Big_map.empty : LQT.LQT.allowances);
      admin = pool_address;
      total_supply = 0n;
      metadata = (Big_map.empty : (string, bytes) big_map);
      token_metadata =
        Big_map.literal
          [
            (0n,
             {
               token_id = 0n;
               token_info =
                 Map.literal
                   [
                     ("name", Bytes.pack ("Token Pair Liquidity" : string));
                     ("symbol", Bytes.pack ("TPLP" : string));
                     ("decimals", Bytes.pack ("7" : string))
                   ]
             })
          ]
    } in
  Test.Originate.contract (contract_of LQT.LQT) storage 0tez

let set_lqt (pool : pool_typed_address) (lqt : lqt_typed_address) : unit =
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "set_lqt_address" pool)
      (Test.Typed_address.to_address lqt)
      0tez in
  ()

let add_fa2_operator
  (token : fa2_typed_address)
  (owner : address)
  (operator : address)
: unit =
  let update : FA2.update_operators =
    [Add_operator {owner = owner; operator = operator; token_id = 0n}] in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "update_operators" token)
      update
      0tez in
  ()

let approve_fa12
  (token : fa12_typed_address)
  (spender : address)
  (amount : nat)
: unit =
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "approve" token)
      (spender, amount)
      0tez in
  ()

let approve_reentrant_fa12
  (token : reentrant_fa12_typed_address)
  (spender : address)
  (amount : nat)
: unit =
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "approve" token)
      (spender, amount)
      0tez in
  ()

let transfer_fa2
  (token : fa2_typed_address)
  (from_ : address)
  (to_ : address)
  (amount : nat)
: unit =
  let parameter : FA2.transfer =
    [{from_ = from_; txs = [{to_ = to_; token_id = 0n; amount = amount}]}] in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "transfer" token)
      parameter
      0tez in
  ()

let transfer_fa12
  (token : fa12_typed_address)
  (from_ : address)
  (to_ : address)
  (amount : nat)
: unit =
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "transfer" token)
      (from_, (to_, amount))
      0tez in
  ()

let fa2_balance (token : fa2_typed_address) (owner : address) : nat =
  let storage : FA2.storage = Test.Typed_address.get_storage token in
  match Big_map.find_opt owner storage.ledger with
  | Some amount -> amount
  | None -> 0n

let fa12_balance (token : fa12_typed_address) (owner : address) : nat =
  let storage : FA12.storage = Test.Typed_address.get_storage token in
  FA12.balance owner storage

let lqt_balance (lqt : lqt_typed_address) (owner : address) : nat =
  let storage : LQT.LQT.storage = Test.Typed_address.get_storage lqt in
  match Big_map.find_opt owner storage.tokens with
  | Some amount -> amount
  | None -> 0n

let authorize_pair
  (pool : pool_typed_address)
  (fa2 : fa2_typed_address)
  (fa12 : fa12_typed_address)
  (owner : address)
  (amount_a : nat)
  (amount_b : nat)
: unit =
  let pool_address = Test.Typed_address.to_address pool in
  let () = add_fa2_operator fa2 owner pool_address in
  approve_fa12 fa12 pool_address amount_b

let initialize_pool
  (pool : pool_typed_address)
  (receiver : address)
  (amount_a : nat)
  (amount_b : nat)
: unit =
  let parameter : Contract.initialize_param =
    {
      amount_a = amount_a;
      amount_b = amount_b;
      receiver = receiver;
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "initialize" pool)
      parameter
      0tez in
  ()

let setup_pool () =
  let () = clean () in
  let () = Test.State.set_source (manager ()) in
  let fa2 = deploy_fa2 (manager ()) in
  let fa12 = deploy_fa12 (manager ()) in
  let pool =
    deploy_pool
      (Fa2 {token = Test.Typed_address.to_address fa2.taddr; id = 0n})
      (Fa12 (Test.Typed_address.to_address fa12.taddr)) in
  let lqt = deploy_lqt (Test.Typed_address.to_address pool.taddr) in
  let () = set_lqt pool.taddr lqt.taddr in
  let () = authorize_pair pool.taddr fa2.taddr fa12.taddr (manager ()) seed_a seed_b in
  let () = initialize_pool pool.taddr (manager ()) seed_a seed_b in
  (pool, lqt, fa2, fa12)

let fund_and_authorize_trader
  (pool : pool_typed_address)
  (fa2 : fa2_typed_address)
  (fa12 : fa12_typed_address)
  (amount_a : nat)
  (amount_b : nat)
: unit =
  let pool_address = Test.Typed_address.to_address pool in
  let () = Test.State.set_source (manager ()) in
  let () = transfer_fa2 fa2 (manager ()) (trader ()) amount_a in
  let () = transfer_fa12 fa12 (manager ()) (trader ()) amount_b in
  let () = Test.State.set_source (trader ()) in
  let () = add_fa2_operator fa2 (trader ()) pool_address in
  approve_fa12 fa12 pool_address amount_b

let assert_solvency
  (label : string)
  (pool : pool_typed_address)
  (fa2 : fa2_typed_address)
  (fa12 : fa12_typed_address)
: unit =
  let storage : Contract.storage = Test.Typed_address.get_storage pool in
  let pool_address = Test.Typed_address.to_address pool in
  let held_a = fa2_balance fa2 pool_address in
  let held_b = fa12_balance fa12 pool_address in
  let () =
    assert_true
      (label ^ ": token A insolvent")
      (held_a >= storage.reserve_a + storage.protocol_fee_a) in
  assert_true
    (label ^ ": token B insolvent")
    (held_b >= storage.reserve_b + storage.protocol_fee_b)

(* ----------------------------------------------------------------------- *)
(* Initialization and LP lifecycle                                         *)
(* ----------------------------------------------------------------------- *)

let test_initialization_uses_integer_square_root_and_external_lqt =
  let (pool, lqt, fa2, fa12) = setup_pool () in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let lqt_storage : LQT.LQT.storage = Test.Typed_address.get_storage lqt.taddr in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = assert_nat "reserve A" storage.reserve_a seed_a in
  let () = assert_nat "reserve B" storage.reserve_b seed_b in
  let () = assert_nat "geometric mean" storage.lqt_total expected_initial_lqt in
  let () = assert_nat "LQT total" lqt_storage.total_supply expected_initial_lqt in
  let () = assert_nat "locked LQT" (lqt_balance lqt.taddr pool_address) 1000n in
  let () =
    assert_nat
      "provider LQT"
      (lqt_balance lqt.taddr (manager ()))
      9999000n in
  let () = assert_true "LQT admin mismatch" (lqt_storage.admin = pool_address) in
  let () = assert_true "pool not active" (storage.active && not storage.entered) in
  assert_solvency "initialization" pool.taddr fa2.taddr fa12.taddr

let test_initialization_is_one_time_and_lqt_address_is_immutable =
  let (pool, lqt, _fa2, _fa12) = setup_pool () in
  let initialize_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "initialize" pool.taddr)
      ({amount_a = seed_a; amount_b = seed_b; receiver = manager (); deadline = future}
        : Contract.initialize_param)
      0tez in
  let () =
    assert_string_failure
      "second initialization"
      Contract.err_already_active
      initialize_result in
  let lqt_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "set_lqt_address" pool.taddr)
      (Test.Typed_address.to_address lqt.taddr)
      0tez in
  assert_string_failure "second LQT address" Contract.err_already_active lqt_result

let test_same_artifact_initializes_an_fa2_to_fa2_pair =
  let () = clean () in
  let () = Test.State.set_source (manager ()) in
  let token_a = deploy_fa2 (manager ()) in
  let token_b = deploy_fa2 (manager ()) in
  let pool =
    deploy_pool
      (Fa2 {token = Test.Typed_address.to_address token_a.taddr; id = 0n})
      (Fa2 {token = Test.Typed_address.to_address token_b.taddr; id = 0n}) in
  let lqt = deploy_lqt (Test.Typed_address.to_address pool.taddr) in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = set_lqt pool.taddr lqt.taddr in
  let () = add_fa2_operator token_a.taddr (manager ()) pool_address in
  let () = add_fa2_operator token_b.taddr (manager ()) pool_address in
  let () = initialize_pool pool.taddr (manager ()) seed_a seed_b in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "FA2/FA2 reserve A" storage.reserve_a seed_a in
  let () = assert_nat "FA2/FA2 reserve B" storage.reserve_b seed_b in
  let () = assert_nat "FA2/FA2 held A" (fa2_balance token_a.taddr pool_address) seed_a in
  assert_nat "FA2/FA2 held B" (fa2_balance token_b.taddr pool_address) seed_b

let test_same_artifact_initializes_an_fa12_to_fa12_pair =
  let () = clean () in
  let () = Test.State.set_source (manager ()) in
  let token_a = deploy_fa12 (manager ()) in
  let token_b = deploy_fa12 (manager ()) in
  let pool =
    deploy_pool
      (Fa12 (Test.Typed_address.to_address token_a.taddr))
      (Fa12 (Test.Typed_address.to_address token_b.taddr)) in
  let lqt = deploy_lqt (Test.Typed_address.to_address pool.taddr) in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = set_lqt pool.taddr lqt.taddr in
  let () = approve_fa12 token_a.taddr pool_address seed_a in
  let () = approve_fa12 token_b.taddr pool_address seed_b in
  let () = initialize_pool pool.taddr (manager ()) seed_a seed_b in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "FA1.2/FA1.2 reserve A" storage.reserve_a seed_a in
  let () = assert_nat "FA1.2/FA1.2 reserve B" storage.reserve_b seed_b in
  let () = assert_nat "FA1.2/FA1.2 held A" (fa12_balance token_a.taddr pool_address) seed_a in
  assert_nat "FA1.2/FA1.2 held B" (fa12_balance token_b.taddr pool_address) seed_b

let test_proportional_add_and_remove_liquidity =
  let (pool, lqt, fa2, fa12) = setup_pool () in
  let () =
    fund_and_authorize_trader pool.taddr fa2.taddr fa12.taddr 200000n 20000000n in
  let add : Contract.add_liquidity_param =
    {
      max_amount_a = 100000n;
      max_amount_b = 10000000n;
      min_lqt_minted = 1000000n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "add_liquidity" pool.taddr)
      add
      0tez in
  let () = assert_nat "minted trader LQT" (lqt_balance lqt.taddr (trader ())) 1000000n in
  let remove : Contract.remove_liquidity_param =
    {
      lqt_burned = 500000n;
      min_amount_a = 49999n;
      min_amount_b = 4999999n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "remove_liquidity" pool.taddr)
      remove
      0tez in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let lqt_storage : LQT.LQT.storage = Test.Typed_address.get_storage lqt.taddr in
  let () = assert_nat "burned trader LQT" (lqt_balance lqt.taddr (trader ())) 500000n in
  let () = assert_nat "synchronized LQT total" storage.lqt_total lqt_storage.total_supply in
  assert_solvency "liquidity" pool.taddr fa2.taddr fa12.taddr

let test_minimum_lqt_cannot_be_redeemed =
  let (pool, _lqt, _fa2, _fa12) = setup_pool () in
  let burn_too_much : Contract.remove_liquidity_param =
    {
      lqt_burned = expected_initial_lqt;
      min_amount_a = 0n;
      min_amount_b = 0n;
      receiver = manager ();
      deadline = future
    } in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "remove_liquidity" pool.taddr)
      burn_too_much
      0tez in
  assert_string_failure "minimum LQT" Contract.err_minimum_lqt result

(* ----------------------------------------------------------------------- *)
(* Swap economics, rounding, surplus, and fees                              *)
(* ----------------------------------------------------------------------- *)

let test_bidirectional_swaps_preserve_accounting_and_product =
  let (pool, _lqt, fa2, fa12) = setup_pool () in
  let () =
    fund_and_authorize_trader pool.taddr fa2.taddr fa12.taddr 1000000n 100000000n in
  let before : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let old_product = before.reserve_a * before.reserve_b in
  let amount_a_in = 100000n in
  let expected_b_out = Contract.quote_output amount_a_in before.reserve_a before.reserve_b in
  let swap_a : Contract.swap_param =
    {
      direction = A_to_b;
      amount_in = amount_a_in;
      min_amount_out = expected_b_out;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap_a
      0tez in
  let middle : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "A protocol fee" middle.protocol_fee_a 50n in
  let () =
    assert_true
      "A-to-B product decreased"
      (middle.reserve_a * middle.reserve_b >= old_product) in
  let amount_b_in = 10000000n in
  let expected_a_out =
    Contract.quote_output amount_b_in middle.reserve_b middle.reserve_a in
  let swap_b : Contract.swap_param =
    {
      direction = B_to_a;
      amount_in = amount_b_in;
      min_amount_out = expected_a_out;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap_b
      0tez in
  let final : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "B protocol fee" final.protocol_fee_b 5000n in
  let () =
    assert_true
      "B-to-A product decreased"
      (final.reserve_a * final.reserve_b >= middle.reserve_a * middle.reserve_b) in
  assert_solvency "bidirectional swaps" pool.taddr fa2.taddr fa12.taddr

let test_swap_deadline_and_minimum_output_fail_before_transfers =
  let (pool, _lqt, fa2, fa12) = setup_pool () in
  let () =
    fund_and_authorize_trader pool.taddr fa2.taddr fa12.taddr 100000n 0n in
  let before : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let expired =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      ({
         direction = A_to_b;
         amount_in = 100000n;
         min_amount_out = 0n;
         receiver = trader ();
         deadline = ("1969-12-31T23:59:59Z" : timestamp)
       } : Contract.swap_param)
      0tez in
  let () = assert_string_failure "expired swap" Contract.err_expired expired in
  let quote = Contract.quote_output 100000n before.reserve_a before.reserve_b in
  let slipped =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      ({
         direction = A_to_b;
         amount_in = 100000n;
         min_amount_out = quote + 1n;
         receiver = trader ();
         deadline = future
       } : Contract.swap_param)
      0tez in
  let () = assert_string_failure "swap slippage" Contract.err_slippage slipped in
  let after : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "rejected swap reserve A" after.reserve_a before.reserve_a in
  let () = assert_nat "rejected swap reserve B" after.reserve_b before.reserve_b in
  assert_solvency "rejected swaps" pool.taddr fa2.taddr fa12.taddr

let test_reentrant_token_callback_reverts_the_whole_swap =
  let () = clean () in
  let () = Test.State.set_source (manager ()) in
  let hostile = deploy_reentrant_fa12 (manager ()) in
  let token_b = deploy_fa12 (manager ()) in
  let pool =
    deploy_pool
      (Fa12 (Test.Typed_address.to_address hostile.taddr))
      (Fa12 (Test.Typed_address.to_address token_b.taddr)) in
  let lqt = deploy_lqt (Test.Typed_address.to_address pool.taddr) in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let () = set_lqt pool.taddr lqt.taddr in
  let () = approve_reentrant_fa12 hostile.taddr pool_address seed_a in
  let () = approve_fa12 token_b.taddr pool_address seed_b in
  let () = initialize_pool pool.taddr (manager ()) seed_a seed_b in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "transfer" hostile.taddr)
      ((manager ()), ((trader ()), 100000n))
      0tez in
  let () = Test.State.set_source (trader ()) in
  let () = approve_reentrant_fa12 hostile.taddr pool_address 100000n in
  let () = Test.State.set_source (manager ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "arm" hostile.taddr)
      pool_address
      0tez in
  let before : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = Test.State.set_source (trader ()) in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      ({direction = A_to_b; amount_in = 100000n; min_amount_out = 1n;
        receiver = trader (); deadline = future} : Contract.swap_param)
      0tez in
  let () =
    assert_string_failure
      "reentrant token callback"
      Contract.err_entered
      result in
  let after : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "reentrant reserve A" after.reserve_a before.reserve_a in
  let () = assert_nat "reentrant reserve B" after.reserve_b before.reserve_b in
  assert_true "reentrant swap left guard active" (not after.entered)

let test_tiny_input_rounding_never_overcharges_protocol_fee =
  let () = assert_nat "tiny fee" (Contract.protocol_fee 1999n) 0n in
  let () = assert_nat "fee threshold" (Contract.protocol_fee 2000n) 1n in
  let out = Contract.quote_output 1n 1000000n 100000000n in
  assert_true "tiny quote must be bounded" (out < 100n)

let test_direct_donations_are_surplus_not_reserves =
  let (pool, _lqt, fa2, fa12) = setup_pool () in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let before : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = Test.State.set_source (manager ()) in
  let () = transfer_fa2 fa2.taddr (manager ()) pool_address 777n in
  let () = transfer_fa12 fa12.taddr (manager ()) pool_address 888n in
  let after : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "donated A changed reserve" after.reserve_a before.reserve_a in
  let () = assert_nat "donated B changed reserve" after.reserve_b before.reserve_b in
  assert_solvency "donation surplus" pool.taddr fa2.taddr fa12.taddr

let test_claim_is_permissionless_but_pays_only_configured_recipient =
  let (pool, _lqt, fa2, fa12) = setup_pool () in
  let () =
    fund_and_authorize_trader pool.taddr fa2.taddr fa12.taddr 1000000n 0n in
  let swap : Contract.swap_param =
    {
      direction = A_to_b;
      amount_in = 100000n;
      min_amount_out = 1n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      swap
      0tez in
  let recipient_before = fa2_balance fa2.taddr (fee_recipient ()) in
  let () = Test.State.set_source (successor ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "claim_protocol_fee" pool.taddr)
      Token_a
      0tez in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  let () = assert_nat "fee not zeroed" storage.protocol_fee_a 0n in
  let () =
    assert_nat
      "wrong fee destination"
      (fa2_balance fa2.taddr (fee_recipient ()))
      (recipient_before + 50n) in
  assert_solvency "fee claim" pool.taddr fa2.taddr fa12.taddr

(* ----------------------------------------------------------------------- *)
(* Pause and administration                                                 *)
(* ----------------------------------------------------------------------- *)

let test_pause_blocks_swaps_and_adds_but_not_removal =
  let (pool, _lqt, fa2, fa12) = setup_pool () in
  let () =
    fund_and_authorize_trader pool.taddr fa2.taddr fa12.taddr 100000n 10000000n in
  let add : Contract.add_liquidity_param =
    {
      max_amount_a = 100000n;
      max_amount_b = 10000000n;
      min_lqt_minted = 1n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "add_liquidity" pool.taddr)
      add
      0tez in
  let () = Test.State.set_source (manager ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "set_paused" pool.taddr)
      true
      0tez in
  let () = Test.State.set_source (trader ()) in
  let swap_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "swap" pool.taddr)
      ({direction = A_to_b; amount_in = 1n; min_amount_out = 0n;
        receiver = trader (); deadline = future} : Contract.swap_param)
      0tez in
  let () = assert_string_failure "paused swap" Contract.err_paused swap_result in
  let add_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "add_liquidity" pool.taddr)
      add
      0tez in
  let () = assert_string_failure "paused add" Contract.err_paused add_result in
  let remove : Contract.remove_liquidity_param =
    {
      lqt_burned = 100000n;
      min_amount_a = 1n;
      min_amount_b = 1n;
      receiver = trader ();
      deadline = future
    } in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "remove_liquidity" pool.taddr)
      remove
      0tez in
  assert_solvency "paused removal" pool.taddr fa2.taddr fa12.taddr

let test_manager_transfer_is_two_step_and_cancelable =
  let (pool, _lqt, _fa2, _fa12) = setup_pool () in
  let () = Test.State.set_source (manager ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "propose_manager" pool.taddr)
      (successor ())
      0tez in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "cancel_manager_transfer" pool.taddr)
      ()
      0tez in
  let () = Test.State.set_source (successor ()) in
  let canceled =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "accept_manager" pool.taddr)
      ()
      0tez in
  let () =
    assert_string_failure
      "canceled manager acceptance"
      Contract.err_not_pending_manager
      canceled in
  let () = Test.State.set_source (manager ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "propose_manager" pool.taddr)
      (successor ())
      0tez in
  let () = Test.State.set_source (successor ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "accept_manager" pool.taddr)
      ()
      0tez in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  assert_true "manager not transferred" (storage.manager = successor ())

let test_fee_recipient_change_is_two_step =
  let (pool, _lqt, _fa2, _fa12) = setup_pool () in
  let () = Test.State.set_source (manager ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "propose_protocol_fee_recipient" pool.taddr)
      (replacement_fee_recipient ())
      0tez in
  let () = Test.State.set_source (replacement_fee_recipient ()) in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "accept_protocol_fee_recipient" pool.taddr)
      ()
      0tez in
  let storage : Contract.storage = Test.Typed_address.get_storage pool.taddr in
  assert_true
    "fee recipient not transferred"
    (storage.protocol_fee_recipient = replacement_fee_recipient ())

let test_non_payable_and_unauthorized_admin_calls_fail_closed =
  let (pool, _lqt, _fa2, _fa12) = setup_pool () in
  let () = Test.State.set_source (trader ()) in
  let unauthorized =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "set_paused" pool.taddr)
      true
      0tez in
  let () =
    assert_string_failure
      "unauthorized pause"
      Contract.err_not_manager
      unauthorized in
  let payable =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "default" pool.taddr)
      ()
      1mutez in
  assert_string_failure "payable default" Contract.err_non_payable payable

(* ----------------------------------------------------------------------- *)
(* Views and immutable economics                                            *)
(* ----------------------------------------------------------------------- *)

let test_views_match_execution_math_and_immutable_fee_split =
  let (pool, _lqt, _fa2, _fa12) = setup_pool () in
  let pool_address = Test.Typed_address.to_address pool.taddr in
  let fee_view : (nat * nat * nat) option =
    Tezos.View.call "get_fee_bp" () pool_address in
  let quote_view : nat option =
    Tezos.View.call "quote_a_to_b" 100000n pool_address in
  let () =
    match fee_view with
    | Some (lp, protocol, total) ->
        assert_true "wrong fee view" (lp = 25n && protocol = 5n && total = 30n)
    | None -> failwith "fee view unavailable" in
  match quote_view with
  | Some quote ->
      assert_nat
        "quote view mismatch"
        quote
        (Contract.quote_output 100000n seed_a seed_b)
  | None -> failwith "quote view unavailable"
