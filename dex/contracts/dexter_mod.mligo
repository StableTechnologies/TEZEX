module Dexter = struct 
  // =============================================================================
  // Entrypoints
  // =============================================================================
  type add_liquidity =
    [@layout:comb]
    { owner : address ;
      minLqtMinted : nat ;
      maxTokensDeposited : nat ;
      deadline : timestamp ;
    }

  type remove_liquidity =
    [@layout:comb]
    { [@annot:to] to_ : address ; // recipient of the liquidity redemption
      lqtBurned : nat ;  // amount of lqt owned by sender to burn
      minXtzWithdrawn : tez ; // minimum amount of tez to withdraw
      minTokensWithdrawn : nat ; // minimum amount of tokens to whitdw
      deadline : timestamp ; // the time before which the request must be completed
    }

  type xtz_to_token =
    [@layout:comb]
    { [@annot:to] to_ : address ;
      minTokensBought : nat ;
      deadline : timestamp ;
    }

  type token_to_xtz =
    [@layout:comb]
    { [@annot:to] to_ : address ;
      tokensSold : nat ;
      minXtzBought : tez ;
      deadline : timestamp ;
    }

  type set_baker =
    [@layout:comb]
    { baker : key_hash option ;
      freezeBaker : bool ;
    }

  type token_to_token =
    [@layout:comb]
    { outputDexterContract : address ;
      minTokensBought : nat ;
      [@annot:to] to_ : address ;
      tokensSold : nat ;
      deadline : timestamp ;
    }

  type activate_pool =
    [@layout:comb]
    { expectedXtzPool : tez ;
      expectedTokenPool : nat ;
      expectedLqtTotal : nat ;
    }

  #if FA2
  type update_token_pool_internal = ((address * nat) * nat) list
  #else
  type update_token_pool_internal = nat
  #endif

  // =============================================================================
  // Storage
  // =============================================================================

  type storage =
    [@layout:comb]
    { tokenPool : nat ;
      xtzPool : tez ;
      lqtTotal : nat ;
      active : bool ;
      paused : bool ;
      activationPending : bool ;
      selfIsUpdatingTokenPool : bool ;
      freezeBaker : bool ;
      manager : address ;
      pending_manager : address option ;
      tokenAddress : address ;
  #if FA2
      tokenId : nat ;
  #endif
      lqtAddress : address ;
      protocol_fee_recipient : address ; // address authorised to claim the accumulated fee
      pending_protocol_fee_recipient : address option ;
      accumulated_protocol_fee_xtz : tez ;  // total XTZ fee accumulated since last claim
      accumulated_protocol_fee_token : nat ; // total token fee accumulated since last claim
    }

  // =============================================================================
  // Type Synonyms
  // =============================================================================

  type result = operation list * storage

  #if FA2
  // FA2
  type token_id = nat
  type token_contract_transfer = (address * (address * (token_id * nat)) list) list
  type balance_of = ((address * token_id) list * ((((address * nat) * nat) list) contract))
  #else
  // FA1.2
  type token_contract_transfer = address * (address * nat)
  type get_balance = address * (nat contract)
  #endif

  // custom entrypoint for LQT FA1.2
  type mintOrBurn =
    [@layout:comb]
    { quantity : int ;
      target : address }

  type getTotalSupply =
    [@layout:comb]
    { request : unit ;
      callback : nat contract }

  // =============================================================================
  // Error codes
  // =============================================================================

  [@inline] let error_TOKEN_CONTRACT_MUST_HAVE_A_TRANSFER_ENTRYPOINT  = 0n
  (* 1n *)
  [@inline] let error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE       = 2n
  [@inline] let error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE = 3n
  [@inline] let error_MAX_TOKENS_DEPOSITED_MUST_BE_GREATER_THAN_OR_EQUAL_TO_TOKENS_DEPOSITED = 4n
  [@inline] let error_LQT_MINTED_MUST_BE_GREATER_THAN_MIN_LQT_MINTED = 5n
  (* 6n *)
  (* 7n *)
  [@inline] let error_XTZ_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_BOUGHT = 8n
  [@inline] let error_INVALID_TO_ADDRESS = 9n
  [@inline] let error_AMOUNT_MUST_BE_ZERO = 10n
  [@inline] let error_THE_AMOUNT_OF_XTZ_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_WITHDRAWN = 11n
  [@inline] let error_LQT_CONTRACT_MUST_HAVE_A_MINT_OR_BURN_ENTRYPOINT = 12n
  [@inline] let error_THE_AMOUNT_OF_TOKENS_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_WITHDRAWN = 13n
  [@inline] let error_CANNOT_BURN_MORE_THAN_THE_TOTAL_AMOUNT_OF_LQT = 14n
  [@inline] let error_TOKEN_POOL_MINUS_TOKENS_WITHDRAWN_IS_NEGATIVE = 15n
  (* 16n *)
  (* 17n *)
  [@inline] let error_TOKENS_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_BOUGHT = 18n
  [@inline] let error_TOKEN_POOL_MINUS_TOKENS_BOUGHT_IS_NEGATIVE = 19n
  [@inline] let error_ONLY_MANAGER_CAN_SET_BAKER = 20n
  [@inline] let error_ONLY_MANAGER_CAN_SET_MANAGER = 21n
  [@inline] let error_BAKER_PERMANENTLY_FROZEN = 22n
  [@inline] let error_ONLY_MANAGER_CAN_SET_LQT_ADRESS = 23n
  [@inline] let error_LQT_ADDRESS_ALREADY_SET = 24n
  [@inline] let error_CALL_NOT_FROM_AN_IMPLICIT_ACCOUNT = 25n
  (* 26n *)
  (* 27n *)
  #if FA2
  [@inline] let error_INVALID_FA2_TOKEN_CONTRACT_MISSING_BALANCE_OF = 28n
  #else
  [@inline] let error_INVALID_FA12_TOKEN_CONTRACT_MISSING_GETBALANCE = 28n
  #endif
  [@inline] let error_THIS_ENTRYPOINT_MAY_ONLY_BE_CALLED_BY_GETBALANCE_OF_TOKENADDRESS = 29n
  (* 30n *)
  [@inline] let error_INVALID_INTERMEDIATE_CONTRACT = 31n
  [@inline] let error_INVALID_FA2_BALANCE_RESPONSE = 32n
  [@inline] let error_UNEXPECTED_REENTRANCE_IN_UPDATE_TOKEN_POOL = 33n
  [@inline] let error_PROTOCOL_FEE_EXCEEDS_AMOUNT = 34n
  [@inline] let error_PROTOCOL_FEE_EXCEEDS_XTZ_BOUGHT = 35n
  [@inline] let error_XTZ_POOL_UNDERFLOW = 36n
  (* 37n *)
  (* 38n *)
  [@inline] let error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE = 39n
  [@inline] let error_NO_PROTOCOL_FEE_TO_CLAIM = 40n
  [@inline] let error_ONLY_MANAGER_CAN_SET_PROTOCOL_FEE_RECIPIENT = 41n
  [@inline] let error_ACCUMULATED_FEE_EXCEEDS_TOKEN_POOL = 42n
  [@inline] let error_POOL_NOT_ACTIVE = 43n
  [@inline] let error_POOL_ALREADY_ACTIVE = 44n
  [@inline] let error_ONLY_MANAGER_CAN_INITIALIZE_POOL = 45n
  [@inline] let error_LQT_ADDRESS_NOT_CONFIGURED = 46n
  [@inline] let error_INVALID_INITIAL_RESERVES = 47n
  [@inline] let error_LQT_CONTRACT_MUST_HAVE_A_GET_TOTAL_SUPPLY_ENTRYPOINT = 48n
  [@inline] let error_INVALID_ACTIVATION_CALLBACK = 49n
  [@inline] let error_LQT_TOTAL_MISMATCH = 50n
  [@inline] let error_MINIMUM_LQT_MUST_REMAIN_LOCKED = 51n
  [@inline] let error_POOL_PAUSED = 52n
  [@inline] let error_ONLY_MANAGER_CAN_SET_PAUSE = 53n
  [@inline] let error_ONLY_PENDING_MANAGER_CAN_ACCEPT = 54n
  [@inline] let error_ONLY_PENDING_PROTOCOL_FEE_RECIPIENT_CAN_ACCEPT = 55n
  [@inline] let error_INVALID_ADMIN_ADDRESS = 56n
  [@inline] let error_PENDING_MANAGER_MUST_ACCEPT = 57n
  [@inline] let error_PENDING_PROTOCOL_FEE_RECIPIENT_MUST_ACCEPT = 58n

  // =============================================================================
  // Functions
  // =============================================================================

  (* this is slightly inefficient to inline, but, nice to have a clean stack for 
    the entrypoints for the Coq verification *)
  [@inline]
  let mutez_to_natural (a: tez) : nat =  a / 1mutez

  [@inline]
  let natural_to_mutez (a: nat): tez = a * 1mutez  

  [@inline]
  let is_a_nat (i : int) : nat option = is_nat i

  let ceildiv (numerator : nat) (denominator : nat) : nat =
      match (ediv numerator denominator) with
          | None   -> (failwith("DIV by 0") : nat)
          | Some v ->  let (q, r) = v in if r = 0n then q else q + 1n

  [@inline]
  let mint_or_burn (storage : storage) (target : address) (quantity : int) : operation =
      let lqt_admin : mintOrBurn contract =
      match (Tezos.get_entrypoint_opt "%mintOrBurn" storage.lqtAddress :  mintOrBurn contract option) with
      | None -> (failwith error_LQT_CONTRACT_MUST_HAVE_A_MINT_OR_BURN_ENTRYPOINT : mintOrBurn contract)
      | Some contract -> contract in
      Tezos.transaction {quantity = quantity ; target = target} 0mutez lqt_admin

  [@inline]
  let token_transfer (storage : storage) (from : address) (to_ : address) (token_amount : nat) : operation =
      let token_contract: token_contract_transfer contract =
      match (Tezos.get_entrypoint_opt "%transfer" storage.tokenAddress : token_contract_transfer contract option) with
      | None -> (failwith error_TOKEN_CONTRACT_MUST_HAVE_A_TRANSFER_ENTRYPOINT : token_contract_transfer contract)
      | Some contract -> contract in
  #if FA2
      Tezos.transaction [(from, [(to_, (storage.tokenId, token_amount))])] 0mutez token_contract
  #else
      Tezos.transaction (from, (to_, token_amount)) 0mutez token_contract
  #endif

  [@inline]
  let xtz_transfer (to_ : address) (amount_ : tez) : operation =
      let to_contract : unit contract =
      match (Tezos.get_contract_opt to_ : unit contract option) with
      | None -> (failwith error_INVALID_TO_ADDRESS : unit contract)
      | Some c -> c in
      Tezos.transaction () amount_ to_contract

  // A swap pays exactly 30 bp in total: 25 bp remains in the pool for LPs and
  // 5 bp is accounted separately for the protocol recipient. These constants
  // are intentionally not stored and there is no fee-setting entrypoint.
  [@inline] let lp_fee_bp : nat = 25n
  [@inline] let protocol_fee_bp : nat = 5n
  [@inline] let total_fee_bp : nat = 30n
  [@inline] let swap_fee_numerator : nat = 997n
  [@inline] let minimum_lqt : nat = 1000n

  [@inline]
  let compute_protocol_fee (amount_nat : nat) : nat =
      (amount_nat * protocol_fee_bp) / 10000n

  [@inline]
  let pool_is_ready (storage : storage) : bool =
      storage.active
      && storage.xtzPool > 0mutez
      && storage.tokenPool > 0n
      && storage.lqtTotal >= minimum_lqt

  [@inline]
  let assert_valid_admin_address (candidate : address) : unit =
      if candidate = Tezos.get_self_address ()
      then failwith error_INVALID_ADMIN_ADDRESS
      else ()

  // =============================================================================
  // Entrypoint Functions
  // =============================================================================

  // Modified pools originate inactive. The manager seeds the reserves and
  // activates the pool only after the expected XTZ/LQT reserves, the minimum
  // token seed, and the LQT contract's actual total supply have been verified.
  // Any tokens donated before synchronization remain in the pool for LPs and
  // cannot prevent activation. Each user-funds entrypoint also checks the
  // lifecycle and positive reserves so an emptied pool fails closed.

  [@entry]
  let addLiquidity (param : add_liquidity) (storage: storage) : result =
      let { owner = owner ;
            minLqtMinted = minLqtMinted ;
            maxTokensDeposited = maxTokensDeposited ;
            deadline = deadline } = param in

      if storage.selfIsUpdatingTokenPool then
          (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if not (pool_is_ready storage) then
          (failwith error_POOL_NOT_ACTIVE : result)
      else if storage.paused then
          (failwith error_POOL_PAUSED : result)
      else if Tezos.get_now () >= deadline then
          (failwith error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE : result)
      else
          // the contract is initialized, use the existing exchange rate
          // mints nothing if the contract has been emptied, but that's OK
          let xtzPool   : nat = mutez_to_natural storage.xtzPool in
          let nat_amount : nat = mutez_to_natural (Tezos.get_amount ()) in
          let lqt_minted : nat = nat_amount * storage.lqtTotal  / xtzPool in
          let tokens_deposited : nat = ceildiv (nat_amount * storage.tokenPool) xtzPool in

          if tokens_deposited > maxTokensDeposited then
              (failwith error_MAX_TOKENS_DEPOSITED_MUST_BE_GREATER_THAN_OR_EQUAL_TO_TOKENS_DEPOSITED : result)
          else if lqt_minted < minLqtMinted then
              (failwith error_LQT_MINTED_MUST_BE_GREATER_THAN_MIN_LQT_MINTED : result)
          else
              let storage = {storage with
                  lqtTotal  = storage.lqtTotal + lqt_minted ;
                  tokenPool = storage.tokenPool + tokens_deposited ;
                  xtzPool   = storage.xtzPool + Tezos.get_amount ()} in

              // send tokens from sender to exchange
              let op_token = token_transfer storage (Tezos.get_sender ()) (Tezos.get_self_address ()) tokens_deposited in
              // mint lqt tokens for them
              let op_lqt = mint_or_burn storage owner (int lqt_minted) in
              ([op_token; op_lqt], storage)

  [@entry]
  let removeLiquidity (param : remove_liquidity) (storage : storage) : result =
      let { to_ = to_ ;
            lqtBurned = lqtBurned ;
            minXtzWithdrawn = minXtzWithdrawn ;
            minTokensWithdrawn = minTokensWithdrawn ;
            deadline = deadline } = param in

      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if not (pool_is_ready storage) then
        (failwith error_POOL_NOT_ACTIVE : result)
      else if Tezos.get_now () >= deadline then
        (failwith error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE : result)    
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else begin
          let xtz_withdrawn    : tez = natural_to_mutez ((lqtBurned * (mutez_to_natural storage.xtzPool)) / storage.lqtTotal) in
          let tokens_withdrawn : nat = lqtBurned * storage.tokenPool /  storage.lqtTotal in

          // Check that minimum withdrawal conditions are met
          if xtz_withdrawn < minXtzWithdrawn then
              (failwith error_THE_AMOUNT_OF_XTZ_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_WITHDRAWN : result)
          else if tokens_withdrawn < minTokensWithdrawn  then
              (failwith error_THE_AMOUNT_OF_TOKENS_WITHDRAWN_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_WITHDRAWN : result)
          // Proceed to form the operations and update the storage
          else begin                                                                
              // calculate lqtTotal, convert int to nat
              let new_lqtTotal = match (is_a_nat ( storage.lqtTotal - lqtBurned)) with
                  // This check should be unecessary, the fa12 logic normally takes care of it
                  | None -> (failwith error_CANNOT_BURN_MORE_THAN_THE_TOTAL_AMOUNT_OF_LQT : nat)
                  | Some n -> n in
              let () =
                  if new_lqtTotal < minimum_lqt
                  then failwith error_MINIMUM_LQT_MUST_REMAIN_LOCKED
                  else () in
              // Calculate tokenPool, convert int to nat
              let new_tokenPool = match is_a_nat (storage.tokenPool - tokens_withdrawn) with
                  | None -> (failwith error_TOKEN_POOL_MINUS_TOKENS_WITHDRAWN_IS_NEGATIVE : nat)
                  | Some n -> n in

              let xtz_pool_nat = mutez_to_natural storage.xtzPool in
              let xtz_withdrawn_nat = mutez_to_natural xtz_withdrawn in
              let new_xtz_pool_nat = match is_nat (xtz_pool_nat - xtz_withdrawn_nat) with
                  | None -> (failwith error_XTZ_POOL_UNDERFLOW : nat)
                  | Some n -> n in
              let new_xtzPool = natural_to_mutez new_xtz_pool_nat in
                                  
              let op_lqt = mint_or_burn storage (Tezos.get_sender ()) (0 - lqtBurned) in
              let op_token = token_transfer storage (Tezos.get_self_address ()) to_ tokens_withdrawn in
              let op_xtz = xtz_transfer to_ xtz_withdrawn in
              let storage = {storage with xtzPool = new_xtzPool ; lqtTotal = new_lqtTotal ; tokenPool = new_tokenPool} in
              ([op_lqt; op_token; op_xtz], storage)
          end
      end

  [@entry]
  let xtzToToken (param : xtz_to_token) (storage : storage) =
    let { to_ = to_ ;
          minTokensBought = minTokensBought ;
          deadline = deadline } = param in

      if storage.selfIsUpdatingTokenPool then
          (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if not (pool_is_ready storage) then
          (failwith error_POOL_NOT_ACTIVE : result)
      else if storage.paused then
          (failwith error_POOL_PAUSED : result)
      else if Tezos.get_now () >= deadline then
          (failwith error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE : result)    
      else begin
          // we don't check that xtzPool > 0, because that is impossible
          // unless all liquidity has been removed
          let xtzPool = mutez_to_natural storage.xtzPool in
          let nat_amount = mutez_to_natural (Tezos.get_amount ()) in

          let protocol_fee = compute_protocol_fee nat_amount in
          let pool_amount : nat = match is_nat (nat_amount - protocol_fee) with
              | None -> (failwith error_PROTOCOL_FEE_EXCEEDS_AMOUNT : nat)
              | Some n -> n in

          let tokens_bought = 
              // Price the gross input at the full 30 bp swap fee. The 5 bp
              // protocol share is removed only from reserve accounting below.
              (let bought = (nat_amount * swap_fee_numerator * storage.tokenPool) / (xtzPool * 1000n + (nat_amount * swap_fee_numerator)) in
              if bought < minTokensBought then
                  (failwith error_TOKENS_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_TOKENS_BOUGHT : nat)
              else
                  bought)
          in    
          let new_tokenPool = (match is_nat (storage.tokenPool - tokens_bought) with
              | None -> (failwith error_TOKEN_POOL_MINUS_TOKENS_BOUGHT_IS_NEGATIVE : nat)
              | Some difference -> difference) in

          // Gross XTZ enters the contract. The tracked pool receives gross less
          // the 5 bp protocol liability, leaving the other 25 bp with LPs.
          let fee_tez : tez = natural_to_mutez protocol_fee in
          let pool_tez : tez = natural_to_mutez pool_amount in
          // update xtzPool
          let storage = { storage with
              xtzPool = storage.xtzPool + pool_tez ;
              tokenPool = new_tokenPool ;
              accumulated_protocol_fee_xtz = storage.accumulated_protocol_fee_xtz + fee_tez } in
          // send tokens_withdrawn to to address
          // if tokens_bought is greater than storage.tokenPool, this will fail
          let op = token_transfer storage (Tezos.get_self_address ()) to_ tokens_bought in
          ([ op ], storage)
      end

  [@entry]
  let tokenToXtz (param : token_to_xtz) (storage : storage) =
      let { to_ = to_ ;
            tokensSold = tokensSold ;
            minXtzBought = minXtzBought ;
            deadline = deadline } = param in

      if storage.selfIsUpdatingTokenPool then
          (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if not (pool_is_ready storage) then
          (failwith error_POOL_NOT_ACTIVE : result)
      else if storage.paused then
          (failwith error_POOL_PAUSED : result)
      else if Tezos.get_now () >= deadline then
          (failwith error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE : result)    
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else
          // we don't check that tokenPool > 0, because that is impossible
          // unless all liquidity has been removed
          let protocol_fee = compute_protocol_fee tokensSold in
          let pool_tokens_sold : nat = match is_nat (tokensSold - protocol_fee) with
              | None -> (failwith error_PROTOCOL_FEE_EXCEEDS_AMOUNT : nat)
              | Some n -> n in
          
          let xtz_bought = 
              let bought = natural_to_mutez (((tokensSold * swap_fee_numerator * (mutez_to_natural storage.xtzPool)) / (storage.tokenPool * 1000n + (tokensSold * swap_fee_numerator)))) in
                  if bought < minXtzBought then (failwith error_XTZ_BOUGHT_MUST_BE_GREATER_THAN_OR_EQUAL_TO_MIN_XTZ_BOUGHT : tez) else bought in

          let xtz_pool_nat = mutez_to_natural storage.xtzPool in
          let xtz_bought_nat = mutez_to_natural xtz_bought in
          let new_xtz_pool_nat = match is_nat (xtz_pool_nat - xtz_bought_nat) with
              | None -> (failwith error_XTZ_POOL_UNDERFLOW : nat)
              | Some n -> n in
          let new_xtzPool = natural_to_mutez new_xtz_pool_nat in

          let op_token = token_transfer storage (Tezos.get_sender ()) (Tezos.get_self_address ()) tokensSold in
          let op_tez = xtz_transfer to_ xtz_bought in
          let storage = {storage with tokenPool = storage.tokenPool + pool_tokens_sold ;
                                      xtzPool = new_xtzPool ;
                                      accumulated_protocol_fee_token = storage.accumulated_protocol_fee_token + protocol_fee} in
          ([op_token ; op_tez], storage)

  // entrypoint to allow depositing funds
  //
  // NOTE: Using conditional compilation for the default entrypoint name.
  // In LIGO Test.Next framework, there's a conflict when an entrypoint named
  // "default" accepts unit as parameter - the test framework confuses it with
  // Tezos native default entrypoint (used for receiving XTZ without parameters).
  // This causes "invalid primitive Right" errors during testing.
  // 
  // Solution: Use "default_" in tests, but keep "default" for production deployment.
  // The #if DEPLOY directive automatically handles this - tests use "default_", while
  // compiled contracts use "default" which works correctly on-chain.
  #if DEPLOY
  [@entry]
  let default (_ : unit) (storage : storage) : result = 
  #else
  [@entry]
  let default_ (_ : unit) (storage : storage) : result = 
  #endif
      // update xtzPool
      if (storage.selfIsUpdatingTokenPool) then
          (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE: result)
      else if storage.active && storage.paused then
          (failwith error_POOL_PAUSED : result)
      else if not storage.active && Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_INITIALIZE_POOL : result)
      else 
          let storage = {storage with xtzPool = storage.xtzPool + Tezos.get_amount () } in
          (([] : operation list), storage)

  // set baker
  [@entry]
  let setBaker (param : set_baker) (storage : storage) : result =
      let { baker = baker ;
            freezeBaker = freezeBaker } = param in
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)    
      else if Tezos.get_amount () > 0mutez then
        (failwith error_AMOUNT_MUST_BE_ZERO  : result)
      else if Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_SET_BAKER : result)
      else if storage.freezeBaker then
          (failwith error_BAKER_PERMANENTLY_FROZEN : result)
      else
          ([ Tezos.set_delegate baker ], {storage with freezeBaker = freezeBaker})

  // Emergency pause blocks swaps, additions, and reserve synchronization.
  // Liquidity removal and protocol-fee claims remain available.
  [@entry]
  let setPaused (paused : bool) (storage : storage) : result =
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_SET_PAUSE : result)
      else
          if paused then
            (([] : operation list), {storage with paused = true})
          else
            match storage.pending_manager with
            | Some _ ->
                (failwith error_PENDING_MANAGER_MUST_ACCEPT : result)
            | None ->
                (match storage.pending_protocol_fee_recipient with
                | Some _ ->
                    (failwith
                       error_PENDING_PROTOCOL_FEE_RECIPIENT_MUST_ACCEPT
                       : result)
                | None ->
                    (([] : operation list), {storage with paused = false}))

  // Manager changes use a two-step handoff so a typo cannot permanently lose
  // control. The proposed address must explicitly accept from that address.
  [@entry]
  let proposeManager (new_manager : address) (storage : storage) : result =
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_SET_MANAGER : result)
      else
          let () = assert_valid_admin_address new_manager in
          (([] : operation list), {storage with pending_manager = Some new_manager})

  [@entry]
  let cancelManagerTransfer (_ : unit) (storage : storage) : result =
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_SET_MANAGER : result)
      else
          (([] : operation list), {storage with pending_manager = None})

  [@entry]
  let acceptManager (_ : unit) (storage : storage) : result =
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else
          match storage.pending_manager with
          | Some pending ->
              if Tezos.get_sender () = pending then
                (([] : operation list),
                 {storage with manager = pending; pending_manager = None})
              else
                (failwith error_ONLY_PENDING_MANAGER_CAN_ACCEPT : result)
          | _ ->
              (failwith error_ONLY_PENDING_MANAGER_CAN_ACCEPT : result)

  // set lqt_address
  [@entry]
  let setLqtAddress (lqtAddress : address) (storage : storage) : result =
      if storage.selfIsUpdatingTokenPool then
          (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if Tezos.get_amount () > 0mutez then
          (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if Tezos.get_sender () <> storage.manager then
          (failwith error_ONLY_MANAGER_CAN_SET_LQT_ADRESS : result)
      else if storage.lqtAddress <> ("tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU" : address) then
          (failwith error_LQT_ADDRESS_ALREADY_SET : result)
      else
          (([] : operation list), {storage with lqtAddress = lqtAddress})

  [@entry]
  let updateTokenPool (_ : unit) (storage : storage) : result =
      if Tezos.get_sender () <> Tezos.get_source () then 
          (failwith error_CALL_NOT_FROM_AN_IMPLICIT_ACCOUNT : result)
      else if Tezos.get_amount () > 0mutez then
        (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if storage.selfIsUpdatingTokenPool then
        (failwith error_UNEXPECTED_REENTRANCE_IN_UPDATE_TOKEN_POOL : result)
      else if storage.active && storage.paused then
        (failwith error_POOL_PAUSED : result)
      else if not storage.active && Tezos.get_sender () <> storage.manager then
        (failwith error_ONLY_MANAGER_CAN_INITIALIZE_POOL : result)
      else
        let self_addr = Tezos.get_self_address () in
        let cfmm_update_token_pool_internal : update_token_pool_internal contract = 
          (match (Tezos.get_entrypoint_opt "%updateTokenPoolInternal" self_addr : update_token_pool_internal contract option) with
          | None -> (failwith "Cannot get updateTokenPoolInternal entrypoint" : update_token_pool_internal contract)
          | Some contract -> contract) in
  #if FA2
        let token_balance_of : balance_of contract = (match
          (Tezos.get_entrypoint_opt "%balance_of" storage.tokenAddress : balance_of contract option) with
          | None -> (failwith error_INVALID_FA2_TOKEN_CONTRACT_MISSING_BALANCE_OF : balance_of contract)
          | Some contract -> contract) in
        let op = Tezos.transaction ([(Tezos.get_self_address (), storage.tokenId)], cfmm_update_token_pool_internal) 0mutez token_balance_of in
  #else
        let token_get_balance : get_balance contract = (match
          (Tezos.get_entrypoint_opt "%getBalance" storage.tokenAddress : get_balance contract option) with
          | None -> (failwith error_INVALID_FA12_TOKEN_CONTRACT_MISSING_GETBALANCE : get_balance contract)
          | Some contract -> contract) in
        let op = Tezos.transaction (Tezos.get_self_address (), cfmm_update_token_pool_internal) 0mutez token_get_balance in
  #endif
        ([ op ], {storage with selfIsUpdatingTokenPool = true})

  [@entry]
  let updateTokenPoolInternal (token_pool : update_token_pool_internal) (storage : storage) : result =
      if (not storage.selfIsUpdatingTokenPool or Tezos.get_sender () <> storage.tokenAddress) then
        (failwith error_THIS_ENTRYPOINT_MAY_ONLY_BE_CALLED_BY_GETBALANCE_OF_TOKENADDRESS : result)
      else if Tezos.get_amount () > 0mutez then
        (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else 
  #if FA2
          let token_pool =
            match token_pool with
              [((owner, token_id), balance)] ->
                if
                  owner = Tezos.get_self_address ()
                  && token_id = storage.tokenId
                then balance
                else (failwith error_INVALID_FA2_BALANCE_RESPONSE : nat)
            | _ -> (failwith error_INVALID_FA2_BALANCE_RESPONSE : nat) in
  #endif
          // Subtract accumulated token fee from the real balance to get the true pool size.
          // The contract holds tokenPool + accumulated_protocol_fee_token tokens in total,
          // but only tokenPool participates in AMM calculations.
          let adjusted_token_pool = match is_nat (token_pool - storage.accumulated_protocol_fee_token) with
              | None -> (failwith error_ACCUMULATED_FEE_EXCEEDS_TOKEN_POOL : nat)
              | Some n -> n in
          let storage = {storage with tokenPool = adjusted_token_pool ; selfIsUpdatingTokenPool = false} in
          (([ ] : operation list), storage)

  [@entry]
  let tokenToToken (param : token_to_token) (storage : storage) : result =
      let { outputDexterContract = outputDexterContract ;
            minTokensBought = minTokensBought ;
            to_ = to_ ;
            tokensSold = tokensSold ;
            deadline = deadline } = param in

      let outputDexterContract_contract: xtz_to_token contract =
          (match (Tezos.get_entrypoint_opt "%xtzToToken" outputDexterContract : xtz_to_token contract option) with
              | None -> (failwith error_INVALID_INTERMEDIATE_CONTRACT :  xtz_to_token contract)
              | Some c -> c) in
    
      if storage.selfIsUpdatingTokenPool then
        (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
      else if not (pool_is_ready storage) then
        (failwith error_POOL_NOT_ACTIVE : result)
      else if storage.paused then
        (failwith error_POOL_PAUSED : result)
      else if Tezos.get_amount () > 0mutez then
        (failwith error_AMOUNT_MUST_BE_ZERO : result)
      else if Tezos.get_now () >= deadline then
        (failwith error_THE_CURRENT_TIME_MUST_BE_LESS_THAN_THE_DEADLINE : result)
      else 
          // we don't check that tokenPool > 0, because that is impossible unless all liquidity has been removed
          let protocol_fee = compute_protocol_fee tokensSold in
          let pool_tokens_sold : nat = match is_nat (tokensSold - protocol_fee) with
              | None -> (failwith error_PROTOCOL_FEE_EXCEEDS_AMOUNT : nat)
              | Some n -> n in
          let xtz_bought_nat =
              (tokensSold * swap_fee_numerator * (mutez_to_natural storage.xtzPool)) / (storage.tokenPool * 1000n + (tokensSold * swap_fee_numerator)) in

          let xtz_pool_nat = mutez_to_natural storage.xtzPool in
          let new_xtz_pool_nat = match is_nat (xtz_pool_nat - xtz_bought_nat) with
              | None -> (failwith error_XTZ_POOL_UNDERFLOW : nat)
              | Some n -> n in
          let new_xtzPool = natural_to_mutez new_xtz_pool_nat in
          let xtz_bought = natural_to_mutez xtz_bought_nat in

          let storage = {storage with
              tokenPool = storage.tokenPool + pool_tokens_sold ;
              xtzPool = new_xtzPool ;
              accumulated_protocol_fee_token = storage.accumulated_protocol_fee_token + protocol_fee } in
          
          let op1 = token_transfer storage (Tezos.get_sender ()) (Tezos.get_self_address ()) tokensSold in
          let op2 =
            Tezos.transaction
              {to_ = to_; minTokensBought = minTokensBought; deadline = deadline}
              xtz_bought
              outputDexterContract_contract in
          ([op1; op2] , storage)

    [@entry]
    let activate (param : activate_pool) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if Tezos.get_sender () <> storage.manager then
            (failwith error_ONLY_MANAGER_CAN_INITIALIZE_POOL : result)
        else if storage.active or storage.activationPending then
            (failwith error_POOL_ALREADY_ACTIVE : result)
        else if storage.lqtAddress = ("tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU" : address) then
            (failwith error_LQT_ADDRESS_NOT_CONFIGURED : result)
        else if
            param.expectedXtzPool = 0mutez
            or param.expectedTokenPool = 0n
            or param.expectedLqtTotal <= minimum_lqt
            or storage.xtzPool <> param.expectedXtzPool
            (* Token contracts can transfer directly to this address while the
               pool is inactive. Treat the configured token seed as a minimum
               so donated excess benefits LPs instead of blocking activation. *)
            or storage.tokenPool < param.expectedTokenPool
            or storage.lqtTotal <> param.expectedLqtTotal
            or Tezos.get_balance () <> param.expectedXtzPool
        then
            (failwith error_INVALID_INITIAL_RESERVES : result)
        else
            let self_addr = Tezos.get_self_address () in
            let activate_internal : nat contract =
                match
                  (Tezos.get_entrypoint_opt
                    "%activateInternal"
                    self_addr
                    : nat contract option)
                with
                | None ->
                    (failwith "Cannot get activateInternal entrypoint" : nat contract)
                | Some contract -> contract in
            let lqt_get_total_supply : getTotalSupply contract =
                match
                  (Tezos.get_entrypoint_opt
                    "%getTotalSupply"
                    storage.lqtAddress
                    : getTotalSupply contract option)
                with
                | None ->
                    (failwith
                      error_LQT_CONTRACT_MUST_HAVE_A_GET_TOTAL_SUPPLY_ENTRYPOINT
                      : getTotalSupply contract)
                | Some contract -> contract in
            let op =
                Tezos.transaction
                  {request = (); callback = activate_internal}
                  0mutez
                  lqt_get_total_supply in
            ([op], {storage with activationPending = true})

    [@entry]
    let activateInternal (actual_lqt_total : nat) (storage : storage) : result =
        if
          not storage.activationPending
          or Tezos.get_sender () <> storage.lqtAddress
        then
            (failwith error_INVALID_ACTIVATION_CALLBACK : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if actual_lqt_total <> storage.lqtTotal then
            (failwith error_LQT_TOTAL_MISMATCH : result)
        else if
          storage.xtzPool = 0mutez
          or storage.tokenPool = 0n
          or storage.lqtTotal <= minimum_lqt
        then
            (failwith error_INVALID_INITIAL_RESERVES : result)
        else
            (([] : operation list),
             {storage with active = true; activationPending = false})

    [@entry]
    let proposeProtocolFeeRecipient (new_recipient : address) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if Tezos.get_sender () <> storage.manager then
            (failwith error_ONLY_MANAGER_CAN_SET_PROTOCOL_FEE_RECIPIENT : result)
        else
            let () = assert_valid_admin_address new_recipient in
            (([] : operation list),
             {storage with pending_protocol_fee_recipient = Some new_recipient})

    [@entry]
    let cancelProtocolFeeRecipient (_ : unit) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if Tezos.get_sender () <> storage.manager then
            (failwith error_ONLY_MANAGER_CAN_SET_PROTOCOL_FEE_RECIPIENT : result)
        else
            (([] : operation list),
             {storage with pending_protocol_fee_recipient = None})

    [@entry]
    let acceptProtocolFeeRecipient (_ : unit) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else
            match storage.pending_protocol_fee_recipient with
            | Some pending ->
                if Tezos.get_sender () = pending then
                  (([] : operation list),
                   {storage with
                      protocol_fee_recipient = pending;
                      pending_protocol_fee_recipient = None})
                else
                  (failwith
                     error_ONLY_PENDING_PROTOCOL_FEE_RECIPIENT_CAN_ACCEPT
                     : result)
            | _ ->
                (failwith
                   error_ONLY_PENDING_PROTOCOL_FEE_RECIPIENT_CAN_ACCEPT
                   : result)

    [@entry]
    let claimProtocolFeeXtz (_ : unit) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if Tezos.get_sender () <> storage.protocol_fee_recipient then
            (failwith error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE : result)
        else if storage.accumulated_protocol_fee_xtz = 0mutez then
            (failwith error_NO_PROTOCOL_FEE_TO_CLAIM : result)
        else
            let amount_to_send = storage.accumulated_protocol_fee_xtz in
            let storage = {storage with accumulated_protocol_fee_xtz = 0mutez} in
            let op = xtz_transfer storage.protocol_fee_recipient amount_to_send in
            ([op], storage)

    [@entry]
    let claimProtocolFeeToken (_ : unit) (storage : storage) : result =
        if storage.selfIsUpdatingTokenPool then
            (failwith error_SELF_IS_UPDATING_TOKEN_POOL_MUST_BE_FALSE : result)
        else if Tezos.get_amount () > 0mutez then
            (failwith error_AMOUNT_MUST_BE_ZERO : result)
        else if Tezos.get_sender () <> storage.protocol_fee_recipient then
            (failwith error_ONLY_RECIPIENT_CAN_CLAIM_PROTOCOL_FEE : result)
        else if storage.accumulated_protocol_fee_token = 0n then
            (failwith error_NO_PROTOCOL_FEE_TO_CLAIM : result)
        else
            let amount_to_send = storage.accumulated_protocol_fee_token in
            let storage = {storage with accumulated_protocol_fee_token = 0n} in
            let op = token_transfer storage (Tezos.get_self_address ()) storage.protocol_fee_recipient amount_to_send in
            ([op], storage)

  // =============================================================================
  // On-chain Views
  // =============================================================================

  [@view]
  let get_reserves (_ : unit) (storage : storage) : (nat * nat) =
      let tez_pool : nat = mutez_to_natural storage.xtzPool in
      let token_pool : nat = storage.tokenPool in
      (tez_pool, token_pool)

  [@view]
  let get_lqt_total (_ : unit) (storage : storage) : nat =
      storage.lqtTotal

  [@view]
  let get_minimum_lqt (_ : unit) (_storage : storage) : nat =
      minimum_lqt

  [@view]
  let is_active (_ : unit) (storage : storage) : bool =
      pool_is_ready storage

  [@view]
  let is_paused (_ : unit) (storage : storage) : bool =
      storage.paused

  [@view]
  let get_fee_bp (_ : unit) (_storage : storage) : (nat * nat * nat) =
      (lp_fee_bp, protocol_fee_bp, total_fee_bp)

  [@view]
  let quote_tez_to_token (tez_in : nat) (storage : storage) : nat =
      let a : nat = mutez_to_natural storage.xtzPool in
      let b : nat = storage.tokenPool in
      if not storage.active or storage.paused or tez_in = 0n or a = 0n or b = 0n then
          0n
      else
        (tez_in * swap_fee_numerator * b) / (a * 1000n + tez_in * swap_fee_numerator)

  [@view]
  let quote_token_to_tez (token_in : nat) (storage : storage) : nat =
      let a : nat = mutez_to_natural storage.xtzPool in
      let b : nat = storage.tokenPool in
      if not storage.active or storage.paused or token_in = 0n or a = 0n or b = 0n then
          0n
      else
        (token_in * swap_fee_numerator * a) / (b * 1000n + token_in * swap_fee_numerator)

  type build_storage =
  { lqtTotal : nat;
    manager : address;
    tokenAddress : address;
#if FA2
    tokenId : nat;
#endif
    protocol_fee_recipient : address ;
  }

  let build_storage (build : build_storage) : storage =
  { tokenPool = 0n ;
    xtzPool = 0tz ;
    lqtTotal = build.lqtTotal ;
    active = false ;
    paused = true ;
    activationPending = false ;
    selfIsUpdatingTokenPool = false ;
    freezeBaker = false ;
    manager = build.manager ;
    pending_manager = None ;
    tokenAddress = build.tokenAddress ;
    #if FA2
    tokenId = build.tokenId ;
    #endif
    lqtAddress = ("tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU" : address) ;
    protocol_fee_recipient = build.protocol_fee_recipient ;
    pending_protocol_fee_recipient = None ;
    accumulated_protocol_fee_xtz = 0mutez ;
    accumulated_protocol_fee_token = 0n ;
  }

end
