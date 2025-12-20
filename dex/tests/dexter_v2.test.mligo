#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter.mligo" "Dexter"
#import "./util.mligo" "Util"

module Test = Test.Next

module Tezos = Tezos.Next

// (*****************************************************************************)
// (* Tests                                                                     *)
// (*****************************************************************************)
// (* Setup test *)
let test_setup =
  let test_name = "test_setup" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1tez 1000000n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000000000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n
  end

(* Add liquidity tests *)
let test_add_liquidity =
  let test_name = "test_add_liquidity" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let add_liq_param : Dexter.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 2tez 2000000n 2000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999000000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 2000000n
  end

let test_add_liquidity_error_deadline =
  let test_name = "test_add_liquidity_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : Dexter.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.past
    } in
  let () = Test.State.bake_until 5n in
  let result = Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_add_liquidity_error_max_tokens =
  let test_name = "test_add_liquidity_error_max_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : Dexter.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 999999n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_MAX_TOKENS_DEPOSITED_MUST_BE_GREATER_THAN_OR_EQUAL_TO_TOKENS_DEPOSITED
    result

let test_add_liquidity_error_min_lqt =
  let test_name = "test_add_liquidity_error_min_lqt" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let add_liq_param : Dexter.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000001n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_LQT_MINTED_MUST_BE_GREATER_THAN_MIN_LQT_MINTED
    result

let test_add_liquidity_error_updating_pool =
  let test_name = "test_add_liquidity_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let add_liq_param : Dexter.Dexter.add_liquidity =
    {
     owner = Util.src ();
     minLqtMinted = 1000000n;
     maxTokensDeposited = 1000000n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (AddLiquidity add_liq_param) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE result

// (* Remove liquidity tests *)
let test_remove_liquidity =
  let test_name = "test_remove_liquidity" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let remove_liq_param : Dexter.Dexter.remove_liquidity =
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
  let remove_liq_param : Dexter.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result = Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_remove_liquidity_error_min_xtz =
  let test_name = "test_remove_liquidity_error_min_xtz" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : Dexter.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500001mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    Dexter.
    Dexter.
    error_THE_AMOUNT_OF_XTZ_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_WITHDRAWN
    result

let test_remove_liquidity_error_min_tokens =
  let test_name = "test_remove_liquidity_error_min_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : Dexter.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500001n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 0tez in
  Util.assert_error
    test_name
    Dexter.
    Dexter.
    error_THE_AMOUNT_OF_TOKENS_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_WITHDRAWN
    result

let test_remove_liquidity_error_amount =
  let test_name = "test_remove_liquidity_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let remove_liq_param : Dexter.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 500000n;
     minXtzWithdrawn = 500000mutez;
     minTokensWithdrawn = 500000n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (RemoveLiquidity remove_liq_param) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

// (* XTZ to Token swap tests *)
let test_xtz_to_token =
  let test_name = "test_xtz_to_token" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499248n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 2tez 500752n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 1000499248n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n
  end

let test_xtz_to_token_error_deadline =
  let test_name = "test_xtz_to_token_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499248n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result = Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_xtz_to_token_error_min_tokens =
  let test_name = "test_xtz_to_token_error_min_tokens" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 499249n; // 499248n is the correct amount, we add +1 to trigger error
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_TOKENS_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_BOUGHT
    result

// (* Token to XTZ swap tests *)
let test_token_to_xtz =
  let test_name = "test_token_to_xtz" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 667335mutez 1500000n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999500000n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n
  end

let test_token_to_xtz_error_deadline =
  let test_name = "test_token_to_xtz_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 5n in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

let test_token_to_xtz_error_min_xtz =
  let test_name = "test_token_to_xtz_error_min_xtz" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332666mutez;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_XTZ_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_BOUGHT
    result

let test_token_to_xtz_error_amount =
  let test_name = "test_token_to_xtz_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 500000n;
     minXtzBought = 332665mutez;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

// (* Default entrypoint tests *)
let test_default =
  let test_name = "test_default" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (Default_ ()) 1tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 2tez 1000000n 1000000n;
    Assert.assert (Test.Typed_address.get_balance dex_orig.taddr = 2tez)
  end

let test_default_error_updating_pool =
  let test_name = "test_default_error_updating_pool" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result = Test.Typed_address.transfer dex_orig.taddr (Default_ ()) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE result

(* Set baker tests *)
let test_set_baker =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : Dexter.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (SetBaker set_baker_param) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert storage.freezeBaker

let test_set_baker_error_amount =
  let test_name = "test_set_baker_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : Dexter.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_set_baker_error_not_manager =
  let test_name = "test_set_baker_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let set_baker_param : Dexter.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 0tez in
  Util.assert_error test_name Dexter.Dexter.error_ONLY_MANAGER_CAN_SET_BAKER result

let test_set_baker_error_frozen =
  let test_name = "test_set_baker_error_frozen" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let set_baker_param : Dexter.Dexter.set_baker =
    {
     baker = (None : key_hash option);
     freezeBaker = true
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (SetBaker set_baker_param) 0tez in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetBaker set_baker_param) 0tez in
  Util.assert_error test_name Dexter.Dexter.error_BAKER_PERMANENTLY_FROZEN result

// (* Set manager tests *)
let test_set_manager =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_manager = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (SetManager new_manager) 0tez in
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.manager = new_manager)

