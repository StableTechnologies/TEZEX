#include "../contracts/helpers/dexter_mod_fa2.mligo"
#import "../contracts/helpers/fa2_token.mligo" "FA2"
#import "../contracts/lqt_fa12.mligo" "LQT"

module Test = Test.Next

module Tezos = Tezos.Next

module MalformedFA2 = struct
  type response_mode =
    WrongOwner
  | WrongTokenId
  | ExtraResult
  | EmptyResult

  type storage =
    {
     responseMode : response_mode;
     balance : nat;
     wrongOwner : address;
    }

  type result = operation list * storage

  [@entry]
  let balance_of (param : FA2.balance_of) (storage : storage) : result =
    let request =
      match List.head param.requests with
        None -> (failwith "Missing request" : FA2.request)
      | Some request -> request in
    let valid_response : FA2.callback =
      {
       request = request;
       balance = storage.balance;
      } in
    let responses : FA2.callback list =
      match storage.responseMode with
        WrongOwner ->
          [
            {
             request = {request with owner = storage.wrongOwner};
             balance = storage.balance;
            }
          ]
      | WrongTokenId ->
          [
            {
             request = {request with token_id = request.token_id + 1n};
             balance = storage.balance;
            }
          ]
      | ExtraResult -> [valid_response; valid_response]
      | EmptyResult -> [] in
    ([Tezos.Operation.transaction responses 0tez param.callback], storage)

  [@entry]
  let transfer (_ : unit) (storage : storage) : result =
    (([] : operation list), storage)
end

let src () = Test.Account.address 1n

let other () = Test.Account.address 0n

let future = ("1970-01-01T00:10:12Z" : timestamp)

let clean () =
  Test.State.reset 3n [10000000000tez; 10000000000tez; 10000000000tez]

let deploy_fa2_token (initial_balance : nat) (token_id : nat) =
  let storage : FA2.storage = FA2.make_storage (src ()) initial_balance token_id in
  Test.Originate.contract (contract_of FA2) storage 0tez

let deploy_lqt
    (lqt_amount : nat)
    (owner : address)
    (admin : address) =
  let lqt_storage : LQT.LQT.storage =
    {
     tokens = (Big_map.literal [(owner, lqt_amount)] : LQT.LQT.tokens);
     allowances = (Big_map.empty : LQT.LQT.allowances);
     admin = admin;
     total_supply = lqt_amount;
     metadata = (Big_map.empty : (string, bytes) big_map);
     token_metadata =
       (Big_map.literal
          [
            (0n,
             {
              token_id = 0n;
              token_info = (Map.empty : (string, bytes) map)
             })
          ]
        : (nat, LQT.LQT.token_metadata_value) big_map)
    } in
  Test.Originate.contract (contract_of LQT.LQT) lqt_storage 0tez

let deploy_dex
    (token_address : address)
    (token_id : nat)
    (protocol_fee_recipient : address) =
  let dex_storage =
    Dexter.build_storage
      {
       lqtTotal = 1000000n;
       manager = src ();
       tokenAddress = token_address;
       tokenId = token_id;
       protocol_fee_recipient = protocol_fee_recipient;
      } in
  Test.Originate.contract (contract_of Dexter) dex_storage 0tez

let activate_dex (dex_taddr) =
  let activate_param : Dexter.activate_pool =
    {
     expectedXtzPool = 1tez;
     expectedTokenPool = 1000000n;
     expectedLqtTotal = 1000000n;
    } in
  let activate_entrypoint : Dexter.activate_pool contract =
    Test.Typed_address.get_entrypoint "activate" dex_taddr in
  let _ : nat =
    Test.Contract.transfer_exn activate_entrypoint activate_param 0tez in
  ()

