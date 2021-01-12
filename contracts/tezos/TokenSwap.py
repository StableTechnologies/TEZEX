import smartpy as sp

# ---------------------FA1.2--------------------------#


class FA12_core(sp.Contract):
    def __init__(self, **extra_storage):
        self.init(balances=sp.big_map(tvalue=sp.TRecord(approvals=sp.TMap(
            sp.TAddress, sp.TNat), balance=sp.TNat)), totalSupply=0, **extra_storage)

    @sp.entry_point
    def transfer(self, params):
        sp.set_type(params, sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                       value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))))
        sp.verify(self.is_administrator(sp.sender) |
                  (~self.is_paused() &
                   ((params.from_ == sp.sender) |
                      (self.data.balances[params.from_].approvals[sp.sender] >= params.value))))
        self.addAddressIfNecessary(params.to_)
        sp.verify(self.data.balances[params.from_].balance >= params.value)
        self.data.balances[params.from_].balance = sp.as_nat(
            self.data.balances[params.from_].balance - params.value)
        self.data.balances[params.to_].balance += params.value
        sp.if (params.from_ != sp.sender) & (~self.is_administrator(sp.sender)):
            self.data.balances[params.from_].approvals[sp.sender] = sp.as_nat(
                self.data.balances[params.from_].approvals[sp.sender] - params.value)

    @sp.entry_point
    def approve(self, params):
        sp.set_type(params, sp.TRecord(spender=sp.TAddress,
                                       value=sp.TNat).layout(("spender", "value")))
        sp.verify(~self.is_paused())
        alreadyApproved = self.data.balances[sp.sender].approvals.get(
            params.spender, 0)
        sp.verify((alreadyApproved == 0) | (
            params.value == 0), "UnsafeAllowanceChange")
        self.data.balances[sp.sender].approvals[params.spender] = params.value

    def addAddressIfNecessary(self, address):
        sp.if ~ self.data.balances.contains(address):
            self.data.balances[address] = sp.record(balance=0, approvals={})

    @sp.view(sp.TNat)
    def getBalance(self, params):
        sp.result(self.data.balances[params].balance)

    @sp.view(sp.TNat)
    def getAllowance(self, params):
        sp.result(self.data.balances[params.owner].approvals[params.spender])

    @sp.view(sp.TNat)
    def getTotalSupply(self, params):
        sp.set_type(params, sp.TUnit)
        sp.result(self.data.totalSupply)

    # this is not part of the standard but can be supported through inheritance.
    def is_paused(self):
        return sp.bool(False)

    # this is not part of the standard but can be supported through inheritance.
    def is_administrator(self, sender):
        return sp.bool(False)


class FA12_mint_burn(FA12_core):
    @sp.entry_point
    def mint(self, params):
        sp.set_type(params, sp.TRecord(address=sp.TAddress, value=sp.TNat))
        sp.verify(self.is_administrator(sp.sender))
        self.addAddressIfNecessary(params.address)
        self.data.balances[params.address].balance += params.value
        self.data.totalSupply += params.value

    @sp.entry_point
    def burn(self, params):
        sp.set_type(params, sp.TRecord(address=sp.TAddress, value=sp.TNat))
        sp.verify(self.is_administrator(sp.sender))
        sp.verify(self.data.balances[params.address].balance >= params.value)
        self.data.balances[params.address].balance = sp.as_nat(
            self.data.balances[params.address].balance - params.value)
        self.data.totalSupply = sp.as_nat(self.data.totalSupply - params.value)


class FA12_administrator(FA12_core):
    def is_administrator(self, sender):
        return sender == self.data.administrator

    @sp.entry_point
    def setAdministrator(self, params):
        sp.set_type(params, sp.TAddress)
        sp.verify(self.is_administrator(sp.sender))
        self.data.administrator = params

    @sp.view(sp.TAddress)
    def getAdministrator(self, params):
        sp.set_type(params, sp.TUnit)
        sp.result(self.data.administrator)


class FA12_pause(FA12_core):
    def is_paused(self):
        return self.data.paused

    @sp.entry_point
    def setPause(self, params):
        sp.set_type(params, sp.TBool)
        sp.verify(self.is_administrator(sp.sender))
        self.data.paused = params


