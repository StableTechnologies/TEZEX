#import "../contracts/helpers/fa2_token.mligo" "FA2"
#import "./util_fa2_mod.mligo" "Util"

module Test = Test.Next

module Tezos = Tezos.Next

let test_fa2_setup =
  let test_name = "test_fa2_setup" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1tez 1000000n 1000000n;
    Util.assert_fa2_balance tok_orig.taddr test_name (Util.src ()) 1000000000n
  end

(* FA2 pool: immutable 25 bp LP + 5 bp protocol (997/1000 on gross input). *)
let test_fa2_xtz_to_token_target_fees =
  let test_name = "test_fa2_xtz_to_token_target_fees" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let swap_param : Util.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499248n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1999500mutez 500752n 1000000n;
    Util.assert_fa2_balance tok_orig.taddr test_name (Util.src ()) 1000499248n;
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 500mutez
  end

let test_fa2_view_get_fee_bp_target_fees =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : (nat * nat * nat) option = Tezos.View.call "get_fee_bp" () dex_address in
  match view_result with
    None -> failwith "FA2 get_fee_bp target fees view failed"
  | Some (lp_fee, protocol_fee, total_fee) ->
      begin
        Assert.assert (lp_fee = 25n);
        Assert.assert (protocol_fee = 5n);
        Assert.assert (total_fee = 30n)
      end

let test_fa2_update_token_pool =
  let test_name = "test_fa2_update_token_pool" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let token_id = 0n in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let transfer_param : FA2.transfer =
    [ { from_ = Util.src ();
        txs = [ { to_ = dex_addr; token_id = token_id; amount = 1000n } ] } ] in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  Util.assert_dex_state dex_orig.taddr test_name 1tez 1001000n 1000000n