let prepare_full_dex
    (lqt_total_supply : nat)
    (token_id : nat) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_fa2_token 1001000000n token_id in
  let tok_addr = Test.Typed_address.to_address tok_orig.taddr in
  let dex_orig = deploy_dex tok_addr token_id (other ()) in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let lqt_orig = deploy_lqt lqt_total_supply (src ()) dex_addr in
  let lqt_addr = Test.Typed_address.to_address lqt_orig.taddr in
  let operator_param : FA2.update_operators =
    [
      Add_operator
        {
         owner = src ();
         operator = dex_addr;
         token_id = token_id;
        }
    ] in
  let _ : nat =
    Test.Typed_address.transfer_exn
      tok_orig.taddr
      (Update_operators operator_param)
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress lqt_addr)
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  let transfer_param : FA2.transfer =
    [
      {
       from_ = src ();
       txs =
         [
           {
            to_ = dex_addr;
            token_id = token_id;
            amount = 1000000n;
           }
         ];
      }
    ] in
  let _ : nat =
    Test.Typed_address.transfer_exn
      tok_orig.taddr
      (Transfer transfer_param)
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  (dex_orig, lqt_orig, tok_orig)

let setup_full_dex () =
  let (dex_orig, lqt_orig, tok_orig) =
    prepare_full_dex 1000000n 0n in
  let () = activate_dex dex_orig.taddr in
  (dex_orig, lqt_orig, tok_orig)

let assert_error
    (test_name : string)
    (error_code : nat)
    (result : test_exec_result) =
  match result with
    Success _ -> failwith (test_name ^ ": expected error, got success")
  | Fail e ->
      (match e with
         Rejected (err, _) ->
           let expected = Test.Michelson.eval error_code in
           if Test.Compare.eq err expected
           then ()
           else failwith (test_name ^ ": wrong error code")
       | _ -> failwith (test_name ^ ": unexpected error type"))

let fa2_balance (tok_taddr) (owner : address) =
  let storage : FA2.storage = Test.Typed_address.get_storage tok_taddr in
  match Big_map.find_opt owner storage.ledger with
    None -> 0n
  | Some balance -> balance

let test_modified_fa2_pool_is_inactive_by_default =
  let test_name = "test_modified_fa2_pool_is_inactive_by_default" in
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_fa2_token 1000000n 0n in
  let dex_orig =
    deploy_dex
      (Test.Typed_address.to_address tok_orig.taddr)
      0n
      (other ()) in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if storage.active or storage.activationPending
    then failwith (test_name ^ ": pool should originate inactive")
    else () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let active_view : bool option =
    Tezos.View.call "is_active" () dex_address in
  let quote_view : nat option =
    Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let () =
    match active_view with
      Some false -> ()
    | _ -> failwith (test_name ^ ": is_active should be false") in
  let () =
    match quote_view with
      Some quote ->
        if quote = 0n
        then ()
        else failwith (test_name ^ ": inactive quote should be zero")
    | None -> failwith (test_name ^ ": inactive quote view failed") in
  let swap_param : Dexter.xtz_to_token =
    {
     to_ = src ();
     minTokensBought = 0n;
     deadline = future;
    } in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (XtzToToken swap_param)
      1tez in
  let () =
    assert_error test_name Dexter.error_POOL_NOT_ACTIVE result in
  let token_swap_param : Dexter.token_to_xtz =
    {
     to_ = src ();
     tokensSold = 1000n;
     minXtzBought = 0tez;
     deadline = future;
    } in
  let token_result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (TokenToXtz token_swap_param)
      0tez in
  assert_error test_name Dexter.error_POOL_NOT_ACTIVE token_result

let test_modified_fa2_only_manager_can_seed_inactive_pool =
  let test_name = "test_modified_fa2_only_manager_can_seed_inactive_pool" in
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_fa2_token 1000000n 0n in
  let dex_orig =
    deploy_dex
      (Test.Typed_address.to_address tok_orig.taddr)
      0n
      (other ()) in
  let () = Test.State.set_source (other ()) in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (Default_ ()) 1tez in
  assert_error
    test_name
    Dexter.error_ONLY_MANAGER_CAN_INITIALIZE_POOL
    result

