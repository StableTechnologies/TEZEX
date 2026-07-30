#import "../contracts/lqt_fa12.mligo" "LQT"

module Test = Test.Next
module Tezos = Tezos.Next

type lqt_parameter = LQT.LQT parameter_of
type lqt_typed_address = (lqt_parameter, LQT.LQT.storage) typed_address

let admin () = Test.Account.address 0n
let owner () = Test.Account.address 1n
let recipient () = Test.Account.address 2n

let clean () : unit =
  Test.State.reset 3n [1000000tez; 1000000tez; 1000000tez]

let deploy_lqt (owner_balance : nat) (total_supply : nat) =
  let storage : LQT.LQT.storage =
    {
      tokens = Big_map.literal [(owner (), owner_balance)];
      allowances = (Big_map.empty : LQT.LQT.allowances);
      admin = admin ();
      total_supply = total_supply;
      metadata = (Big_map.empty : (string, bytes) big_map);
      token_metadata =
        (Big_map.empty : (nat, LQT.LQT.token_metadata_value) big_map)
    } in
  Test.Originate.contract (contract_of LQT.LQT) storage 0tez

let balance (lqt : lqt_typed_address) (account : address) : nat =
  let storage : LQT.LQT.storage = Test.Typed_address.get_storage lqt in
  match Big_map.find_opt account storage.tokens with
  | Some value -> value
  | None -> 0n

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

let test_mint_and_burn_update_supply_exactly =
  let () = clean () in
  let lqt = deploy_lqt 1000n 1000n in
  let () = Test.State.set_source (admin ()) in
  let mint : LQT.LQT.mintOrBurn = {quantity = 200; target = recipient ()} in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "mintOrBurn" lqt.taddr)
      mint
      0tez in
  let burn : LQT.LQT.mintOrBurn = {quantity = -50; target = recipient ()} in
  let _ : nat =
    Test.Contract.transfer_exn
      (Test.Typed_address.get_entrypoint "mintOrBurn" lqt.taddr)
      burn
      0tez in
  let storage : LQT.LQT.storage = Test.Typed_address.get_storage lqt.taddr in
  Assert.Error.assert
    (storage.total_supply = 1150n && balance lqt.taddr (recipient ()) = 150n)
    "unexpected mint/burn accounting"

let test_total_supply_underflow_fails_closed =
  let () = clean () in
  (* Deliberately inconsistent storage proves supply is checked independently
     from the target balance. *)
  let lqt = deploy_lqt 200n 100n in
  let () = Test.State.set_source (admin ()) in
  let burn : LQT.LQT.mintOrBurn = {quantity = -150; target = owner ()} in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "mintOrBurn" lqt.taddr)
      burn
      0tez in
  assert_string_failure
    "supply underflow"
    LQT.LQT.err_supply_underflow
    result

let test_mutating_entrypoints_reject_attached_xtz =
  let () = clean () in
  let lqt = deploy_lqt 1000n 1000n in
  let () = Test.State.set_source (owner ()) in
  let transfer : LQT.LQT.transfer =
    {address_from = owner (); address_to = recipient (); value = 1n} in
  let transfer_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "transfer" lqt.taddr)
      transfer
      1mutez in
  let () =
    assert_string_failure
      "payable transfer"
      LQT.LQT.err_non_payable
      transfer_result in
  let approve : LQT.LQT.approve = {spender = recipient (); value = 1n} in
  let approve_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "approve" lqt.taddr)
      approve
      1mutez in
  let () =
    assert_string_failure
      "payable approve"
      LQT.LQT.err_non_payable
      approve_result in
  let () = Test.State.set_source (admin ()) in
  let mint : LQT.LQT.mintOrBurn = {quantity = 1; target = owner ()} in
  let mint_result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "mintOrBurn" lqt.taddr)
      mint
      1mutez in
  assert_string_failure
    "payable mint"
    LQT.LQT.err_non_payable
    mint_result

let test_only_admin_can_mint_or_burn =
  let () = clean () in
  let lqt = deploy_lqt 1000n 1000n in
  let () = Test.State.set_source (owner ()) in
  let mint : LQT.LQT.mintOrBurn = {quantity = 1; target = owner ()} in
  let result =
    Test.Contract.transfer
      (Test.Typed_address.get_entrypoint "mintOrBurn" lqt.taddr)
      mint
      0tez in
  assert_string_failure "unauthorized mint" "OnlyAdmin" result
