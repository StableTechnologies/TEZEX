import smartpy as sp

# Contract for fa1.2 and xtz swaps

FA12 = sp.io.import_script_from_url("file:Fa12.py", name="FA12")

"""
Swap record -
    swapHash(bytes): current swap hash
    initiator(address): initiators tezos address
    refundTimestamp(timestamp): unix time(sec) after which the swap expires
    value(nat): value of the swap in mutez
    expected(nat): expected value in return
    pair(string): the swap asset pair being exchanged eg. "ethtz/usdtz"
    asset(string): the token asset being offered eg. "usdtz"
    commission(nat): amount of commission paid for the swap
"""
TSwap = sp.TRecord(swapHash=sp.TBytes, initiator=sp.TAddress, value=sp.TNat, refundTimestamp=sp.TTimestamp, expected=sp.TNat, pair=sp.TString, asset=sp.TString, commission=sp.TNat)

"""
Pair record -
    key(string): single asset type from a asset pair
    value: 
        counterAsset(string): the other asset in the pair
        contract(address): the address of the asset contract(fa1.2 tokens)
        decimals(nat): the no. of decimals places used in the asset
"""
TPair = sp.TMap(sp.TString, sp.TRecord(counterAsset=sp.TString, contract=sp.TAddress, decimals=sp.TNat))

"""
Transfer record (fa1.2)-
    from_(address): sender tezos address
    to_(address): recipient tezos address
    value(nat): value to transfer
"""
TTransfer = sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value")))

