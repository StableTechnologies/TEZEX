#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter_mod.mligo" "DexterMod"

module Test = Test.Next

module Tezos = Tezos.Next

(* Account helpers *)
let other () = Test.Account.address 0n

let src () = Test.Account.address 1n

let delegate () = Test.Account.address 2n

(* Time constants *)
let past = ("1970-01-01T00:02:12Z" : timestamp)

let now = ("1970-01-01T00:05:12Z" : timestamp)

let future = ("1970-01-01T00:10:12Z" : timestamp)

(* Clean state before each test *)
let clean () =
  begin
    Test.State.reset 3n [10000000000tez; 10000000000tez; 10000000000tez]
  end

(*****************************************************************************)
(* Helper functions for contract deployment                                  *)
(*****************************************************************************)
let deploy_token (initial_balance : nat) (admin : address) =
  let tok_storage : LQT.LQT.storage =
    {
     tokens = (Big_map.literal [(src (), initial_balance)] : LQT.LQT.tokens);
     allowances = (Big_map.empty : LQT.LQT.allowances);
     admin = admin;
     total_supply = initial_balance;
     metadata = (Big_map.empty : (string, bytes) big_map);
     token_metadata =
       (Big_map.literal
          [
            (0n,
             {
              token_id = 0n;
              token_info =
                (Map.literal
                   [
                     ("name", Bytes.pack ("Test Token" : string));
                     ("symbol", Bytes.pack ("TTK" : string));
                     ("decimals", Bytes.pack ("18" : string))
                   ]
                 : (string, bytes) map)
             })
          ]
        : (nat, LQT.LQT.token_metadata_value) big_map)
    } in
  Test.Originate.contract (contract_of LQT.LQT) tok_storage 0tez

let deploy_dex
    (lqt_total : nat)
    (manager : address)
    (token_address : address)
    (xtz_amount : tez)
    (protocol_fee_bp : nat)
    (protocol_fee_recipient : address) =
  let dex_storage =
    DexterMod.Dexter.build_storage
      {
       lqtTotal = lqt_total;
       manager = manager;
       tokenAddress = token_address;
       protocol_fee_bp = protocol_fee_bp;
       protocol_fee_recipient = protocol_fee_recipient;
      } in
  Test.Originate.contract (contract_of DexterMod.Dexter) dex_storage xtz_amount

let deploy_lqt (lqt_amount : nat) (owner : address) (admin : address) =
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
              token_info =
                (Map.literal
                   [
                     ("name", Bytes.pack ("Liquidity Token" : string));
                     ("symbol", Bytes.pack ("LQT" : string));
                     ("decimals", Bytes.pack ("18" : string))
                   ]
                 : (string, bytes) map)
             })
          ]
        : (nat, LQT.LQT.token_metadata_value) big_map)
    } in
  Test.Originate.contract (contract_of LQT.LQT) lqt_storage 0tez

