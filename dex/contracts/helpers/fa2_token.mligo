(* --------------------------------------------------------------------------- *)
(* Errors                                                                       *)
(* --------------------------------------------------------------------------- *)
let not_operator = "FA2_NOT_OPERATOR"

let ins_balance = "FA2_INSUFFICIENT_BALANCE"

let not_available = "FA2_NOT_AVAILABLE"

let undefined_token = "FA2_UNDEFINED_TOKEN"

(* --------------------------------------------------------------------------- *)
(* TZIP-16 metadata                                                             *)
(* --------------------------------------------------------------------------- *)
type metadata = (string, bytes) big_map

(* --------------------------------------------------------------------------- *)
(* TZIP-12 datatypes                                                            *)
(* --------------------------------------------------------------------------- *)
type token_id = nat

type tokenMetadataData =
  {
   token_id : token_id;
   token_info : (string, bytes) map
  }

type tokenMetadata = (token_id, tokenMetadataData) big_map

type atomic_trans =
  [@layout comb]
  {
   to_ : address;
   token_id : token_id;
   amount : nat
  }

type transfer_from =
  [@layout comb]
  {
   from_ : address;
   txs : atomic_trans list
  }

type transfer = transfer_from list

type request =
  [@layout comb]
  {
   owner : address;
   token_id : token_id
  }

type callback =
  [@layout comb]
  {
   request : request;
   balance : nat
  }

type balance_of =
  [@layout comb]
  {
   requests : request list;
   callback : (callback list) contract
  }

type operator =
  [@layout comb]
  {
   owner : address;
   operator : address;
   token_id : token_id
  }

type unit_update =
| Add_operator of operator
| Remove_operator of operator

type update_operators = unit_update list

(* --------------------------------------------------------------------------- *)
(* Assertions                                                                   *)
(* --------------------------------------------------------------------------- *)
let assert_update_permission (owner : address) : unit =
  Assert.Error.assert (owner = Tezos.get_sender ()) "NOT_OWNER"

let assert_token_exist (token_metadata : tokenMetadata) (token_id : token_id)
: unit =
  Assert.Error.assert (Big_map.mem token_id token_metadata) undefined_token

(* --------------------------------------------------------------------------- *)
(* Storage types                                                                *)
(* --------------------------------------------------------------------------- *)
type ledger = (address, nat) big_map

type operators = (address, address set) big_map

type storage =
  {
   ledger : ledger;
   operators : operators;
   token_metadata : tokenMetadata;
   metadata : metadata
  }

type ret = operation list * storage

(* --------------------------------------------------------------------------- *)
(* Default / empty storage                                                      *)
(* --------------------------------------------------------------------------- *)
let empty_storage : storage =
  {
   ledger = (Big_map.empty : ledger);
   operators = (Big_map.empty : operators);
   token_metadata = (Big_map.empty : tokenMetadata);
   metadata = (Big_map.empty : metadata)
  }

(* Helper to build storage with an initial balance for a single token *)
let make_storage (owner : address) (initial_balance : nat) (token_id : token_id)
: storage =
  {
   ledger = Big_map.literal [(owner, initial_balance)];
   operators = (Big_map.empty : operators);
   token_metadata =
     Big_map.literal
       [
         (token_id,
          {
           token_id = token_id;
           token_info =
             (Map.literal
                [
                  ("name", Bytes.pack ("FA2 Token" : string));
                  ("symbol", Bytes.pack ("FA2" : string));
                  ("decimals", Bytes.pack ("0" : string))
                ]
              : (string, bytes) map)
          })
       ];
   metadata = (Big_map.empty : metadata)
  }

(* --------------------------------------------------------------------------- *)
(* Operator helpers                                                             *)
(* --------------------------------------------------------------------------- *)
let assert_authorisation (operators : operators) (from_ : address) : unit =
  let sender_ = Tezos.get_sender () in
  if sender_ = from_
  then ()
  else
    let authorized =
      match Big_map.find_opt from_ operators with
        Some a -> a
      | None -> Set.empty in
    if Set.mem sender_ authorized then () else failwith not_operator

let add_operator (operators : operators) (owner : address) (op : address)
: operators =
  if owner = op
  then operators
  else
    let () = assert_update_permission owner in
    let auths =
      match Big_map.find_opt owner operators with
        Some os -> os
      | None -> Set.empty in
    Big_map.update owner (Some (Set.add op auths)) operators