class Swap(sp.Contract):
    def __init__(self, _admin, _swapFee, _commission):
        """
            admin(address): address of admin account
            active(bool): shows whether the contract is active or not
            swapFee(nat): fee in bips that the change-makers take for a swap
            commission(nat): fee taken by the contract for facilitating the swaps in mutez
            userXTZDeposit(nat): amount of user xtz(mutez) currently locked in the contract
            swaps(map of TSwap): map of all the active swaps
            pairs(map of TPair): map of all the valid swap pairs supported
        """
        self.init(admin=_admin, active=sp.bool(False), swapFee=sp.as_nat(_swapFee), commission=sp.as_nat(_commission), userXTZDeposit=sp.as_nat(0), swaps=sp.big_map(tkey=sp.TBytes, tvalue=TSwap),pairs=sp.big_map(tkey=sp.TString,tvalue=TPair))

    """
        ensures only admin can call a function
    """

    def onlyByAdmin(self):
        sp.verify(sp.sender == self.data.admin,"ONLY_ADMIN")

    """
        checks if the contract is active
    """

    def contractIsActive(self):
        sp.verify(self.data.active == sp.bool(True),"CONTRACT_INACTIVE")

    """
        checks whether a swap can be initiated

        args:
            _swapHash: swap hash
            _refundTimestamp: unix time(sec) after which the swap expires
    """

    def isInitiable(self, _swapHash, _refundTimestamp, _pair, _asset):
        self.contractIsActive()
        sp.verify(~self.data.swaps.contains(_swapHash), "HASH_ALREADY_EXISTS")
        sp.verify(sp.now < _refundTimestamp, "REFUND_TIME_ALREADY_ARRIVED")
        sp.verify(self.data.pairs.contains(_pair),"INVALID_PAIR")
        sp.verify(self.data.pairs[_pair].contains(_asset),"INVALID_ASSET")

    """
        checks whether the swap can be redeemed

        args:
            _swapHash: swap hash
            _secret: secret for the swap which produced the corresponding swapHash
    """

    def isRedeemable(self, _swapHash, _value, _pair, _asset):
        self.contractIsActive()
        sp.verify(self.data.swaps[_swapHash].refundTimestamp > sp.now)
        sp.verify(self.data.swaps[_swapHash].pair==_pair,"INVALID_PAIR")
        sp.verify(self.data.pairs[_pair][self.data.swaps[_swapHash].asset].counterAsset==_asset,"INVALID_ASSET")
        sp.verify(self.data.swaps[_swapHash].expected == _value, "WRONG_AMOUNT")

    """
        checks whether the swap can bve refunded

        args:
            _swapHash: swap hash
    """

    def isRefundable(self, _swapHash):
        sp.verify(self.data.swaps.contains(_swapHash), "INVALID_HASH")
        sp.verify(self.data.swaps[_swapHash].refundTimestamp <= sp.now,"REFUND_TIME_NOT_ARRIVED")

    """
        Default entrypoint for 

        args:
            _active: boolean value [tru:active, false:inactive] representing contract state
    """

    @sp.entry_point
    def default(self):
        pass
       
    """
        Toggle contract active state

        args:
            _active: boolean value [tru:active, false:inactive] representing contract state
    """ 
    
    @sp.entry_point
    def toggleContractState(self, _active):
        self.onlyByAdmin()
        self.data.active = _active
    
    """
        Update contract admin

        args:
            _admin: new admin addr
    """

    @sp.entry_point
    def updateAdmin(self, _admin):
        self.onlyByAdmin()
        self.data.admin = _admin

    """
        Add or update swap pair

        args:
            _pair: A map of pairs
    """

    @sp.entry_point
    def addSwapPair(self, _pairs):
        self.onlyByAdmin()
        sp.for pair in _pairs.keys():
            self.data.pairs[pair] = _pairs[pair]

    """
        Remove swap pair

        args:
            _pairs: A list of pair names
    """

    @sp.entry_point
    def removeSwapPair(self, _pairs):
        self.onlyByAdmin()
        sp.for pair in _pairs:
            del self.data.pairs[pair]

    """
        Update swap fees

        args:
            _pairs: A list of pair names
    """

    @sp.entry_point
    def updateSwapFees(self, _swapFee, _commission):
        self.onlyByAdmin()
        self.data.commission=_commission
        self.data.swapFee=_swapFee

    """
        Sets baker for the contract

        args:
            _baker: A baker address
    """

    @sp.entry_point
    def setBaker(self, _baker):
        self.onlyByAdmin()
        sp.set_delegate(_baker)

    """
        Transfers the accumulated service fee

        args:
            _to: Account address to transfer the fees
    """

    @sp.entry_point
    def transferFees(self, _to):
        self.onlyByAdmin()
        sp.verify((sp.balance-sp.utils.nat_to_mutez(self.data.userXTZDeposit))>sp.utils.nat_to_mutez(0))
        sp.send(_to, (sp.balance-sp.utils.nat_to_mutez(self.data.userXTZDeposit)))

    """
        Initiate new swap

        args:
            _swapHash: swap hash
            _value: amount of tokens exchanged in the swap
            _expected: amount of tokens expected in return
            _refundTimestamp: unix time(sec) after which the swap expires
            _pair: The swap pair being exchanged
            _asset: Current token 
    """

    @sp.entry_point
    def offer(self, _swapHash, _value, _expected, _refundTimestamp, _pair, _asset):
        self.isInitiable(_swapHash, _refundTimestamp, _pair, _asset)
        sp.if _asset=="xtz":
            sp.verify(sp.amount==sp.utils.nat_to_mutez(_value+self.data.commission),"AMOUNT_MISMATCH")
            self.data.userXTZDeposit+= _value+self.data.commission
        sp.else:
            sp.verify(sp.amount==sp.utils.nat_to_mutez(self.data.commission), "AMOUNT_MISMATCH")
            self.data.userXTZDeposit+= self.data.commission
            c = sp.contract(TTransfer, self.data.pairs[_pair][_asset].contract, entry_point="transfer").open_some()
            transferData = sp.record(from_=sp.sender, to_=sp.self_address, value=_value)
            sp.transfer(transferData, sp.utils.nat_to_mutez(0), c)

        self.data.swaps[_swapHash] = sp.record(swapHash=_swapHash, initiator=sp.sender, refundTimestamp=_refundTimestamp, value=_value, expected=_expected, asset=_asset,pair=_pair, commission=self.data.commission)

    """
        Redeem the swap if possible

        args:
            _swapHash: swap hash
            _value: amount of tokens exchanged in the swap, matches the expected amount for the swap
            _pair: The swap pair being exchanged
            _asset: Current token asset 
    """

    @sp.entry_point
    def take(self, _swapHash, _value, _pair, _asset):
        self.isRedeemable(_swapHash, _value, _pair, _asset)
        sp.if _asset=="xtz":
            sp.verify(sp.amount==sp.utils.nat_to_mutez(_value), "AMOUNT_MISMATCH")
            sp.send(self.data.swaps[_swapHash].initiator, sp.amount)
        sp.else:
            c = sp.contract(TTransfer, self.data.pairs[_pair][_asset].contract, entry_point="transfer").open_some()
            transferData = sp.record(from_=sp.sender, to_=self.data.swaps[_swapHash].initiator, value=_value)
            sp.transfer(transferData, sp.utils.nat_to_mutez(0), c)

        sp.if self.data.swaps[_swapHash].asset=="xtz":
            sp.send(sp.sender, sp.utils.nat_to_mutez(self.data.swaps[_swapHash].value))
            self.data.userXTZDeposit = sp.as_nat(self.data.userXTZDeposit-(self.data.swaps[_swapHash].value+self.data.swaps[_swapHash].commission))
        sp.else:
            self.data.userXTZDeposit = sp.as_nat(self.data.userXTZDeposit-self.data.swaps[_swapHash].commission)
            c = sp.contract(TTransfer, self.data.pairs[_pair][self.data.swaps[_swapHash].asset].contract, entry_point="transfer").open_some()
            transferData = sp.record(from_=sp.self_address, to_=sp.sender, value=self.data.swaps[_swapHash].value)
            sp.transfer(transferData, sp.utils.nat_to_mutez(0), c)

        del self.data.swaps[_swapHash]

    """
        Refund the swap if possible

        args:
            _swapHash: swap hash
    """

    @sp.entry_point
    def refund(self, _swapHash):
        self.isRefundable(_swapHash)

        sp.if self.data.swaps[_swapHash].asset=="xtz":
            sp.send(self.data.swaps[_swapHash].initiator, sp.utils.nat_to_mutez(self.data.swaps[_swapHash].value+self.data.swaps[_swapHash].commission))
            self.data.userXTZDeposit = sp.as_nat(self.data.userXTZDeposit-(self.data.swaps[_swapHash].value+self.data.swaps[_swapHash].commission))
        sp.else:
            self.data.userXTZDeposit = sp.as_nat(self.data.userXTZDeposit-self.data.swaps[_swapHash].commission)
            sp.send(self.data.swaps[_swapHash].initiator, sp.utils.nat_to_mutez(self.data.swaps[_swapHash].commission))
            c = sp.contract(TTransfer, self.data.pairs[self.data.swaps[_swapHash].pair][self.data.swaps[_swapHash].asset].contract, entry_point="transfer").open_some()
            transferData = sp.record(from_=sp.self_address, to_=self.data.swaps[_swapHash].initiator, value=self.data.swaps[_swapHash].value)
            sp.transfer(transferData, sp.utils.nat_to_mutez(0), c)

        del self.data.swaps[_swapHash]