let test_set_manager_error_amount =
  let test_name = "test_set_manager_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_manager = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetManager new_manager) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_set_manager_error_not_manager =
  let test_name = "test_set_manager_error_not_manager" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let () = Test.State.set_source (Util.other ()) in
  let new_manager = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetManager new_manager) 0tez in
  Util.assert_error test_name Dexter.Dexter.error_ONLY_MANAGER_CAN_SET_MANAGER result

// (* Set LQT address tests *)
let test_set_lqt_address_error_amount =
  let test_name = "test_set_lqt_address_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_lqt = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetLqtAddress new_lqt) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_set_lqt_address_error_already_set =
  let test_name = "test_set_lqt_address_error_already_set" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let new_lqt = ("tz1fakefakefakefakefakefakefakcphLA5" : address) in
  let result = Test.Typed_address.transfer dex_orig.taddr (SetLqtAddress new_lqt) 0tez in
  Util.assert_error test_name Dexter.Dexter.error_LQT_ADDRESS_ALREADY_SET result

// (* Update token pool tests *)
let test_update_token_pool =
  let test_name = "test_update_token_pool" in
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let mintOrBurn_param : LQT.LQT.mintOrBurn =
    {
     quantity = -1;
     target = Test.Typed_address.to_address dex_orig.taddr
    } in
  let _ : nat = Test.Typed_address.transfer_exn tok_orig.taddr (MintOrBurn mintOrBurn_param) 0tez in
  let () = Util.assert_dex_state dex_orig.taddr test_name 1tez 1000000n 1000000n in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (UpdateTokenPool ()) 0tez in
  Util.assert_dex_state dex_orig.taddr test_name 1tez 999999n 1000000n

let test_update_token_pool_error_amount =
  let test_name = "test_update_token_pool_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let result = Test.Typed_address.transfer dex_orig.taddr (UpdateTokenPool ()) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_update_token_pool_error_reentrance =
  let test_name = "test_update_token_pool_error_reentrance" in
  let (dex_orig, _, _) = Util.setup_dex_with_updating_pool () in
  let result = Test.Typed_address.transfer dex_orig.taddr (UpdateTokenPool ()) 0tez in
  Util.assert_error test_name Dexter.Dexter.error_UNEXPECTED_REENTRANCE_IN_UPDATE_TOKEN_POOL result

// (* Token to token tests *)
let test_token_to_token =
  let test_name = "test_token_to_token" in
  let (dex_orig, lqt_orig, tok_orig) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497997n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (TokenToToken swap_param) 0tez in
  begin
    Util.assert_dex_state dex_orig.taddr test_name 1tez 1002003n 1000000n;
    Util.assert_token_balance tok_orig.taddr test_name (Util.src ()) 999997997n;
    Util.assert_token_balance lqt_orig.taddr test_name (Util.src ()) 1000000n
  end

let test_token_to_token_error_amount =
  let test_name = "test_token_to_token_error_amount" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497997n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToToken swap_param) 1tez in
  Util.assert_error test_name Dexter.Dexter.error_AMOUNT_MUST_BE_ZERO result

let test_token_to_token_error_deadline =
  let test_name = "test_token_to_token_error_deadline" in
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_token =
    {
     outputDexterContract = Test.Typed_address.to_address dex_orig.taddr;
     minTokensBought = 497997n;
     to_ = Util.src ();
     tokensSold = 500000n;
     deadline = Util.now
    } in
  let () = Test.State.bake_until 1n in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToToken swap_param) 0tez in
  Util.assert_error
    test_name
    Dexter.Dexter.error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE
    result

