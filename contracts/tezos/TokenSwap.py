import smartpy as sp

FA12 = sp.io.import_script_from_url("file:Fa12.py", name="FA12")

"""
Possible states of the swap
"""


class State():
    Waiting = 1
    Initiated = 2


"""
Swap record - 
    hashedSecret(bytes): current swap hash
    initiator(address): initiators tezos address
    initiator_eth_addr(string): initiators ethereum address
    participant(address): counter-party/participant's tezos address
    refundTimestamp(timestamp): unix time(sec) after which the swap expires
    value(nat): value of the swap in fa1.2 tokens
    state(State): current state of swap
"""
Swap = sp.TRecord(hashedSecret=sp.TBytes, initiator_eth_addr=sp.TString, initiator=sp.TAddress,
                  participant=sp.TAddress, refundTimestamp=sp.TTimestamp, value=sp.TNat, state=sp.TInt)

"""
Contract Storage -
    admin(address): tezos address of the admin
    reward(nat): reward in basis points for swap response
    fa12(address): fa1.2 contract address
    active(bool): contract state [true:active, false:inactive]
    swaps(big_map(bytes,Swap)): map of hashed secrets and swap details
"""


class TokenSwap(sp.Contract):
    def __init__(self, _admin, _fa12):
        self.init(admin=_admin, reward=sp.as_nat(15), fa12=_fa12, active=sp.bool(False),
                  swaps=sp.big_map(tkey=sp.TBytes, tvalue=Swap))

    """
        ensures only admin can call a function 
    """

    def onlyByAdmin(self):
        sp.verify(sp.sender == self.data.admin)

    """
        ensures only initiator of the swap can call a function 
        
        args:
            _hashedSecret: hashed secret of the swap
    """

    def onlyByInitiator(self, _hashedSecret):
        sp.verify(sp.sender == self.data.swaps[_hashedSecret].initiator)

    """
        checks if the contract is active
    """

    def contractIsActive(self):
        sp.verify(self.data.active == sp.bool(True))

    """
        checks whether a swap can be initiated

        args: 
            _hashedSecret: hashed secret of the swap
            _refundTimestamp: unix time(sec) after which the swap expires
    """

    def isInitiable(self, _hashedSecret, _refundTimestamp):
        sp.verify(~self.data.swaps.contains(_hashedSecret))
        sp.verify(sp.now < _refundTimestamp)

    """
        ensures the currest swap state matches the required `state`

        args: 
            _hashedSecret: hashed secret of the swap
            _state: state the current swap is expected to be in
    """

    def checkState(self, _hashedSecret, _state):
        sp.verify(self.data.swaps[_hashedSecret].state == _state)

    """
        checks whether the swap can be redeemed

        args: 
            _hashedSecret: hashed secret of the swap
            _secret: secret for the swap which produced the corresponding hashedSecret
    """

    def isRedeemable(self, _hashedSecret, _secret):
        sp.verify(self.data.swaps[_hashedSecret].refundTimestamp > sp.now)
        sp.verify(self.data.swaps[_hashedSecret].hashedSecret == sp.sha256(
            sp.sha256(_secret)))

    """
        checks whether the swap can bve refunded

        args: 
            _hashedSecret: hashed secret of the swap
    """

    def isRefundable(self, _hashedSecret):
        sp.verify((self.data.swaps[_hashedSecret].state == State.Initiated) | (
            self.data.swaps[_hashedSecret].state == State.Waiting))
        sp.verify(self.data.swaps[_hashedSecret].refundTimestamp <= sp.now)

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
        Update reward for swaps responses

        args:
            _reward: a value representing the reward basis points
    """

    @sp.entry_point
    def updateReward(self, _reward):
        self.onlyByAdmin()
        self.data.reward = _reward

    """
        Initiate new swap without counterParty details

        args:
            _hashedSecret: hash of the current swap secret
            _initiator_eth_addr: tezos address of the current swap initiator
            _amount: amount of fa1.2 tokens exchanged in the swap
            _refundTimestamp: unix time(sec) after which the swap expires
    """

    @sp.entry_point
    def initiateWait(self, _amount, _hashedSecret, _refundTimestamp, initiator_eth_addr):
        self.contractIsActive()
        self.isInitiable(_hashedSecret, _refundTimestamp)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.fa12, entry_point="transfer").open_some()
        transferData = sp.record(
            from_=sp.sender, to_=sp.self_address, value=_amount)
        sp.transfer(transferData, sp.mutez(0), c)
        self.data.swaps[_hashedSecret] = sp.record(hashedSecret=_hashedSecret, initiator_eth_addr=initiator_eth_addr, initiator=sp.sender,
                                                   participant=sp.sender, refundTimestamp=_refundTimestamp, value=_amount, state=State.Waiting)

    """
        Add counter-party details to an existing(initiated) swap

        args:
            _hashedSecret: hashed secret of the swap being updated
            _participant: participant/counter-party tezos address
    """

    @sp.entry_point
    def addCounterParty(self, _hashedSecret, _participant):
        self.contractIsActive()
        self.checkState(_hashedSecret, State.Waiting)
        self.onlyByInitiator(_hashedSecret)
        self.data.swaps[_hashedSecret].state = State.Initiated
        self.data.swaps[_hashedSecret].participant = _participant

    """
        Redeem the swap if possible

        args:
            _hashedSecret: hashed secret of the swap being redeemed
            _secret: secret for the swap which produced the corresponding hashedSecret
    """

    @sp.entry_point
    def redeem(self, _hashedSecret, _secret):
        self.checkState(_hashedSecret, State.Initiated)
        self.isRedeemable(_hashedSecret, _secret)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.fa12, entry_point="transfer").open_some()
        transferData = sp.record(
            from_=sp.self_address, to_=self.data.swaps[_hashedSecret].participant, value=self.data.swaps[_hashedSecret].value)
        sp.transfer(transferData, sp.mutez(0), c)
        del self.data.swaps[_hashedSecret]

    """
        Refund the swap if possible

        args:
            _hashedSecret: hashed secret of the swap being refunded
    """

    @sp.entry_point
    def refund(self, _hashedSecret):
        self.isRefundable(_hashedSecret)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.fa12, entry_point="transfer").open_some()
        transferData = sp.record(
            from_=sp.self_address, to_=self.data.swaps[_hashedSecret].initiator, value=self.data.swaps[_hashedSecret].value)
        sp.transfer(transferData, sp.mutez(0), c)
        del self.data.swaps[_hashedSecret]


@sp.add_test(name="Token Swap")
def test():
    admin = sp.test_account("Administrator")
    alice = sp.test_account("Alice")
    bob = sp.test_account("Bob")
    init_eth = "0x91f79893E7B923410Ef1aEba6a67c6fab0sfsdgffd"
    hashSecret = sp.sha256(sp.sha256(sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")))

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
    c2 = FA12.FA12(admin.address,
            config              = FA12.FA12_config(support_upgradable_metadata = True),
            token_metadata      = token_metadata,
            contract_metadata   = contract_metadata)
    c1 = TokenSwap(_admin=admin.address, _fa12=c2.address)
    scenario = sp.test_scenario()
    scenario.table_of_contents()
    scenario.h1("Atomic Swap")
    scenario += c1

    scenario.h2("Accounts")
    scenario.show([admin, alice, bob])

    scenario.h2("FA1.2")
    scenario.h3("Entry points")
    scenario += c2
    scenario.h3("Admin mints a few coins")
    scenario += c2.mint(address=alice.address, value=12).run(sender=admin)
    scenario += c2.mint(address=alice.address, value=3).run(sender=admin)
    scenario += c2.mint(address=alice.address, value=3).run(sender=admin)
    scenario.h2("Alice approves Contract")
    scenario += c2.approve(spender=c1.address, value=10).run(sender=alice)

    scenario.h2("Swap[Wait] Testing")

    # no operations work without contract being active
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth_addr=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400), valid=False)

    # activate only by admin
    scenario += c1.toggleContractState(True).run(sender=alice, valid=False)
    scenario += c1.toggleContractState(True).run(sender=admin)

    # update reward only by admin
    scenario += c1.updateReward(50).run(sender=alice, valid=False)
    scenario += c1.updateReward(50).run(sender=admin)

    # initiate new swap
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth_addr=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(5))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(13))

    # cannot redeem before it is activated & initiated
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682450), valid=False)

    # successful add participant only by initiator
    scenario += c1.addCounterParty(_hashedSecret=hashSecret,
                                   _participant=bob.address).run(sender=bob, valid=False)

    # successful add participant only by initiator
    scenario += c1.addCounterParty(_hashedSecret=hashSecret,
                                   _participant=bob.address).run(sender=alice)

    # cannot be redeemed with wrong secret
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x12345678aa")).run(sender=bob, now=sp.timestamp(159682450), valid=False)

    # cannot be redeemed after refundtime has come
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682550), valid=False)

    # new swap with the same hash cannot be added unless the previous one is redeemed/refunded
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth_addr=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, amount=sp.tez(2), now=sp.timestamp(159682400), valid=False)

    # successful redeem can be initiated by anyone but funds transfered to participant
    scenario += c1.redeem(_hashedSecret=hashSecret,
                          _secret=sp.bytes("0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682450))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(0))
    scenario.verify(c2.data.balances[bob.address].balance == sp.nat(5))

    # successful swap creation with same hash after redeem
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth_addr=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(5))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(8))

    # cannot be refunded before the refundtime
    scenario += c1.refund(hashSecret).run(sender=bob,
                                          now=sp.timestamp(159682450), valid=False)
    scenario += c1.refund(hashSecret).run(sender=alice,
                                          now=sp.timestamp(159682450), valid=False)

    # can be refunded in any initated or waiting state if refund time has come, can be done by anyone but funds transfered only to initiator
    scenario += c1.refund(hashSecret).run(sender=bob,
                                          now=sp.timestamp(159682550))

    # cannot be refunded again once it has been refunded
    scenario += c1.refund(hashSecret).run(sender=alice,
                                          now=sp.timestamp(159682550), valid=False)

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(0))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(13))

sp.add_compilation_target("TokenSwap", TokenSwap(_admin=sp.address("tz1Y8UNsMSCXyDgma8Ya51eLx8Qu4AoLm8vt"), _fa12=sp.address("KT1Y8UNsMSCXyDgma8Ya51eLx8Qu4AoLm8vt")), storage=None)