class FA12(FA12_mint_burn, FA12_administrator, FA12_pause, FA12_core):
    def __init__(self, admin):
        FA12_core.__init__(self, paused=False, administrator=admin)


# ------------------------FA1.2----------------------------#


class State():
    Waiting = 0
    Initiated = 1


Swap = sp.TRecord(hashedSecret=sp.TBytes, initiator_eth=sp.TString, initiator=sp.TAddress,
                  participant=sp.TAddress, refundTimestamp=sp.TTimestamp, value=sp.TNat, state=sp.TInt)


class TokenSwap(sp.Contract):
    def __init__(self, _admin, _usdTZ):
        self.init(admin=_admin, reward=5, usdTZ=_usdTZ, active=sp.bool(False),
                  swaps=sp.big_map(tkey=sp.TBytes, tvalue=Swap))

    def onlyByAdmin(self):
        sp.verify(sp.sender == self.data.admin)

    def onlyByInitiator(self, _hashedSecret):
        sp.verify(sp.sender == self.data.swaps[_hashedSecret].initiator)

    def contractIsActive(self):
        sp.verify(self.data.active == sp.bool(True))

    def isInitiatable(self, _hashedSecret, _participant, _refundTimestamp):
        sp.verify(~self.data.swaps.contains(_hashedSecret))
        sp.verify(sp.now < _refundTimestamp)

    def checkState(self, _hashedSecret, _state):
        sp.verify(self.data.swaps[_hashedSecret].state == _state)

    def isRedeemable(self, _hashedSecret, _secret):
        sp.verify(self.data.swaps[_hashedSecret].refundTimestamp > sp.now)
        sp.verify(self.data.swaps[_hashedSecret].hashedSecret == sp.sha256(
            sp.sha256(_secret)))

    def isRefundable(self, _hashedSecret):
        sp.verify((self.data.swaps[_hashedSecret].state == State.Initiated) | (
            self.data.swaps[_hashedSecret].state == State.Waiting))
        sp.verify(self.data.swaps[_hashedSecret].refundTimestamp <= sp.now)

    @sp.entry_point
    def toggleContractState(self, params):
        self.onlyByAdmin()
        self.data.active = params._active

    @sp.entry_point
    def updateReward(self, params):
        self.onlyByAdmin()
        sp.verify((params._reward >= 0) & (params._reward <= 100))
        self.data.reward = params._reward

    @sp.entry_point
    def initiateWait(self, params):
        self.contractIsActive()
        self.isInitiatable(params._hashedSecret,
                           params._participant, params._refundTimestamp)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.usdTZ, entry_point="transfer").open_some()
        trasferData = sp.record(
            from_=sp.sender, to_=sp.self_address, value=params._amount)
        sp.transfer(trasferData, sp.mutez(0), c)
        self.data.swaps[params._hashedSecret] = sp.record(hashedSecret=params._hashedSecret, initiator_eth=params.initiator_eth, initiator=sp.sender,
                                                          participant=sp.sender, refundTimestamp=params._refundTimestamp, value=params._amount, state=State.Waiting)

    @sp.entry_point
    def addCounterParty(self, params):
        self.contractIsActive()
        self.checkState(params._hashedSecret, State.Waiting)
        self.onlyByInitiator(params._hashedSecret)
        self.data.swaps[params._hashedSecret].state = State.Initiated
        self.data.swaps[params._hashedSecret].participant = params._participant

    @sp.entry_point
    def redeem(self, params):
        self.checkState(params._hashedSecret, State.Initiated)
        self.isRedeemable(params._hashedSecret, params._secret)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.usdTZ, entry_point="transfer").open_some()
        trasferData = sp.record(
            from_=sp.self_address, to_=self.data.swaps[params._hashedSecret].participant, value=self.data.swaps[params._hashedSecret].value)
        sp.transfer(trasferData, sp.mutez(0), c)
        del self.data.swaps[params._hashedSecret]

    @sp.entry_point
    def refund(self, params):
        self.isRefundable(params._hashedSecret)
        c = sp.contract(sp.TRecord(from_=sp.TAddress, to_=sp.TAddress,
                                   value=sp.TNat).layout(("from_ as from", ("to_ as to", "value"))), self.data.usdTZ, entry_point="transfer").open_some()
        trasferData = sp.record(
            from_=sp.self_address, to_=self.data.swaps[params._hashedSecret].initiator, value=self.data.swaps[params._hashedSecret].value)
        sp.transfer(trasferData, sp.mutez(0), c)
        del self.data.swaps[params._hashedSecret]


