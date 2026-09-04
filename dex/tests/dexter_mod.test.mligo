#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter_mod.mligo" "DexterMod"
#import "./util_mod.mligo" "Util"

module Test = Test.Next

module Tezos = Tezos.Next

let assert_some_address (expected : address) (actual : address option) : unit =
  match actual with
  | Some value -> Assert.assert (value = expected)
  | None -> failwith "expected an address"

let assert_no_address (actual : address option) : unit =
  match actual with
  | None -> ()
  | Some _ -> failwith "expected no address"

(*****************************************************************************)
(* Setup test                                                                *)
(*****************************************************************************)
let test_setup =
  let test_name = "test_setup" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1tez 1000000n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000000000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n
  end

let test_activation_accepts_donated_token_excess =
  let test_name = "test_activation_accepts_donated_token_excess" in
  let () = Util.clean () in
  let () = Test.State.set_source (Util.src ()) in
  let tok_orig = Util.deploy_token 1001000001n (Util.src ()) in
  let tok_addr = Test.Typed_address.to_address tok_orig.taddr in
  let dex_orig =
    Util.deploy_dex 1000000n (Util.src ()) tok_addr 0tez (Util.src ()) in
  let dex_addr = Test.Typed_address.to_address dex_orig.taddr in
  let lqt_orig = Util.deploy_lqt 1000000n (Util.src ()) dex_addr in
  let transfer_param : LQT.LQT.transfer =
    {
     address_from = Util.src ();
     address_to = dex_addr;
     value = 1000001n;
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (SetLqtAddress (Test.Typed_address.to_address lqt_orig.taddr))
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (Transfer transfer_param) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let () = Util.activate_dex dex_orig.taddr 1tez 1000000n 1000000n in
  let storage : DexterMod.Dexter.storage =
    Test.Typed_address.get_storage dex_orig.taddr in
  if
    not storage.active
    or storage.activationPending
    or storage.tokenPool <> 1000001n
  then failwith (test_name ^ ": donated excess did not remain in the pool")
  else ()

(*****************************************************************************)
(* Add liquidity tests                                                       *)
(*****************************************************************************)
let test_add_liquidity =
  let test_name = "test_add_liquidity" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let add_liq_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 2tez 2000000n 2000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999000000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 2000000n
  end

let test_add_liquidity_error_deadline =
  let test_name = "test_add_liquidity_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.past
    } in
  let () = Test.State.bake_until 5n in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_add_liquidity_error_max_tokens =
  let test_name = "test_add_liquidity_error_max_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 999999n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_MAX_TOKENS_DEPOSITED_MUST_BE_GREATER_THAN_OR_EQUAL_TO_TOKENS_DEPOSITED
    result

let test_add_liquidity_error_min_lqt =
  let test_name = "test_add_liquidity_error_min_lqt" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000001n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_LQT_MINTED_MUST_BE_GREATER_THAN_MIN_LQT_MINTED
    result

let test_add_liquidity_error_updating_pool =
  let test_name = "test_add_liquidity_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let add_liq_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(*****************************************************************************)
(* Remove liquidity tests                                                    *)
(*****************************************************************************)
let test_remove_liquidity =
  let test_name = "test_remove_liquidity" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let remove_liq_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 500000mutez 500000n 500000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000500000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 500000n
  end

let test_remove_liquidity_error_deadline =
  let test_name = "test_remove_liquidity_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_remove_liquidity_error_min_xtz =
  let test_name = "test_remove_liquidity_error_min_xtz" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500001mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_AMOUNT_OF_XTZ_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_WITHDRAWN
    result

let test_remove_liquidity_error_min_tokens =
  let test_name = "test_remove_liquidity_error_min_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500001n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_AMOUNT_OF_TOKENS_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_WITHDRAWN
    result

let test_remove_liquidity_error_amount =
  let test_name = "test_remove_liquidity_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

(*****************************************************************************)
(* XTZ to Token tests                                                        *)
(*****************************************************************************)