@sp.add_test(name="Tezos Swap")
def test():
    alice = sp.test_account("Alice")
    bob = sp.test_account("Bob")
    admin = sp.test_account("Admin")
    swapHash = sp.bytes("0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")

    swapContract = Swap(_admin=admin.address, _swapFee=15, _commission=1000000)
    token_metadata = {
            "decimals"    : "18",               # Mandatory by the spec
            "name"        : "My Great Token",   # Recommended
            "symbol"      : "MGT",              # Recommended
            # Extra fields
            "icon"        : 'https://smartpy.io/static/img/logo-only.svg'
        }
    contract_metadata = {
        "" : "ipfs://QmaiAUj1FFNGYTu8rLBjc3eeN9cSKwaF8EGMBNDmhzPNFd",
    }
    tokenContract = FA12.FA12(admin.address,
            config              = FA12.FA12_config(support_upgradable_metadata = True),
            token_metadata      = token_metadata,
            contract_metadata   = contract_metadata)

    scenario = sp.test_scenario()
    scenario.table_of_contents()

    scenario.h2("Accounts")
    scenario.show([admin, alice, bob])

    scenario.h2("Swap")
    scenario += swapContract

    scenario.h2("FA1.2")
    scenario += tokenContract

    scenario.h3("Admin mints token balances to participants")
    scenario += tokenContract.mint(address=alice.address, value=2000000).run(sender=admin)
    scenario += tokenContract.mint(address=bob.address, value=3000000).run(sender=admin)

    scenario.h3("Alice & Bob approve token balances for the Swap contract")
    scenario += tokenContract.approve(spender=swapContract.address, value=1900000).run(sender=alice)
    scenario += tokenContract.approve(spender=swapContract.address, value=3000000).run(sender=bob)

    scenario.h2("Swap Scenarios")

    scenario.h3("Alice fails to add a swap pair")
    scenario += swapContract.addSwapPair({"xtz/usdtz":{"xtz": sp.record(counterAsset="usdtz", decimals=6, contract=swapContract.address), "usdtz": sp.record(counterAsset="xtz", decimals=6, contract=tokenContract.address)}}).run(sender=alice, valid=False)

    scenario.h3("Admin adds a swap pair")
    scenario += swapContract.addSwapPair({"xtz/usdtz":{"xtz":sp.record(counterAsset="usdtz",decimals=6,contract=swapContract.address), "usdtz":sp.record(counterAsset="xtz",decimals=6,contract=tokenContract.address)}}).run(sender=admin)

    scenario.h3("Bob fails to offer a swap, swap contract is inactive")
    # no operations work without contract being active
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="xtz").run(sender=bob, amount=sp.tez(3), now=sp.timestamp(159682400), valid=False)

    # activate only by admin
    scenario.h3("Alice fails activate swap contract")
    scenario += swapContract.toggleContractState(True).run(sender=alice, valid=False)

    scenario.h3("Admin activates swap contract")
    scenario += swapContract.toggleContractState(True).run(sender=admin)

    # swap must include service fee
    scenario.h3("Bob fails to offer a swap without service fee included in amount")
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="xtz").run(sender=bob, amount=sp.tez(2), now=sp.timestamp(159682400), valid=False)

    # initiate new swap
    scenario.h3("Bob offers a swap")
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="xtz").run(sender=bob, amount=sp.tez(3), now=sp.timestamp(159682400))

    # cannot initiate new swap with same hash
    scenario.h3("Alice fails to offer a swap with duplicate hash")
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="xtz").run(sender=alice, amount=sp.tez(3), now=sp.timestamp(159682400), valid=False)

    # balance check
    scenario.verify(swapContract.balance == sp.tez(3))

    scenario.h3("Alice fails to take swap below expected return")
    # cannot redeem without value matching the required expected value
    scenario += swapContract.take(_swapHash=swapHash, _value=1800000, _pair="xtz/usdtz", _asset="xtz").run(sender=alice, now=sp.timestamp(159682450), valid=False)

    scenario.h3("Alice takes swap at expected value")
    scenario += swapContract.take(_swapHash=swapHash, _value=1900000, _pair="xtz/usdtz", _asset="usdtz").run(sender=alice, now=sp.timestamp(159682450))

    scenario.verify(swapContract.balance == sp.tez(1))
    scenario.verify(tokenContract.data.balances[bob.address].balance == sp.nat(4900000))

    scenario.h3("Alice fails to update swap fees")
    # update fees only by admin
    scenario += swapContract.updateSwapFees(_swapFee=20, _commission=1500000).run(sender=alice, valid=False)

    scenario.h3("Admin updates swap fees")
    scenario += swapContract.updateSwapFees(_swapFee=20, _commission=1500000).run(sender=admin)

    scenario.h3("Bob fails to offer a swap with outdated fees")
    # need to use updated service fees
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="usdtz").run(sender=bob, amount=sp.tez(1), now=sp.timestamp(159682400), valid=False)

    scenario.h3("Bob offers a new swap with updated commission, reusing a hash")
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="usdtz").run(sender=bob, amount=sp.utils.nat_to_mutez(1500000), now=sp.timestamp(159682400))

    # balance check
    scenario.verify(swapContract.balance == sp.utils.nat_to_mutez(2500000))

    # # cannot be refunded before the refund time
    scenario += swapContract.refund(swapHash).run(sender=bob, now=sp.timestamp(159682450), valid=False)

    scenario.h3("Alice refunds Bob's expired swap")
    # can be refunded by anyone but funds transferred only to initiator after expiry
    scenario += swapContract.refund(swapHash).run(sender=alice, now=sp.timestamp(159682550))

    scenario.h3("Alice fails to refund a removed swap")
    # cannot be refunded again once it has been refunded
    scenario += swapContract.refund(swapHash).run(sender=alice, now=sp.timestamp(159682550), valid=False)
    # balance check [refunded swap service fees are also returned]
    scenario.verify(swapContract.balance == sp.tez(1))

    scenario.h2("Other admin functions")
    scenario.h3("Alice fails to remove a pair")
    # only admin can remove swap pair
    scenario += swapContract.removeSwapPair(["xtz/usdtz"]).run(sender=alice, valid=False)

    scenario.h3("Admin removes a pair")
    scenario += swapContract.removeSwapPair(["xtz/usdtz"]).run(sender=admin)

    # only swap pairs available can be used 
    scenario += swapContract.offer(_swapHash=swapHash, _value=2000000, _expected=1900000, _refundTimestamp=sp.timestamp(159682500), _pair="xtz/usdtz", _asset="xtz").run(sender=bob, amount=sp.utils.nat_to_mutez(3500000), now=sp.timestamp(159682400), valid=False)

    scenario.h3("Alice fails to set a delegate")
    voting_powers = {
        sp.key_hash("tz1YB12JHVHw9GbN66wyfakGYgdTBvokmXQk"): 0,
    }
    # only admin can set baker
    scenario += swapContract.setBaker(sp.some(sp.key_hash("tz1YB12JHVHw9GbN66wyfakGYgdTBvokmXQk"))).run(sender=alice,voting_powers = voting_powers, valid=False)

    scenario.h3("Admin sets a delegate")
    scenario += swapContract.setBaker(sp.some(sp.key_hash("tz1YB12JHVHw9GbN66wyfakGYgdTBvokmXQk"))).run(sender=admin,voting_powers = voting_powers)
    scenario.verify(swapContract.baker==sp.some(sp.key_hash("tz1YB12JHVHw9GbN66wyfakGYgdTBvokmXQk")))

    scenario.h3("Alice fails to withdraw commission fees")
    # only admin can transfer service fees
    scenario += swapContract.transferFees(bob.address).run(sender=alice, valid=False)

    scenario.h3("Update Baker")
    scenario += swapContract.transferFees(bob.address).run(sender=admin)
    scenario.verify(swapContract.balance == sp.tez(0))

    scenario.h3("Transfer rights from Admin to Bob")
    scenario += swapContract.updateAdmin(bob.address).run(sender=admin)

sp.add_compilation_target("TezosSwap", Swap(_admin=sp.address("tz1Y8UNsMSCXyDgma8Ya51eLx8Qu4AoLm8vt"), _swapFee=15, _commission=0), storage=None)