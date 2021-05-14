import smartpy as sp

FeeData = sp.TRecord(approve=sp.TNat, initiateWait=sp.TNat,
                     addCounterParty=sp.TNat, redeem=sp.TNat, update_time=sp.TTimestamp)


class FeeStore(sp.Contract):
    def __init__(self, admin_acc):
        self.init(fees=sp.map(tkey=sp.TString, tvalue=FeeData), admin=admin_acc)

    @sp.entry_point
    def update_admin(self, admin):
        sp.set_type(admin, sp.TAddress)
        sp.verify(sp.sender == self.data.admin)
        self.data.admin = admin

    @sp.entry_point
    def update(self, params):
        sp.set_type(params, sp.TMap(sp.TString, FeeData))
        sp.verify(sp.sender == self.data.admin)
        keyValueList = params.items()
        sp.for feeData in keyValueList:
            sp.if self.data.fees.contains(feeData.key):
                sp.if feeData.value.update_time > self.data.fees[feeData.key].update_time:
                    self.data.fees[feeData.key] = feeData.value
            sp.else:
                self.data.fees[feeData.key] = feeData.value


if "templates" not in __name__:
    @sp.add_test(name="Fee Store")
    def test():
        admin = sp.test_account("Administrator")
        c1 = FeeStore(admin.address)
        scenario = sp.test_scenario()
        scenario.h1("Fee Store")
        scenario += c1
        scenario += c1.update({"USDC": sp.record(approve=100000, initiateWait=100000, addCounterParty=100000,
                                                 redeem=100000, update_time=sp.timestamp(1612864882))}).run(sender=sp.address("tz1-random"), valid=False)
        scenario += c1.update({"USDC": sp.record(approve=100000, initiateWait=100000, addCounterParty=100000,
                                                 redeem=100000, update_time=sp.timestamp(1612864882))}).run(sender=admin)
        scenario += c1.update({"USDC": sp.record(approve=200000, initiateWait=100000, addCounterParty=100000,
                                                 redeem=100000, update_time=sp.timestamp(1612864880))}).run(sender=admin)
        scenario.verify(c1.data.fees["USDC"].approve == 100000)
        scenario += c1.update_admin(sp.address("tz1-new-admin")
                                    ).run(sender=sp.address("tz1-random"), valid=False)
        scenario += c1.update_admin(sp.address("tz1-new-admin")
                                    ).run(sender=admin)
        scenario.verify(c1.data.admin == sp.address("tz1-new-admin"))

sp.add_compilation_target("FeeStore", FeeStore(sp.address("tz1Y8UNsMSCXyDgma8Ya51eLx8Qu4AoLm8vt")), storage=None)