(* A 1 tez swap is priced at 30 bp total. Of the gross input, 500 mutez
   (5 bp) accrues to the protocol and the remaining 25 bp stays with LPs. *)
let test_xtz_to_token =
  let test_name = "test_xtz_to_token" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499248n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1999500mutez 500752n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000499248n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n;
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 500mutez
  end

let test_xtz_to_token_error_deadline =
  let test_name = "test_xtz_to_token_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499248n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_xtz_to_token_error_min_tokens =
  let test_name = "test_xtz_to_token_error_min_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499249n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_TOKENS_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_BOUGHT
    result

let test_xtz_to_token_error_updating_pool =
  let test_name = "test_xtz_to_token_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 1n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(* The protocol share is not charged on top of the 30 bp curve fee. *)
let test_xtz_to_token_with_fee =
  let test_name = "test_xtz_to_token_with_fee" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 1n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1999500mutez 500752n 1000000n;
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 500mutez
  end

(* minTokensBought is checked against the exact 30 bp quote. *)
let test_xtz_to_token_min_tokens_checked_after_fee =
  let test_name = "test_xtz_to_token_min_tokens_checked_after_fee" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499249n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_TOKENS_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_BOUGHT
    result

(*****************************************************************************)
(* Token to XTZ tests                                                        *)
(*****************************************************************************)

(* A 500,000 token swap is priced at 30 bp total and records 250 tokens
   (5 bp) for the protocol. *)
let test_token_to_xtz =
  let test_name = "test_token_to_xtz" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 667335mutez 1499750n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999500000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n;
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 0mutez;
    Util.assert_accumulated_fee_token dex_orig.taddr test_name 250n
  end

let test_token_to_xtz_error_deadline =
  let test_name = "test_token_to_xtz_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_token_to_xtz_error_min_xtz =
  let test_name = "test_token_to_xtz_error_min_xtz" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332666mutez;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_XTZ_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_BOUGHT
    result

let test_token_to_xtz_error_amount =
  let test_name = "test_token_to_xtz_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_token_to_xtz_error_updating_pool =
  let test_name = "test_token_to_xtz_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 1mutez;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(* The 5 bp protocol allocation is removed from reserve accounting after the
   gross input has been priced at the full 30 bp. *)
let test_token_to_xtz_with_fee =
  let test_name = "test_token_to_xtz_with_fee" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 1mutez;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 667335mutez 1499750n 1000000n;
    // No XTZ fee - fee is collected in tokens
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 0mutez;
    Util.assert_accumulated_fee_token dex_orig.taddr test_name 250n
  end

(* minXtzBought is checked against the exact 30 bp quote. *)
let test_token_to_xtz_min_xtz_checked_after_fee =
  let test_name = "test_token_to_xtz_min_xtz_checked_after_fee" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332666mutez;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_XTZ_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_BOUGHT
    result

(*****************************************************************************)
(* Default entrypoint tests                                                  *)
(*****************************************************************************)
let test_default =
  let test_name = "test_default" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 2tez 1000000n 1000000n;
    Assert.assert (Test.Typed_address.get_balance dex_orig.taddr = 2tez)
  end

let test_default_error_updating_pool =
  let test_name = "test_default_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result = Test.Typed_address.transfer dex_orig.taddr (Default_ ()) 1tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(*****************************************************************************)
(* Set baker tests                                                           *)
(*****************************************************************************)
let test_set_baker =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : DexterMod.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetBaker set_baker_param) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert storage.freezeBaker

let test_set_baker_error_amount =
  let test_name = "test_set_baker_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : DexterMod.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_set_baker_error_not_manager =
  let test_name = "test_set_baker_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let set_baker_param : DexterMod.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_ONLY_MANAGER_CAN_SET_BAKER result

let test_set_baker_error_frozen =
  let test_name = "test_set_baker_error_frozen" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : DexterMod.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetBaker set_baker_param) 0tez in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_BAKER_PERMANENTLY_FROZEN result

