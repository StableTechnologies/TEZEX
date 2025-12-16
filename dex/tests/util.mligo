#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter.mligo" "Dexter"

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
(* Helper functions for contract deployment                                 *)
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
  Test.Originate.contract (contract_of  LQT.LQT) tok_storage 0tez

let deploy_dex (lqt_total : nat) (manager : address) (token_address : address) (xtz_amount : tez) =
  let dex_storage =
    Dexter.Dexter.build_storage
      {
       lqtTotal = lqt_total;
       manager = manager;
       tokenAddress = token_address
      } in
  Test.Originate.contract (contract_of  Dexter.Dexter) dex_storage xtz_amount

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
  Test.Originate.contract (contract_of  LQT.LQT) lqt_storage 0tez

let setup_full_dex () =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  (* Deploy token contract *)
  let tok_orig = deploy_token 1001000000n (src ()) in
  (* Deploy DEX *)
  let dex_orig = deploy_dex 1000000n (src ()) (Test.Typed_address.to_address tok_orig.taddr) 0tez in
  (* Deploy LQT *)
  let lqt_orig = deploy_lqt 1000000n (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  (* Approve DEX to spend tokens *)
  let approve_param : LQT.LQT.approve =
    {
     spender = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Approve approve_param) 0tez in
  (* Add initial liquidity to DEX *)
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  (* Transfer tokens to DEX *)
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = src ();
     address_to = Test.Typed_address.to_address dex_orig.taddr;
     value = 1000000n
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  (* Update token pool *)
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  (* Set LQT address *)
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  (dex_orig, lqt_orig, tok_orig)

let setup_dex_with_updating_pool () =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  (* Deploy token contract *)
  let tok_orig = deploy_token 0n (src ()) in
  (* Deploy DEX with selfIsUpdatingTokenPool = true *)
  let dex_storage =
    Dexter.Dexter.build_storage
      {
       lqtTotal = 1000000n;
       manager = src ();
       tokenAddress = Test.Typed_address.to_address tok_orig.taddr
      } in
  let dex_storage = {dex_storage with selfIsUpdatingTokenPool = true} in
  let dex_orig = Test.Originate.contract (contract_of  Dexter.Dexter) dex_storage 0mutez in
  (* Deploy LQT *)
  let lqt_orig = deploy_lqt 0n (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  (dex_orig, lqt_orig, tok_orig)

(* Helper to setup DEX with custom pool sizes *)
let setup_custom_dex (xtz_pool : tez) (token_pool : nat) (lqt_total : nat) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  (* Deploy token contract with enough balance *)
  let initial_token_balance = token_pool * 1000n in
  let tok_orig = deploy_token initial_token_balance (src ()) in
  (* Originate with 0mutez *)
  let dex_orig = deploy_dex lqt_total (src ()) (Test.Typed_address.to_address tok_orig.taddr) 0mutez in
  (* Deposit XTZ to DEX using Default_ entrypoint *)
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) xtz_pool in
  (* Deploy LQT *)
  let lqt_orig = deploy_lqt lqt_total (src ()) (Test.Typed_address.to_address dex_orig.taddr) in
  (* Set LQT address in DEX *)
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  (* Approve DEX to spend tokens *)
  let approve_param : LQT.LQT.approve =
    {
     spender = Test.Typed_address.to_address dex_orig.taddr;
     value = initial_token_balance
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Approve approve_param) 0tez in
  (* Transfer tokens to DEX to match tokenPool *)
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = src ();
     address_to = Test.Typed_address.to_address dex_orig.taddr;
     value = token_pool
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  (dex_orig, lqt_orig, tok_orig)

// (*****************************************************************************)
// (* Assertion helpers                                                         *)
// (*****************************************************************************)
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
  let storage : Dexter.Dexter.storage = Test.Typed_address.get_storage dex_taddr in
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
    then failwith (test_name ^ ": incorrect tokenPool")
    else () in
  let () =
    if storage.lqtTotal <> lqt_total
    then failwith (test_name ^ ": incorrect lqtTotal")
    else () in
  ()

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
