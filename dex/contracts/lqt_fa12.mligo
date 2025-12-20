module LQT = struct
  type transfer =
    [@layout comb]
    {
     [@annot from]
     address_from
     : address;
     [@annot to]
     address_to
     : address;
     value : nat
    }

  type approve =
    [@layout comb]
    {
     spender : address;
     value : nat
    }

  type mintOrBurn =
    [@layout comb]
    {
     quantity : int;
     target : address
    }

  type allowance_key =
    [@layout comb]
    {
     owner : address;
     spender : address
    }

  type getAllowance =
    [@layout comb]
    {
     request : allowance_key;
     callback : nat contract
    }

  type getBalance =
    [@layout comb]
    {
     owner : address;
     callback : nat contract
    }

  type getTotalSupply =
    [@layout comb]
    {
     request : unit;
     callback : nat contract
    }

  type tokens = (address, nat) big_map

  type allowances = (allowance_key, nat) big_map

  type token_metadata_value =
    [@layout comb]
    {
     token_id : nat;
     token_info : (string, bytes) map
    }

  type storage =
    [@layout comb]
    {
     tokens : tokens;
     allowances : allowances;
     admin : address;
     total_supply : nat;
     metadata : (string, bytes) big_map;
     token_metadata : (nat, token_metadata_value) big_map
    }

  type result = operation list * storage

  [@inline]
  let maybe (n : nat) : nat option = if n = 0n then (None : nat option) else Some n

  [@entry]
  let transfer (param : transfer) (storage : storage) : result =
    let allowances = storage.allowances in
    let tokens = storage.tokens in
    let allowances =
      if Tezos.get_sender () = param.address_from
      then allowances
      else
        let allowance_key =
          {
           owner = param.address_from;
           spender = Tezos.get_sender ()
          } in
        let authorized_value =
          match Big_map.find_opt allowance_key allowances with
            Some value -> value
          | None -> 0n in
        let authorized_value =
          match is_nat (authorized_value - param.value) with
            None -> (failwith "NotEnoughAllowance" : nat)
          | Some authorized_value -> authorized_value in
        Big_map.update allowance_key (maybe authorized_value) allowances in
    let tokens =
      let from_balance =
        match Big_map.find_opt param.address_from tokens with
          Some value -> value
        | None -> 0n in
      let from_balance =
        match is_nat (from_balance - param.value) with
          None -> (failwith "NotEnoughBalance" : nat)
        | Some from_balance -> from_balance in
      Big_map.update param.address_from (maybe from_balance) tokens in
    let tokens =
      let to_balance =
        match Big_map.find_opt param.address_to tokens with
          Some value -> value
        | None -> 0n in
      let to_balance = to_balance + param.value in
      Big_map.update param.address_to (maybe to_balance) tokens in
    (([] : operation list), {storage with tokens = tokens; allowances = allowances})

  [@entry]
  let approve (param : approve) (storage : storage) : result =
    let allowances = storage.allowances in
    let allowance_key =
      {
       owner = Tezos.get_sender ();
       spender = param.spender
      } in
    let previous_value =
      match Big_map.find_opt allowance_key allowances with
        Some value -> value
      | None -> 0n in
    begin
      if previous_value > 0n && param.value > 0n
      then (failwith "UnsafeAllowanceChange")
      else ();
      let allowances = Big_map.update allowance_key (maybe param.value) allowances in
      (([] : operation list), {storage with allowances = allowances})
    end

  [@entry]
  let mintOrBurn (param : mintOrBurn) (storage : storage) : result =
    begin
      if Tezos.get_sender () <> storage.admin
      then failwith "OnlyAdmin"
      else ();
      let tokens = storage.tokens in
      let old_balance =
        match Big_map.find_opt param.target tokens with
          None -> 0n
        | Some bal -> bal in
      let new_balance =
        match is_nat (old_balance + param.quantity) with
          None -> (failwith "Cannot burn more than the target's balance." : nat)
        | Some bal -> bal in
      let tokens = Big_map.update param.target (maybe new_balance) storage.tokens in
      let total_supply = abs (storage.total_supply + param.quantity) in
      (([] : operation list), {storage with tokens = tokens; total_supply = total_supply})
    end

  [@entry]
  let getAllowance (param : getAllowance) (storage : storage) : result =
    let value =
      match Big_map.find_opt param.request storage.allowances with
        Some value -> value
      | None -> 0n in
    ([Tezos.transaction value 0mutez param.callback], storage)

  [@entry]
  let getBalance (param : getBalance) (storage : storage) : result =
    let value =
      match Big_map.find_opt param.owner storage.tokens with
        Some value -> value
      | None -> 0n in
    ([Tezos.transaction value 0mutez param.callback], storage)

  [@entry]
  let getTotalSupply (param : getTotalSupply) (storage : storage) : result =
    let total = storage.total_supply in
    ([Tezos.transaction total 0mutez param.callback], storage)
  end