(*****************************************************************************)
(* Two-step manager and emergency-pause tests                                *)
(*****************************************************************************)
let test_manager_two_step_handoff =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_manager = Util.other () in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeManager new_manager)
      0tez in
  let proposed = Test.Typed_address.get_storage dex_orig.taddr in
  let () = Assert.assert (proposed.manager = Util.src ()) in
  let () = Assert.assert proposed.paused in
  let () = assert_some_address new_manager proposed.pending_manager in
  let () = Test.State.set_source new_manager in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (AcceptManager ()) 0tez in
  let accepted = Test.Typed_address.get_storage dex_orig.taddr in
  begin
    Assert.assert (accepted.manager = new_manager);
    Assert.assert accepted.paused;
    assert_no_address accepted.pending_manager
  end

let test_manager_handoff_can_be_cancelled =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeManager (Util.other ()))
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (CancelManagerTransfer ())
      0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  assert_no_address storage.pending_manager

let test_manager_error_amount =
  let test_name = "test_manager_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (ProposeManager (Util.other ()))
      1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_manager_error_not_manager =
  let test_name = "test_manager_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (ProposeManager (Util.src ()))
      0tez in
  Util.assert_error test_name DexterMod.Dexter.error_ONLY_MANAGER_CAN_SET_MANAGER result

let test_manager_error_not_pending_manager =
  let test_name = "test_manager_error_not_pending_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (AcceptManager ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_PENDING_MANAGER_CAN_ACCEPT
    result

let test_pending_manager_must_accept_before_unpause =
  let test_name = "test_pending_manager_must_accept_before_unpause" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_manager = Util.other () in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetPaused true) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeManager new_manager)
      0tez in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetPaused false) 0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_PENDING_MANAGER_MUST_ACCEPT
      result in
  let () = Test.State.set_source new_manager in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (AcceptManager ()) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetPaused false) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (not storage.paused)

let test_pending_protocol_fee_recipient_must_accept_before_unpause =
  let test_name =
    "test_pending_protocol_fee_recipient_must_accept_before_unpause" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_recipient = Util.other () in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetPaused true) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeProtocolFeeRecipient new_recipient)
      0tez in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetPaused false) 0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_PENDING_PROTOCOL_FEE_RECIPIENT_MUST_ACCEPT
      result in
  let () = Test.State.set_source new_recipient in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (AcceptProtocolFeeRecipient ())
      0tez in
  let () = Test.State.set_source (Util.src ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetPaused false) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (not storage.paused)

let test_pause_blocks_risk_increasing_actions_but_preserves_withdrawals =
  let test_name =
    "test_pause_blocks_risk_increasing_actions_but_preserves_withdrawals" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (SetPaused true) 0tez in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {to_ = Util.src (); minTokensBought = 0n; deadline = Util.future} in
  let swap_result =
    Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  let () =
    Util.assert_error test_name DexterMod.Dexter.error_POOL_PAUSED swap_result in
  let token_swap_param : DexterMod.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 1000n;
     minXtzBought = 0tez;
     deadline = Util.future
    } in
  let token_swap_result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (TokenToXtz token_swap_param)
      0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_POOL_PAUSED
      token_swap_result in
  let routed_swap_param : DexterMod.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 0n;
     to_ = Util.src ();
     tokensSold = 1000n;
     deadline = Util.future
    } in
  let routed_swap_result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (TokenToToken routed_swap_param)
      0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_POOL_PAUSED
      routed_swap_result in
  let add_param : DexterMod.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 0n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let add_result =
    Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_param) 1tez in
  let () =
    Util.assert_error test_name DexterMod.Dexter.error_POOL_PAUSED add_result in
  let default_result =
    Test.Typed_address.transfer dex_orig.taddr (Default_ ()) 1tez in
  let () =
    Util.assert_error test_name DexterMod.Dexter.error_POOL_PAUSED default_result in
  let update_result =
    Test.Typed_address.transfer dex_orig.taddr (UpdateTokenPool ()) 0tez in
  let () =
    Util.assert_error test_name DexterMod.Dexter.error_POOL_PAUSED update_result in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let quote : nat option =
    Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let () =
    match quote with
    | Some quoted_tokens ->
        if quoted_tokens = 0n then ()
        else failwith (test_name ^ ": paused quote should be zero")
    | _ -> failwith (test_name ^ ": paused quote should be zero") in
  let remove_param : DexterMod.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 1000n;
     minXtzWithdrawn = 0tez;
     minTokensWithdrawn = 0n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (RemoveLiquidity remove_param)
      0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  begin
    Assert.assert storage.paused;
    Assert.assert (storage.lqtTotal = 999000n)
  end