// (*****************************************************************************)
// (* View tests                                                                *)
// (*****************************************************************************)
(* Test get_reserves view *)
let test_view_get_reserves =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  match view_result with
    None -> failwith "get_reserves view failed"
  | Some (tez_pool, token_pool) ->
      begin
        Assert.assert (tez_pool = 1000000n); // 1tez in mutez
        Assert.assert (token_pool = 1000000n)
      end

(* Test get_lqt_total view *)
let test_view_get_lqt_total =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option = Tezos.View.call "get_lqt_total" () dex_address in
  match view_result with
    None -> failwith "get_lqt_total view failed"
  | Some lqt_total -> Assert.assert (lqt_total = 1000000n)

(* Test get_fee_bp view *)
let test_view_get_fee_bp =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option = Tezos.View.call "get_fee_bp" () dex_address in
  match view_result with
    None -> failwith "get_fee_bp view failed"
  | Some fee_bp -> Assert.assert (fee_bp = 30n) // 0.3% fee = 30 basis points

(* Test quote_tez_to_token view *)
let test_view_quote_tez_to_token =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Quote for 1 tez (1000000 mutez) *)
  let tez_in = 1000000n in
  let view_result : nat option = Tezos.View.call "quote_tez_to_token" tez_in dex_address in
  match view_result with
    None -> failwith "quote_tez_to_token view failed"
  | Some tokens_out -> Assert.assert (tokens_out = 499248n)

(* Test quote_tez_to_token with zero input *)
let test_view_quote_tez_to_token_zero =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option = Tezos.View.call "quote_tez_to_token" 0n dex_address in
  match view_result with
    None -> failwith "quote_tez_to_token view failed"
  | Some tokens_out -> Assert.assert (tokens_out = 0n)

// (* Test quote_token_to_tez view *)
let test_view_quote_token_to_tez =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Quote for 500000 tokens *)
  let token_in = 500000n in
  let view_result : nat option = Tezos.View.call "quote_token_to_tez" token_in dex_address in
  match view_result with
    None -> failwith "quote_token_to_tez view failed"
  | Some xtz_out -> Assert.assert (xtz_out = 332665n)

// (* Test quote_token_to_tez with zero input *)
let test_view_quote_token_to_tez_zero =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let view_result : nat option = Tezos.View.call "quote_token_to_tez" 0n dex_address in
  match view_result with
    None -> failwith "quote_token_to_tez view failed"
  | Some xtz_out -> Assert.assert (xtz_out = 0n)

(*****************************************************************************)
(* Edge Case Tests                                                          *)
(*****************************************************************************)
(* Test: Zero XTZ input *)
let test_edge_xtz_to_token_zero_input =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 0n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 0mutez in
  (* Should succeed with 0 tokens *)
  match result
  with
    Success _ -> ()
  | Fail _ -> failwith "XTZ to token swap with zero input should succeed"

(* Test: Zero tokens input *)
let test_edge_token_to_xtz_zero_input =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 0n;
     minXtzBought = 0mutez;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  (* Should fail *)
  match result
  with
    Success _ -> failwith "Transactions of 0tez towards a contract without code are forbidden"
  | Fail _ -> ()

(* Test: Tiny XTZ input where effective amount floors to 0 *)
let test_edge_tiny_xtz_input =
  let (dex_orig, _, tok_orig) = Util.setup_full_dex () in
  let initial_balance = 1000000000n in
  (* Swap 1 mutez - after 0.3% fee = 0 effective *)
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 0n;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (XtzToToken swap_param) 1mutez in
  match result with
    Success _ ->
      (* Check that no tokens were received or minimal amount *)
      let storage = Test.Typed_address.get_storage tok_orig.taddr in
      let final_balance =
        match Big_map.find_opt (Util.src ()) storage.tokens with
          None -> 0n
        | Some b -> b in
      let tokens_received = abs (final_balance - initial_balance) in
      (* Should be 0 or very small *)
      Assert.
      assert
        (tokens_received <= 1n)
  | Fail _ -> failwith "XTZ to token swap with tiny input should succeed"

(* Test: Tiny token input where effective amount floors to 0 *)
let test_edge_tiny_token_input =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  (* Sell 1 token - after 0.3% fee might be 0 effective *)
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 1n;
     minXtzBought = 0mutez;
     deadline = Util.future
    } in
  let result = Test.Typed_address.transfer dex_orig.taddr (TokenToXtz swap_param) 0tez in
  // We should get 0tez as the swap result and thus the transaction should fail
  match result
  with
    Success _ -> failwith "Transactions of 0tez towards a contract without code are forbidden"
  | Fail _ -> ()