let setup_full_dex () =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_token 1001000000n (src ()) in
  let dex_orig =
    deploy_dex 1000000n (src ()) (Test.Typed_address.to_address tok_orig.taddr) 0tez 0n (src ()) in
  let lqt_orig = deploy_lqt 1000000n (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  let approve_param : LQT.LQT.approve =
    {
     spender = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Approve approve_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = src ();
     address_to = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  (dex_orig, lqt_orig, tok_orig)

let setup_full_dex_with_fee (protocol_fee_bp : nat) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_token 1001000000n (src ()) in
  let dex_orig =
    deploy_dex
      1000000n
      (src ())
      (Test.Typed_address.to_address tok_orig.taddr)
      0tez
      protocol_fee_bp
      (src ()) in
  let lqt_orig = deploy_lqt 1000000n (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  let approve_param : LQT.LQT.approve =
    {
     spender = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Approve approve_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = src ();
     address_to = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  (dex_orig, lqt_orig, tok_orig)

let setup_dex_with_updating_pool () =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let tok_orig = deploy_token 0n (src ()) in
  let dex_storage =
    DexterMod.Dexter.build_storage
      {
       lqtTotal = 1000000n;
       manager = src ();
       tokenAddress = Test.Typed_address.to_address tok_orig.taddr;
       protocol_fee_bp = 0n;
       protocol_fee_recipient = src ();
      } in
  let dex_storage = {dex_storage with selfIsUpdatingTokenPool = true} in
  let dex_orig =
    Test.Originate.contract (contract_of DexterMod.Dexter) dex_storage 0mutez in
  let lqt_orig = deploy_lqt 0n (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  (dex_orig, lqt_orig, tok_orig)

let setup_custom_dex (xtz_pool : tez) (token_pool : nat) (lqt_total : nat) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let initial_token_balance = token_pool * 1000n in
  let tok_orig = deploy_token initial_token_balance (src ()) in
  let dex_orig =
    deploy_dex
      lqt_total
      (src ())
      (Test.Typed_address.to_address tok_orig.taddr)
      0mutez
      0n
      (src ()) in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) xtz_pool in
  let lqt_orig = deploy_lqt lqt_total (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  let approve_param : LQT.LQT.approve =
    {
     spender = Test.Typed_address.to_address dex_orig.taddr;
     value = initial_token_balance
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Approve approve_param) 0tez in
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = src ();
     address_to = Test.Typed_address.to_address dex_orig.taddr;
     value = token_pool
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  (dex_orig, lqt_orig, tok_orig)

(*****************************************************************************)
(* Assertion helpers                                                         *)
(*****************************************************************************)
let assert_error (test_name : string) (error_code : nat) (result : test_exec_result) : unit =
  match result with
    Success _ ->
      let msg = test_name ^ ": expected error, got success" in
      failwith msg
  | Fail e ->
      (match e with
         Rejected (err, _) ->
           let error_code = Test.Michelson.eval error_code in
           if Test.Compare.eq err error_code
           then ()
           else
             let msg = test_name ^ ": wrong error code" in
             failwith msg
       | _ ->
           let msg = test_name ^ ": unexpected error type" in
           failwith msg)

let assert_dex_state
    (dex_taddr)
    (test_name : string)
    (xtz_pool : tez)
    (token_pool : nat)
    (lqt_total : nat) =
  let storage : DexterMod.Dexter.storage = Test.Typed_address.get_storage dex_taddr in
  let () =
    if storage.xtzPool <> xtz_pool
    then
      failwith
        (test_name
         ^ ": incorrect xtzPool, expected "
           ^ Test.String.show (xtz_pool / 1mutez)
             ^ "mutez, got: " ^ Test.String.show (storage.xtzPool / 1mutez))
    else () in
  let () =
    if storage.tokenPool <> token_pool
    then failwith (test_name ^ ": incorrect tokenPool, expected: " ^ Test.String.show token_pool ^ ", got: " ^ Test.String.show storage.tokenPool)
    else () in
  let () =
    if storage.lqtTotal <> lqt_total
    then failwith (test_name ^ ": incorrect lqtTotal, expected: " ^ Test.String.show lqt_total ^ ", got: " ^ Test.String.show storage.lqtTotal)
    else () in
  ()

let assert_accumulated_fee_xtz (dex_taddr) (test_name : string) (expected : tez) =
  let storage : DexterMod.Dexter.storage = Test.Typed_address.get_storage dex_taddr in
  if storage.accumulated_protocol_fee_xtz <> expected
  then
    failwith
      (test_name
       ^ ": incorrect accumulated_protocol_fee_xtz, expected "
         ^ Test.String.show (expected / 1mutez)
           ^ "mutez, got: "
             ^ Test.String.show (storage.accumulated_protocol_fee_xtz / 1mutez))
  else ()

let assert_accumulated_fee_token (dex_taddr) (test_name : string) (expected : nat) =
  let storage : DexterMod.Dexter.storage = Test.Typed_address.get_storage dex_taddr in
  if storage.accumulated_protocol_fee_token <> expected
  then
    failwith
      (test_name
       ^ ": incorrect accumulated_protocol_fee_token, expected "
         ^ Test.String.show expected
           ^ ", got: "
             ^ Test.String.show storage.accumulated_protocol_fee_token)
  else ()

let assert_token_balance (tok_taddr) (test_name : string) (addr : address) (expected : nat) =
  let storage : LQT.LQT.storage = Test.Typed_address.get_storage tok_taddr in
  let balance =
    match Big_map.find_opt addr storage.tokens with
      None -> 0n
    | Some b -> b in
  if balance <> expected
  then
    failwith
      (test_name
       ^ ": incorrect token balance, expected: "
         ^ (Test.String.show expected) ^ ", got: " ^ (Test.String.show balance))
  else ()