let test_set_pause_error_not_manager =
  let test_name = "test_set_pause_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetPaused true) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_MANAGER_CAN_SET_PAUSE
    result

(*****************************************************************************)
(* Set LQT address tests                                                     *)
(*****************************************************************************)
let test_set_lqt_address_error_amount =
  let test_name = "test_set_lqt_address_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_lqt = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetLqtAddress new_lqt) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_set_lqt_address_error_already_set =
  let test_name = "test_set_lqt_address_error_already_set" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_lqt = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (SetLqtAddress new_lqt) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_LQT_ADDRESS_ALREADY_SET result

(*****************************************************************************)
(* Update token pool tests                                                   *)
(*****************************************************************************)
let test_update_token_pool =
  let test_name = "test_update_token_pool" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let mintOrBurn_param : LQT.LQT.mintOrBurn =
    {
     quantity = -1;
     target = Test.Typed_address.to_address dex_orig.taddr
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn tok_orig.taddr (MintOrBurn mintOrBurn_param) 0tez in
  let () = Util.assert_dex_state dex_orig.taddr test_name 1tez 1000000n 1000000n in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  Util.assert_dex_state dex_orig.taddr test_name 1tez 999999n 1000000n

let test_update_token_pool_error_amount =
  let test_name = "test_update_token_pool_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (UpdateTokenPool ()) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_update_token_pool_error_reentrance =
  let test_name = "test_update_token_pool_error_reentrance" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (UpdateTokenPool ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_UNEXPECTED_REENTRANCE_IN_UPDATE_TOKEN_POOL
    result

(*****************************************************************************)
(* Token to Token tests                                                      *)
(*****************************************************************************)
let test_token_to_token =
  let test_name = "test_token_to_token" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497914n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToToken swap_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 999834mutez 1001836n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999997914n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n;
    Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 166mutez;
    Util.assert_accumulated_fee_token dex_orig.taddr test_name 250n
  end

let test_token_to_token_error_amount =
  let test_name = "test_token_to_token_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497997n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToToken swap_param) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_token_to_token_error_deadline =
  let test_name = "test_token_to_token_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497997n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 1n in
  let result =
    Test.Typed_address.transfer dex_orig.taddr (TokenToToken swap_param) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

(*****************************************************************************)
(* Two-step protocol-fee recipient tests                                     *)
(*****************************************************************************)
let test_protocol_fee_recipient_two_step_handoff =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_recipient = Util.other () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    {to_ = Util.src (); minTokensBought = 1n; deadline = Util.future} in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (XtzToToken swap_param)
      1tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeProtocolFeeRecipient new_recipient)
      0tez in
  let proposed = Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    Assert.assert (proposed.protocol_fee_recipient = Util.src ()) in
  let () = Assert.assert proposed.paused in
  let () =
    assert_some_address
      new_recipient
      proposed.pending_protocol_fee_recipient in
  let () = Test.State.set_source new_recipient in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (AcceptProtocolFeeRecipient ())
      0tez in
  let accepted = Test.Typed_address.get_storage dex_orig.taddr in
  let () =
    begin
      Assert.assert (accepted.protocol_fee_recipient = new_recipient);
      assert_no_address accepted.pending_protocol_fee_recipient;
      Assert.assert (accepted.accumulated_protocol_fee_xtz = 500mutez)
    end in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ClaimProtocolFeeXtz ())
      0tez in
  let claimed = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (claimed.accumulated_protocol_fee_xtz = 0mutez)