(* Test: Large swap - verify pool not drained completely *)
let test_edge_large_swap_pool_not_empty =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  (* Swap 0.95 tez (95% of pool) *)
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 1n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 0.95tez in
  (* Verify pool still has tokens *)
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  begin
    Assert.assert (storage.tokenPool > 0n);
    Assert.assert (storage.tokenPool > 400000n)
  (* Should have ~51% remaining *)
  end

(* Test: Massive swap - cannot drain pool *)
let test_edge_massive_swap_cannot_drain =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  (* Swap 5_000_000 tez *)
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 1n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 5000000tez in
  (* Verify pools never reach zero *)
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.tokenPool > 0n)

(* Test: Large token swap - verify pool not drained *)
let test_edge_large_token_swap_pool_not_empty =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  (* Sell 1m tokens (100% of pool) *)
  let swap_param : Dexter.Dexter.token_to_xtz =
    {
     to_ = Util.src ();
     tokensSold = 1000000n;
     minXtzBought = 1mutez;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
  (* Verify XTZ pool still has funds *)
  let storage = Test.Typed_address.get_storage dex_orig.taddr in
  Assert.assert (storage.xtzPool > 500000mutez)

(*****************************************************************************)
(* View Purity Tests - Views should not modify storage                      *)
(*****************************************************************************)
(* Test: get_reserves view does not change storage *)
let test_view_purity_get_reserves =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call view *)
  let _ : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  (* Storage should be identical *)
  Assert.
  assert
    (hash_before = hash_after)

(* Test: get_lqt_total view does not change storage *)
let test_view_purity_get_lqt_total =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call view *)
  let _ : nat option = Tezos.View.call "get_lqt_total" () dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: get_fee_bp view does not change storage *)
let test_view_purity_get_fee_bp =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call view *)
  let _ : nat option = Tezos.View.call "get_fee_bp" () dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: quote_tez_to_token view does not change storage *)
let test_view_purity_quote_tez_to_token =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call view multiple times with different inputs *)
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 500000n dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 100000n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: quote_token_to_tez view does not change storage *)
let test_view_purity_quote_token_to_tez =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call view multiple times with different inputs *)
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 1000000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 500000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 100000n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: Multiple view calls in sequence don't change storage *)
let test_view_purity_multiple_calls =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call all views multiple times *)
  let _ : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  let _ : nat option = Tezos.View.call "get_lqt_total" () dex_address in
  let _ : nat option = Tezos.View.call "get_fee_bp" () dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 1000000n dex_address in
  (* Call again *)
  let _ : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 500000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 500000n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: Views don't change storage even after actual swaps *)
let test_view_purity_after_swap =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Perform a swap to change storage *)
  let swap_param : Dexter.Dexter.xtz_to_token =
    {
     to_ = Util.src ();
     minTokensBought = 1n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) 0.1tez in
  (* Now test view purity on changed state *)
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call views *)
  let _ : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 1000000n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: Views with edge case inputs don't change storage *)
let test_view_purity_edge_cases =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  (* Call views with edge case inputs *)
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 0n dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 999999999999n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 0n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 999999999999n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)

(* Test: View purity on empty pool *)
let test_view_purity_empty_pool =
  let (dex_orig, _, _) = Util.setup_full_dex () in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Remove all liquidity *)
  let remove_param : Dexter.Dexter.remove_liquidity =
    {
     to_ = Util.src ();
     lqtBurned = 1000000n;
     minXtzWithdrawn = 1mutez;
     minTokensWithdrawn = 1n;
     deadline = Util.future
    } in
  let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (RemoveLiquidity remove_param) 0tez in
  (* Test view purity on empty pool *)
  let storage_before = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_before = Crypto.blake2b (Bytes.pack storage_before) in
  let _ : (nat * nat) option = Tezos.View.call "get_reserves" () dex_address in
  let _ : nat option = Tezos.View.call "quote_tez_to_token" 1000000n dex_address in
  let _ : nat option = Tezos.View.call "quote_token_to_tez" 1000000n dex_address in
  let storage_after = Test.Typed_address.get_storage dex_orig.taddr in
  let hash_after = Crypto.blake2b (Bytes.pack storage_after) in
  Assert.assert (hash_before = hash_after)