let test_modified_fa2_activation_rejects_underfunded_reserves =
  let test_name = "test_modified_fa2_activation_rejects_underfunded_reserves" in
  let (dex_orig, _, _) = prepare_full_dex 1000000n 0n in
  let activate_param : Dexter.activate_pool =
    {
     expectedXtzPool = 1tez;
     expectedTokenPool = 1000001n;
     expectedLqtTotal = 1000000n;
    } in
  let activate_entrypoint : Dexter.activate_pool contract =
    Test.Typed_address.get_entrypoint "activate" dex_orig.taddr in
  let result =
    Test.Contract.transfer activate_entrypoint activate_param 0tez in
  let () =
    assert_error test_name Dexter.error_INVALID_INITIAL_RESERVES result in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if storage.active or storage.activationPending
  then failwith (test_name ^ ": failed activation changed lifecycle state")
  else ()

let test_modified_fa2_activation_accepts_donated_token_excess =
  let test_name =
    "test_modified_fa2_activation_accepts_donated_token_excess" in
  let (dex_orig, _, tok_orig) = prepare_full_dex 1000000n 0n in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let donation : FA2.transfer =
    [
      {
       from_ = src ();
       txs = [{to_ = dex_addr; token_id = 0n; amount = 1n}];
      }
    ] in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (Transfer donation) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let () = activate_dex dex_orig.taddr in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    not storage.active
    or storage.activationPending
    or storage.tokenPool <> 1000001n
  then failwith (test_name ^ ": donated excess did not remain in the pool")
  else ()

let test_modified_fa2_activation_verifies_lqt_total_supply =
  let test_name = "test_modified_fa2_activation_verifies_lqt_total_supply" in
  let (dex_orig, _, _) = prepare_full_dex 1000001n 0n in
  let activate_param : Dexter.activate_pool =
    {
     expectedXtzPool = 1tez;
     expectedTokenPool = 1000000n;
     expectedLqtTotal = 1000000n;
    } in
  let activate_entrypoint : Dexter.activate_pool contract =
    Test.Typed_address.get_entrypoint "activate" dex_orig.taddr in
  let result =
    Test.Contract.transfer activate_entrypoint activate_param 0tez in
  let () =
    assert_error test_name Dexter.error_LQT_TOTAL_MISMATCH result in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if storage.active or storage.activationPending
  then failwith (test_name ^ ": callback failure was not atomic")
  else ()

let test_modified_fa2_activation =
  let test_name = "test_modified_fa2_activation" in
  let (dex_orig, _, _) = setup_full_dex () in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    not storage.active
    or storage.activationPending
    or storage.xtzPool <> 1tez
    or storage.tokenPool <> 1000000n
    or storage.lqtTotal <> 1000000n
  then failwith (test_name ^ ": activation state mismatch")
  else ()

let assert_malformed_fa2_response_rejected
    (test_name : string)
    (response_mode : MalformedFA2.response_mode) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let token_storage : MalformedFA2.storage =
    {
     responseMode = response_mode;
     balance = 1000000n;
     wrongOwner = other ();
    } in
  let tok_orig =
    Test.Originate.contract
      (contract_of MalformedFA2)
      token_storage
      0tez in
  let dex_orig =
    deploy_dex
      (Test.Typed_address.to_address tok_orig.taddr)
      0n
      (other ()) in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (UpdateTokenPool ())
      0tez in
  let () =
    assert_error
      test_name
      Dexter.error_INVALID_FA2_BALANCE_RESPONSE
      result in
  let dex_storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if dex_storage.selfIsUpdatingTokenPool
  then failwith (test_name ^ ": failed callback did not backtrack")
  else ()

let test_modified_fa2_rejects_wrong_callback_owner =
  assert_malformed_fa2_response_rejected
    "test_modified_fa2_rejects_wrong_callback_owner"
    WrongOwner

