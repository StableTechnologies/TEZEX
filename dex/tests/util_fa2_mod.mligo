#include "../contracts/helpers/dexter_fa2_mod.mligo"
#import "../contracts/helpers/fa2_token.mligo" "FA2"
#import "../contracts/lqt_fa12.mligo" "LQT"

module Test = Test.Next

module Tezos = Tezos.Next

let other () = Test.Account.address 0n

let src () = Test.Account.address 1n

let delegate () = Test.Account.address 2n

let past = ("1970-01-01T00:02:12Z" : timestamp)

let now = ("1970-01-01T00:05:12Z" : timestamp)

let future = ("1970-01-01T00:10:12Z" : timestamp)

let clean () =
  Test.State.reset 3n [10000000000tez; 10000000000tez; 10000000000tez]

let deploy_fa2_token (initial_balance : nat) (token_id : nat) =
  let storage : FA2.storage = FA2.make_storage (src ()) initial_balance token_id in
  Test.Originate.contract (contract_of FA2) storage 0tez

let deploy_dex
    (lqt_total : nat)
    (manager : address)
    (token_address : address)
    (token_id : nat)
    (xtz_amount : tez)
    (lp_fee_bp : nat)
    (protocol_fee_bp : nat)
    (protocol_fee_recipient : address) =
  let dex_storage =
    Dexter.build_storage
      {
       lqtTotal = lqt_total;
       manager = manager;
       tokenAddress = token_address;
       tokenId = token_id;
       lp_fee_bp = lp_fee_bp;
       protocol_fee_bp = protocol_fee_bp;
       protocol_fee_recipient = protocol_fee_recipient;
      } in
  Test.Originate.contract (contract_of Dexter) dex_storage xtz_amount

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

let setup_full_dex_with_fees (lp_fee_bp : nat) (protocol_fee_bp : nat) =
  let () = clean () in
  let () = Test.State.set_source (src ()) in
  let token_id = 0n in
  let tok_orig = deploy_fa2_token 1001000000n token_id in
  let tok_addr = Test.Typed_address.to_address tok_orig.taddr in
  let dex_orig =
    deploy_dex
      1000000n
      (src ())
      tok_addr
      token_id
      0tez
      lp_fee_bp
      protocol_fee_bp
      (src ())
  in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let lqt_orig = deploy_lqt 1000000n (src ()) dex_addr in
  let lqt_addr = Test.Typed_address.to_address lqt_orig.taddr in
  let add_op : FA2.update_operators =
    [ Add_operator {owner = src (); operator = dex_addr; token_id = token_id} ] in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (Update_operators add_op) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  let transfer_param : FA2.transfer =
  [ { from_ = src ();
      txs = [ { to_ = dex_addr; token_id = token_id; amount = 1000000n } ] } ] in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetLqtAddress lqt_addr) 0tez in
  (dex_orig, lqt_orig, tok_orig)

let assert_dex_state
    (dex_taddr)
    (test_name : string)
    (xtz_pool : tez)
    (token_pool : nat)
    (lqt_total : nat) =
  let storage : Dexter.storage = Test.Typed_address.get_storage dex_taddr in
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

let assert_fa2_balance
    (tok_taddr)
    (test_name : string)
    (addr : address)
    (expected : nat) =
  let storage : FA2.storage = Test.Typed_address.get_storage tok_taddr in
  let balance_ =
    match Big_map.find_opt addr storage.ledger with
      None -> 0n
    | Some b -> b in
  if balance_ <> expected
  then
    failwith
      (test_name
       ^ ": incorrect FA2 balance, expected: "
         ^ Test.String.show expected
           ^ ", got: "
             ^ Test.String.show balance_)
  else ()

let assert_accumulated_fee_xtz (dex_taddr) (test_name : string) (expected : tez) =
  let storage : Dexter.storage = Test.Typed_address.get_storage dex_taddr in
  if storage.accumulated_protocol_fee_xtz <> expected
  then
    failwith
      (test_name
       ^ ": incorrect accumulated_protocol_fee_xtz, expected "
         ^ Test.String.show (expected / 1mutez)
           ^ "mutez, got: "
             ^ Test.String.show (storage.accumulated_protocol_fee_xtz / 1mutez))
  else ()