@sp.add_test(name="TokenSwap")
def test():
    admin = sp.test_account("Administrator")
    alice = sp.test_account("Alice")
    bob = sp.test_account("Bob")
    init_eth = "0x91f79893E7B923410Ef1aEba6a67c6fab0sfsdgffd"
    hashSecret = sp.sha256(sp.sha256(sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")))

    c2 = FA12(admin.address)
    c1 = TokenSwap(_admin=admin.address, _usdTZ=c2.address)
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
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400), valid=False)

    # activate only by admin
    scenario += c1.toggleContractState(
        _active=True).run(sender=alice, valid=False)
    scenario += c1.toggleContractState(_active=True).run(sender=admin)

    # update reward only by admin
    scenario += c1.updateReward(_reward=50).run(sender=alice, valid=False)
    scenario += c1.updateReward(_reward=50).run(sender=admin)

    # update reward cannot be <0 and >100
    scenario += c1.updateReward(_reward=-1).run(sender=admin, valid=False)
    scenario += c1.updateReward(_reward=500).run(sender=admin, valid=False)

    # initiate new swap
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(5))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(13))

    # cannot redeem before it is activated & initiated
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682450), valid=False)

    # succesful add participant only by initiator
    scenario += c1.addCounterParty(_hashedSecret=hashSecret,
                                   _participant=bob.address).run(sender=bob, valid=False)

    # succesful add participant only by initiator
    scenario += c1.addCounterParty(_hashedSecret=hashSecret,
                                   _participant=bob.address).run(sender=alice)

    # cannot be redeemed with wrong secret
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x12345678aa")).run(sender=bob, now=sp.timestamp(159682450), valid=False)

    # cannot be redeemed after refundtime has come
    scenario += c1.redeem(_hashedSecret=hashSecret, _secret=sp.bytes(
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682550), valid=False)

    # new swap with the same hash cannot be added unless the previous one is redeemed/refunded
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, amount=sp.tez(2), now=sp.timestamp(159682400), valid=False)

    # succesful redeem can be initiated by anyone but funds transfered to participant
    scenario += c1.redeem(_hashedSecret=hashSecret,
                          _secret=sp.bytes("0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a")).run(sender=bob, now=sp.timestamp(159682450))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(0))
    scenario.verify(c2.data.balances[bob.address].balance == sp.nat(5))

    # succesful swap creation with same hash after redeem
    scenario += c1.initiateWait(_hashedSecret=hashSecret, initiator_eth=init_eth, _refundTimestamp=sp.timestamp(
        159682500), _amount=5).run(sender=alice, now=sp.timestamp(159682400))

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(5))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(8))

    # cannot be refunded before the refundtime
    scenario += c1.refund(_hashedSecret=hashSecret).run(sender=bob,
                                                        now=sp.timestamp(159682450), valid=False)
    scenario += c1.refund(_hashedSecret=hashSecret).run(sender=alice,
                                                        now=sp.timestamp(159682450), valid=False)

    # can be refunded in any initated or waiting state if refund time has come, can be done by anyone but funds transfered only to initiator
    scenario += c1.refund(_hashedSecret=hashSecret).run(sender=bob,
                                                        now=sp.timestamp(159682550))

    # cannot be refunded again once it has been refunded
    scenario += c1.refund(_hashedSecret=hashSecret).run(sender=alice,
                                                        now=sp.timestamp(159682550), valid=False)

    # balance check
    scenario.verify(c2.data.balances[c1.address].balance == sp.nat(0))
    scenario.verify(c2.data.balances[alice.address].balance == sp.nat(13))