let test_modified_fa2_rejects_wrong_callback_token_id =
  assert_malformed_fa2_response_rejected
    "test_modified_fa2_rejects_wrong_callback_token_id"
    WrongTokenId

let test_modified_fa2_rejects_extra_callback_result =
  assert_malformed_fa2_response_rejected
    "test_modified_fa2_rejects_extra_callback_result"
    ExtraResult

let test_modified_fa2_rejects_empty_callback_result =
  assert_malformed_fa2_response_rejected
    "test_modified_fa2_rejects_empty_callback_result"
    EmptyResult

let test_modified_fa2_nonzero_token_id_lifecycle =
  let test_name = "test_modified_fa2_nonzero_token_id_lifecycle" in
  let (dex_orig, _, _) = prepare_full_dex 1000000n 7n in
  let () = activate_dex dex_orig.taddr in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if storage.tokenId <> 7n or not storage.active
  then failwith (test_name ^ ": nonzero token ID was not preserved")
  else ()

let test_modified_fa2_cannot_activate_twice =
  let test_name = "test_modified_fa2_cannot_activate_twice" in
  let (dex_orig, _, _) = setup_full_dex () in
  let activate_param : Dexter.activate_pool =
    {
     expectedXtzPool = 1tez;
     expectedTokenPool = 1000000n;
     expectedLqtTotal = 1000000n;
    } in
  let activate_entrypoint : Dexter.activate_pool contract =
    Test.Typed_address.get_entrypoint "activate" dex_orig.taddr in
  let result =
    Test.Contract.transfer activate_entrypoint activate_param 0tez in
  assert_error test_name Dexter.error_POOL_ALREADY_ACTIVE result

let test_modified_fa2_complete_withdrawal_is_rejected =
  let test_name = "test_modified_fa2_complete_withdrawal_is_rejected" in
  let (dex_orig, _, _) = setup_full_dex () in
  let remove_param : Dexter.remove_liquidity =
    {
     to_ = src ();
     lqtBurned = 1000000n;
     minXtzWithdrawn = 1tez;
     minTokensWithdrawn = 1000000n;
     deadline = future;
    } in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (RemoveLiquidity remove_param)
      0tez in
  let () =
    assert_error
      test_name
      Dexter.error_MINIMUM_LQT_MUST_REMAIN_LOCKED
      result in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    storage.xtzPool <> 1tez
    or storage.tokenPool <> 1000000n
    or storage.lqtTotal <> 1000000n
    or not storage.active
  then failwith (test_name ^ ": rejected withdrawal changed pool state")
  else ()

let test_modified_fa2_one_sided_active_states_fail_closed =
  let test_name = "test_modified_fa2_one_sided_active_states_fail_closed" in
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_fa2_token 1000000n 0n in
  let base_storage =
    Dexter.build_storage
      {
       lqtTotal = 1000000n;
       manager = src ();
       tokenAddress = Test.Typed_address.to_address tok_orig.taddr;
       tokenId = 0n;
       protocol_fee_recipient = other ();
      } in
  let xtz_only_storage =
    {
     base_storage with
     active = true;
     xtzPool = 100tez;
    } in
  let xtz_only_orig =
    Test.Originate.contract
      (contract_of Dexter)
      xtz_only_storage
      100tez in
  let token_swap_param : Dexter.token_to_xtz =
    {
     to_ = src ();
     tokensSold = 1000n;
     minXtzBought = 0tez;
     deadline = future;
    } in
  let xtz_only_result =
    Test.Typed_address.transfer
      xtz_only_orig.taddr
      (TokenToXtz token_swap_param)
      0tez in
  let () =
    assert_error
      test_name
      Dexter.error_POOL_NOT_ACTIVE
      xtz_only_result in
  let token_only_storage =
    {
     base_storage with
     active = true;
     tokenPool = 1000000n;
    } in
  let token_only_orig =
    Test.Originate.contract
      (contract_of Dexter)
      token_only_storage
      0tez in
  let xtz_swap_param : Dexter.xtz_to_token =
    {
     to_ = src ();
     minTokensBought = 0n;
     deadline = future;
    } in
  let token_only_result =
    Test.Typed_address.transfer
      token_only_orig.taddr
      (XtzToToken xtz_swap_param)
      1tez in
  assert_error
    test_name
    Dexter.error_POOL_NOT_ACTIVE
    token_only_result