let test_protocol_fee_recipient_handoff_can_be_cancelled =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.other ()))
      0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (CancelProtocolFeeRecipient ())
      0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  assert_no_address storage.pending_protocol_fee_recipient

let test_protocol_fee_recipient_error_not_manager =
  let test_name = "test_protocol_fee_recipient_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.src ()))
      0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_MANAGER_CAN_SET_PROTOCOL_FEE_RECIPIENT
    result

let test_protocol_fee_recipient_error_not_pending_recipient =
  let test_name = "test_protocol_fee_recipient_error_not_pending_recipient" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (AcceptProtocolFeeRecipient ())
      0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_PENDING_PROTOCOL_FEE_RECIPIENT_CAN_ACCEPT
    result

let test_protocol_fee_recipient_error_amount =
  let test_name = "test_protocol_fee_recipient_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.other ()))
      1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_protocol_fee_recipient_error_updating_pool =
  let test_name = "test_protocol_fee_recipient_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.other ()))
      0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(*****************************************************************************)
(* claimProtocolFeeXtz tests                                                 *)
(*****************************************************************************)

(* Basic XTZ fee claim after xtzToToken swap: 5 bp of 1 tez = 500 mutez. *)
let test_claim_protocol_fee_xtz =
  let test_name = "test_claim_protocol_fee_xtz" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  let () = Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 500mutez in
  let balance_before = Test.Typed_address.get_balance dex_orig.taddr in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  let balance_after = Test.Typed_address.get_balance dex_orig.taddr in
  begin
    Assert.assert (storage.accumulated_protocol_fee_xtz = 0mutez);
    Assert.assert (balance_before = balance_after + 500mutez)
  end

(* XTZ fee accumulates correctly over multiple swaps *)
let test_claim_protocol_fee_xtz_multiple_swaps =
  let test_name = "test_claim_protocol_fee_xtz_multiple_swaps" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let xtz_swap : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  // First swap: floor(1_000_000 * 5 / 10_000) = 500 mutez
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken xtz_swap) 1tez in
  // Second swap: floor(500_000 * 5 / 10_000) = 250 mutez
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken xtz_swap) 500000mutez in
  let () = Util.assert_accumulated_fee_xtz dex_orig.taddr test_name 750mutez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.accumulated_protocol_fee_xtz = 0mutez)

(* Only the designated recipient can claim XTZ fee *)
let test_claim_protocol_fee_xtz_error_not_recipient =
  let test_name = "test_claim_protocol_fee_xtz_error_not_recipient" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  let () = Test.State.set_source (Util.other ()) in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE
    result

(* Cannot claim XTZ fee when nothing has been accumulated *)
let test_claim_protocol_fee_xtz_error_nothing_to_claim =
  let test_name = "test_claim_protocol_fee_xtz_error_nothing_to_claim" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_NO_PROTOCOL_FEE_TO_CLAIM result

(* Cannot send XTZ when claiming *)
let test_claim_protocol_fee_xtz_error_amount =
  let test_name = "test_claim_protocol_fee_xtz_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

(* Double claim: second attempt must fail after first succeeds *)
let test_claim_protocol_fee_xtz_double_claim =
  let test_name = "test_claim_protocol_fee_xtz_double_claim" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_NO_PROTOCOL_FEE_TO_CLAIM result

(* Updating pool blocks XTZ fee claim *)
let test_claim_protocol_fee_xtz_error_updating_pool =
  let test_name = "test_claim_protocol_fee_xtz_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(* Accepted recipient changes apply to already-accrued XTZ fees. *)