let remove_operator (operators : operators) (owner : address) (op : address)
: operators =
  if owner = op
  then operators
  else
    let () = assert_update_permission owner in
    let auths =
      match Big_map.find_opt owner operators with
        None -> None
      | Some os ->
          let os = Set.remove op os in
          if Set.size os = 0n then None else Some os in
    Big_map.update owner auths operators

(* --------------------------------------------------------------------------- *)
(* Ledger helpers                                                               *)
(* --------------------------------------------------------------------------- *)
let get_for_user (ledger : ledger) (owner : address) : nat =
  match Big_map.find_opt owner ledger with
    Some tokens -> tokens
  | None -> 0n

let update_for_user (ledger : ledger) (owner : address) (amount_ : nat) : ledger =
  Big_map.update owner (Some amount_) ledger

let decrease_token_amount_for_user
  (ledger : ledger)
  (from_ : address)
  (amount_ : nat)
: ledger =
  let tokens = get_for_user ledger from_ in
  let () = Assert.Error.assert (tokens >= amount_) ins_balance in
  let tokens = abs (tokens - amount_) in
  update_for_user ledger from_ tokens

let increase_token_amount_for_user
  (ledger : ledger)
  (to_ : address)
  (amount_ : nat)
: ledger =
  let tokens = get_for_user ledger to_ in
  update_for_user ledger to_ (tokens + amount_)

(* --------------------------------------------------------------------------- *)
(* Entrypoints                                                                  *)
(* --------------------------------------------------------------------------- *)

[@entry]
let transfer (t : transfer) (s : storage) : ret =
  let process_atomic_transfer
    (from_ : address)
    (ledger, tx : ledger * atomic_trans) =
    let {
     to_;
     token_id = _;
     amount = amount_
    } = tx in
    let () = assert_authorisation s.operators from_ in
    let ledger = decrease_token_amount_for_user ledger from_ amount_ in
    let ledger = increase_token_amount_for_user ledger to_ amount_ in
    ledger in
  let process_single_transfer (ledger, t : ledger * transfer_from) =
    let {
     from_;
     txs
    } = t in
    List.fold_left (process_atomic_transfer from_) ledger txs in
  let ledger = List.fold_left process_single_transfer s.ledger t in
  ([] : operation list), {s with ledger = ledger}

[@entry]
let balance_of (b : balance_of) (s : storage) : ret =
  let {
   requests;
   callback
  } = b in
  let get_balance_info (request : request) : callback =
    let {
     owner;
     token_id = _
    } = request in
    let balance_ = get_for_user s.ledger owner in
    {
     request = request;
     balance = balance_
    } in
  let callback_param = List.map get_balance_info requests in
  let operation = Tezos.transaction callback_param 0mutez callback in
  ([operation] : operation list), s

[@entry]
let update_operators (updates : update_operators) (s : storage) : ret =
  let update_operator (operators, update : operators * unit_update) =
    match update with
      Add_operator
        {
         owner;
         operator;
         token_id = _
        } -> add_operator operators owner operator
    | Remove_operator
        {
         owner;
         operator;
         token_id = _
        } -> remove_operator operators owner operator in
  let operators = List.fold_left update_operator s.operators updates in
  ([] : operation list), {s with operators = operators}

(* --------------------------------------------------------------------------- *)
(* Views                                                                        *)
(* --------------------------------------------------------------------------- *)

[@view]
let get_balance (p : address * nat) (s : storage) : nat =
  let (owner, token_id) = p in
  let () = assert_token_exist s.token_metadata token_id in
  get_for_user s.ledger owner

[@view]
let total_supply (_token_id : nat) (_s : storage) : nat = failwith not_available

[@view]
let all_tokens (_ : unit) (_s : storage) : nat set = failwith not_available

[@view]
let is_operator (op : operator) (s : storage) : bool =
  let authorized =
    match Big_map.find_opt op.owner s.operators with
      Some opSet -> opSet
    | None -> Set.empty in
  Set.mem op.operator authorized || op.owner = op.operator

[@view]
let token_metadata (p : nat) (s : storage) : tokenMetadataData =
  match Big_map.find_opt p s.token_metadata with
    Some data -> data
  | None -> failwith undefined_token