(* Immutable 25 bp LP + 5 bp protocol (997/1000 on gross input). *)
let test_modified_fa2_xtz_to_token_target_fees =
  let test_name = "test_modified_fa2_xtz_to_token_target_fees" in
  let (dex_orig, _, tok_orig) = setup_full_dex () in
  let swap_param : Dexter.xtz_to_token =
    {
     to_ = src ();
     minTokensBought = 499248n;
     deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (XtzToToken swap_param)
      1tez in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if
      storage.xtzPool <> 1999500mutez
      or storage.tokenPool <> 500752n
      or storage.lqtTotal <> 1000000n
      or storage.accumulated_protocol_fee_xtz <> 500mutez
    then failwith (test_name ^ ": XTZ fee accounting mismatch")
    else () in
  if fa2_balance tok_orig.taddr (src ()) <> 1000499248n
  then failwith (test_name ^ ": incorrect FA2 balance after swap")
  else ()

let test_modified_fa2_view_get_fee_bp =
  let test_name = "test_modified_fa2_view_get_fee_bp" in
  let (dex_orig, _, _) = setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : (nat * nat * nat) option =
    Tezos.View.call "get_fee_bp" () dex_address in
  match view_result with
    None -> failwith (test_name ^ ": get_fee_bp view failed")
  | Some (lp_fee, protocol_fee, total_fee) ->
      if lp_fee <> 25n or protocol_fee <> 5n or total_fee <> 30n
      then failwith (test_name ^ ": unexpected fee split")
      else ()

let test_modified_fa2_update_token_pool =
  let test_name = "test_modified_fa2_update_token_pool" in
  let (dex_orig, _, tok_orig) = setup_full_dex () in
  let token_id = 0n in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let transfer_param : FA2.transfer =
    [
      {
       from_ = src ();
       txs =
         [
           {
            to_ = dex_addr;
            token_id = token_id;
            amount = 1000n;
           }
         ];
      }
    ] in
  let _ : nat =
    Test.Typed_address.transfer_exn
      tok_orig.taddr
      (Transfer transfer_param)
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (UpdateTokenPool ())
      0tez in
  let storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    storage.xtzPool <> 1tez
    or storage.tokenPool <> 1001000n
    or storage.lqtTotal <> 1000000n
  then failwith (test_name ^ ": token pool did not reflect donation")
  else ()

let test_modified_fa2_xtz_fee_claim_preserves_lp_reserve =
  let test_name = "test_modified_fa2_xtz_fee_claim_preserves_lp_reserve" in
  let (dex_orig, _, _) = setup_full_dex () in
  let swap_param : Dexter.xtz_to_token =
    {
     to_ = src ();
     minTokensBought = 0n;
     deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (XtzToToken swap_param)
      1tez in
  let storage_after_swap : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if
      storage_after_swap.xtzPool <> 1999500mutez
      or storage_after_swap.accumulated_protocol_fee_xtz <> 500mutez
    then failwith (test_name ^ ": XTZ fee accounting mismatch")
    else () in
  let () = Test.State.set_source (other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ClaimProtocolFeeXtz ())
      0tez in
  let storage_after_claim : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    storage_after_claim.xtzPool <> storage_after_swap.xtzPool
    or storage_after_claim.accumulated_protocol_fee_xtz <> 0mutez
  then failwith (test_name ^ ": XTZ claim changed the LP reserve")
  else ()

let test_modified_fa2_token_fee_survives_resynchronization =
  let test_name = "test_modified_fa2_token_fee_survives_resynchronization" in
  let (dex_orig, _, tok_orig) = setup_full_dex () in
  let swap_param : Dexter.token_to_xtz =
    {
     to_ = src ();
     tokensSold = 1000000n;
     minXtzBought = 0tez;
     deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (TokenToXtz swap_param)
      0tez in
  let storage_after_swap : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if
      storage_after_swap.tokenPool <> 1999500n
      or storage_after_swap.accumulated_protocol_fee_token <> 500n
    then failwith (test_name ^ ": fee accounting mismatch after swap")
    else () in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (UpdateTokenPool ())
      0tez in
  let storage_after_update : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if
      storage_after_update.tokenPool <> 1999500n
      or storage_after_update.accumulated_protocol_fee_token <> 500n
    then failwith (test_name ^ ": fee accounting changed during synchronization")
    else () in
  let () = Test.State.set_source (other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ClaimProtocolFeeToken ())
      0tez in
  let storage_after_claim : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    storage_after_claim.accumulated_protocol_fee_token <> 0n
    or fa2_balance tok_orig.taddr (other ()) <> 500n
  then failwith (test_name ^ ": fee claim mismatch")
  else ()

let test_modified_fa2_liquidity_lifecycle_after_activation =
  let test_name = "test_modified_fa2_liquidity_lifecycle_after_activation" in
  let (dex_orig, lqt_orig, _) = setup_full_dex () in
  let add_param : Dexter.add_liquidity =
    {
     owner = src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (AddLiquidity add_param)
      1tez in
  let storage_after_add : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    if
      storage_after_add.xtzPool <> 2tez
      or storage_after_add.tokenPool <> 2000000n
      or storage_after_add.lqtTotal <> 2000000n
    then failwith (test_name ^ ": add-liquidity state mismatch")
    else () in
  let remove_param : Dexter.remove_liquidity =
    {
     to_ = src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (RemoveLiquidity remove_param)
      0tez in
  let storage_after_remove : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let lqt_storage : LQT.LQT.storage =
    Test.Typed_address.get_storage lqt_orig.taddr in
  if
    storage_after_remove.xtzPool <> 1500000mutez
    or storage_after_remove.tokenPool <> 1500000n
    or storage_after_remove.lqtTotal <> 1500000n
    or lqt_storage.total_supply <> 1500000n
  then failwith (test_name ^ ": remove-liquidity state mismatch")
  else ()

let test_modified_fa2_final_lp_cannot_cross_minimum_lqt =
  let test_name = "test_modified_fa2_final_lp_cannot_cross_minimum_lqt" in
  let (dex_orig, lqt_orig, _) = setup_full_dex () in
  let withdraw_to_floor : Dexter.remove_liquidity =
    {
      to_ = src ();
      lqtBurned = 999000n;
      minXtzWithdrawn = 999000mutez;
      minTokensWithdrawn = 999000n;
      deadline = future;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (RemoveLiquidity withdraw_to_floor)
      0tez in
  let pool_storage : Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  let lqt_storage : LQT.LQT.storage =
    Test.Typed_address.get_storage lqt_orig.taddr in
  let owner_lqt =
    match Big_map.find_opt (src ()) lqt_storage.tokens with
    | Some balance -> balance
    | None -> 0n in
  let () =
    if
      pool_storage.xtzPool <> 1000mutez
      or pool_storage.tokenPool <> 1000n
      or pool_storage.lqtTotal <> Dexter.minimum_lqt
      or lqt_storage.total_supply <> Dexter.minimum_lqt
      or owner_lqt <> Dexter.minimum_lqt
    then failwith (test_name ^ ": minimum state mismatch")
    else () in
  let cross_floor : Dexter.remove_liquidity =
    {
      to_ = src ();
      lqtBurned = 1n;
      minXtzWithdrawn = 0mutez;
      minTokensWithdrawn = 0n;
      deadline = future;
    } in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (RemoveLiquidity cross_floor)
      0tez in
  assert_error
    test_name
    Dexter.error_MINIMUM_LQT_MUST_REMAIN_LOCKED
    result