let test_claim_xtz_fee_after_recipient_change =
  let test_name = "test_claim_xtz_fee_after_recipient_change" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.xtz_to_token =
    { to_ = Util.src (); minTokensBought = 1n; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  // Propose and accept other () as the new recipient.
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.other ()))
      0tez in
  let () = Test.State.set_source (Util.other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (AcceptProtocolFeeRecipient ())
      0tez in
  // Original src () can no longer claim
  let () = Test.State.set_source (Util.src ()) in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE
      result in
  // New recipient other () can claim
  let () = Test.State.set_source (Util.other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeXtz ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.accumulated_protocol_fee_xtz = 0mutez)

(*****************************************************************************)
(* claimProtocolFeeToken tests                                               *)
(*****************************************************************************)

(* Basic token fee claim: 5 bp of 500,000 tokens = 250 tokens. *)
let test_claim_protocol_fee_token =
  let test_name = "test_claim_protocol_fee_token" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  let () = Util.assert_accumulated_fee_token dex_orig.taddr test_name 250n in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  begin
    Assert.assert (storage.accumulated_protocol_fee_token = 0n) ; 
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999500250n
  end

(* Token fee accumulates correctly over multiple swaps *)
let test_claim_protocol_fee_token_multiple_swaps =
  let test_name = "test_claim_protocol_fee_token_multiple_swaps" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  // First swap: fee = floor(500_000 * 5 / 10_000) = 250 tokens
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  // Second swap: fee = 250 tokens
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  let () = Util.assert_accumulated_fee_token dex_orig.taddr test_name 500n in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  begin
    Assert.assert (storage.accumulated_protocol_fee_token = 0n) ;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999000500n
  end
(* Only the designated recipient can claim token fee *)
let test_claim_protocol_fee_token_error_not_recipient =
  let test_name = "test_claim_protocol_fee_token_error_not_recipient" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  let () = Test.State.set_source (Util.other ()) in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE
    result

(* Cannot claim token fee when nothing has been accumulated *)
let test_claim_protocol_fee_token_error_nothing_to_claim =
  let test_name = "test_claim_protocol_fee_token_error_nothing_to_claim" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_NO_PROTOCOL_FEE_TO_CLAIM result

(* Cannot send XTZ when claiming token fee *)
let test_claim_protocol_fee_token_error_amount =
  let test_name = "test_claim_protocol_fee_token_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 1tez in
  Util.assert_error test_name DexterMod.Dexter.error_AMOUNT_MUST_BE_ZERO result

(* Double claim: second attempt must fail after first succeeds *)
let test_claim_protocol_fee_token_double_claim =
  let test_name = "test_claim_protocol_fee_token_double_claim" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  Util.assert_error test_name DexterMod.Dexter.error_NO_PROTOCOL_FEE_TO_CLAIM result

(* Updating pool blocks token fee claim *)
let test_claim_protocol_fee_token_error_updating_pool =
  let test_name = "test_claim_protocol_fee_token_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE
    result

(* Accepted recipient changes apply to already-accrued token fees. *)
let test_claim_token_fee_after_recipient_change =
  let test_name = "test_claim_token_fee_after_recipient_change" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : DexterMod.Dexter.token_to_xtz =
    { to_ = Util.src (); tokensSold = 500000n; minXtzBought = 1mutez; deadline = Util.future } in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  // Propose and accept other () as the new recipient.
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (ProposeProtocolFeeRecipient (Util.other ()))
      0tez in
  let () = Test.State.set_source (Util.other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (AcceptProtocolFeeRecipient ())
      0tez in
  // Original src () can no longer claim
  let () = Test.State.set_source (Util.src ()) in
  let result = Test.Typed_address.transfer dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  let () =
    Util.assert_error
      test_name
      DexterMod.Dexter.error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE
      result in
  // New recipient other () can claim
  let () = Test.State.set_source (Util.other ()) in
  let _ : nat =
    Test.Typed_address.transfer_exn dex_orig.taddr (ClaimProtocolFeeToken ()) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.accumulated_protocol_fee_token = 0n)

(*****************************************************************************)
(* View tests                                                                *)
(*****************************************************************************)
let test_view_get_reserves =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : (nat * nat) option =
    Tezos.View.call "get_reserves" () dex_address in
  match view_result with
    None -> failwith "get_reserves view failed"
  | Some (tez_pool, token_pool) ->
      begin
        Assert.assert (tez_pool = 1000000n);
        Assert.assert (token_pool = 1000000n)
      end

let test_view_get_lqt_total =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option = Tezos.View.call "get_lqt_total" () dex_address in
  match view_result with
    None -> failwith "get_lqt_total view failed"
  | Some lqt_total -> Assert.assert (lqt_total = 1000000n)

let test_view_get_fee_bp =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : (nat * nat * nat) option = Tezos.View.call "get_fee_bp" () dex_address in
  match view_result with
    None -> failwith "get_fee_bp view failed"
  | Some (lp_fee, protocol_fee, total_fee) ->
      begin
        Assert.assert (lp_fee = 25n);
        Assert.assert (protocol_fee = 5n);
        Assert.assert (total_fee = 30n)
      end

let test_view_quote_tez_to_token =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  match view_result with
    None -> failwith "quote_tez_to_token view failed"
  | Some tokens_out -> Assert.assert (tokens_out = 499248n)

let test_view_quote_tez_to_token_with_fee =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  match view_result with
    None -> failwith "quote_tez_to_token view failed"
  | Some tokens_out -> Assert.assert (tokens_out = 499248n)

let test_view_quote_tez_to_token_zero =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_tez_to_token" 0n dex_address in
  match view_result with
    None -> failwith "quote_tez_to_token view failed"
  | Some tokens_out -> Assert.assert (tokens_out = 0n)

let test_view_quote_token_to_tez =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_token_to_tez" 500000n dex_address in
  match view_result with
    None -> failwith "quote_token_to_tez view failed"
  | Some xtz_out -> Assert.assert (xtz_out = 332665n)

let test_view_quote_token_to_tez_with_fee =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_token_to_tez" 500000n dex_address in
  match view_result with
    None -> failwith "quote_token_to_tez view failed"
  | Some xtz_out -> Assert.assert (xtz_out = 332665n)

let test_view_quote_token_to_tez_zero =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "quote_token_to_tez" 0n dex_address in
  match view_result with
    None -> failwith "quote_token_to_tez view failed"
  | Some xtz_out -> Assert.assert (xtz_out = 0n)

let test_view_get_minimum_lqt =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option =
    Tezos.View.call "get_minimum_lqt" () dex_address in
  match view_result with
  | Some minimum -> Assert.assert (minimum = 1000n)
  | None -> failwith "get_minimum_lqt view failed"

let test_final_ordinary_lp_cannot_cross_minimum_lqt =
  let test_name = "test_final_ordinary_lp_cannot_cross_minimum_lqt" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let withdraw_to_floor : DexterMod.Dexter.remove_liquidity =
    {
      to_ = Util.src ();
      lqtBurned = 999000n;
      minXtzWithdrawn = 999000mutez;
      minTokensWithdrawn = 999000n;
      deadline = Util.future
    } in
  let _ : nat =
    Test.Typed_address.transfer_exn
      dex_orig.taddr
      (RemoveLiquidity withdraw_to_floor)
      0tez in
  let () =
    Util.assert_dex_state dex_orig.taddr test_name 1000mutez 1000n 1000n in
  let () =
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000n in
  let () =
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000999000n in
  let cross_floor : DexterMod.Dexter.remove_liquidity =
    {
      to_ = Util.src ();
      lqtBurned = 1n;
      minXtzWithdrawn = 0mutez;
      minTokensWithdrawn = 0n;
      deadline = Util.future
    } in
  let result =
    Test.Typed_address.transfer
      dex_orig.taddr
      (RemoveLiquidity cross_floor)
      0tez in
  Util.assert_error
    test_name
    DexterMod.Dexter.error_MINIMUM_LQT_MUST_REMAIN_LOCKED
    result
