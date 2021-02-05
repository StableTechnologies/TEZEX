const AtomicSwap = artifacts.require("TokenSwap");
const SimpleToken = artifacts.require("SimpleToken");

const truffleAssert = require("truffle-assertions");

const getTime = (jump) => Math.trunc(new Date().getTime() / 1000) + jump;
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

contract("TokenSwap", (accounts) => {
  it("setup erc20", async () => {
    const token = await SimpleToken.deployed();
    await token.transfer(accounts[1], 1000, { from: accounts[0] });
    const balance = await token.balanceOf(accounts[1]);
    expect(balance.toNumber()).to.equal(1000);
  });

  it("deactivating contract", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    let state = await atomicSwap.active();
    expect(state).to.equal(true);
    await atomicSwap.toggleContractState(false, { from: accounts[0] });
    state = await atomicSwap.active();
    expect(state).to.equal(false);
  });

  it("should throw inactive error", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.initiateWait(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "tz1xxxxxxxxxx",
        300,
        getTime(100)
      ),
      "contract is deactivated"
    );
  });

  it("toggleContract should throw error if non-admin calls", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.toggleContractState(true, { from: accounts[1] }),
      "sender is not the admin"
    );
  });

  it("activate contract by admin", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    let state = await atomicSwap.active();
    expect(state).to.equal(false);
    await atomicSwap.toggleContractState(true, { from: accounts[0] });
    state = await atomicSwap.active();
    expect(state).to.equal(true);
  });

  it("cannot initiate already expired swaps", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.initiateWait(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "tz1xxxxxxxxxx",
        300,
        getTime(-100)
      ),
      "refundTimestamp has already come"
    );
  });

  it("cannot initiate if tokens are not approved", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.initiateWait(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "tz1xxxxxxxxxx",
        300,
        getTime(100)
      ),
      "ERC20: transfer amount exceeds allowance"
    );
  });

  it("setup erc20: Approve tokens for contract", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    const token = await SimpleToken.deployed();
    await token.approve(atomicSwap.address, 600, { from: accounts[1] });
    const allowance = await token.allowance(accounts[1], atomicSwap.address);
    expect(allowance.toNumber()).to.equal(600);
  });

  it("successfully initiate swap wait (from account[1])", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    const token = await SimpleToken.deployed();
    const refundTime = getTime(600);
    await atomicSwap.initiateWait(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      "tz1xxxxxxxxxx",
      300,
      refundTime,
      { from: accounts[1] }
    );
    const swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["initiator"]).to.equal(accounts[1]);
    expect(swap["participant"]).to.equal(accounts[1]);
    expect(swap["initiator_tez_addr"]).to.equal("tz1xxxxxxxxxx");
    expect(swap["refundTimestamp"].toNumber()).to.equal(refundTime);
    expect(swap["value"].toNumber()).to.equal(300);
    expect(swap["state"].toNumber()).to.equal(1);
    // first swap in linked list
    expect(swap["prevHash"]).to.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(swap["nextHash"]).to.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    const balance = await token.balanceOf(atomicSwap.address);
    expect(balance.toNumber()).to.equal(300);
  });

  it("cannot initiate swap with hash matching existing swaps", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.initiateWait(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "tz1xxxxxxxxxx",
        300,
        getTime(100)
      ),
      "swap for this hash is already initiated"
    );
  });

  it("cannot redeem without adding participant", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.redeem(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a",
        { from: accounts[2] }
      ),
      "state mismatch"
    );
  });

  it("only initiator can add participant", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.addCounterParty(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        accounts[2],
        { from: accounts[2] }
      ),
      "sender is not the initiator"
    );
    await atomicSwap.addCounterParty(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      accounts[2],
      { from: accounts[1] }
    );
    const swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["initiator"]).to.equal(accounts[1]);
    expect(swap["participant"]).to.equal(accounts[2]);
    expect(swap["state"].toNumber()).to.equal(2);
  });

  it("cannot redeem without correct secret", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.redeem(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "0x68656c6c6f666473667364666c64736a666c73646a6664736b6673646a6b666a",
        { from: accounts[2] }
      ),
      "secret is not correct"
    );
  });

  it("cannot refund before expiry", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.refund(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        { from: accounts[2] }
      ),
      "refundTimestamp has not come"
    );
  });

  it("successful redeem by any user after participant is added", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    const token = await SimpleToken.deployed();
    let swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["state"].toNumber()).to.equal(2);
    await atomicSwap.redeem(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a",
      { from: accounts[2] }
    );
    swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["state"].toNumber()).to.equal(0);
    let balance = await token.balanceOf(atomicSwap.address);
    expect(balance.toNumber()).to.equal(0);
    balance = await token.balanceOf(accounts[2]);
    expect(balance.toNumber()).to.equal(300);
  });

  it("successfully initiate swap wait+addParticipant (from account[1])", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    const token = await SimpleToken.deployed();
    const refTime = getTime(3);
    await atomicSwap.initiateWait(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      "tz1xxxxxxxxxx",
      300,
      refTime,
      { from: accounts[1] }
    );
    let swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["initiator"]).to.equal(accounts[1]);
    expect(swap["participant"]).to.equal(accounts[1]);
    expect(swap["initiator_tez_addr"]).to.equal("tz1xxxxxxxxxx");
    expect(swap["refundTimestamp"].toNumber()).to.equal(refTime);
    expect(swap["value"].toNumber()).to.equal(300);
    expect(swap["state"].toNumber()).to.equal(1);
    // first swap in linked list
    expect(swap["prevHash"]).to.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    expect(swap["nextHash"]).to.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    );
    await atomicSwap.addCounterParty(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      accounts[2],
      { from: accounts[1] }
    );
    swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["initiator"]).to.equal(accounts[1]);
    expect(swap["participant"]).to.equal(accounts[2]);
    expect(swap["state"].toNumber()).to.equal(2);
    const balance = await token.balanceOf(atomicSwap.address);
    expect(balance.toNumber()).to.equal(300);
    await sleep(3000);
  });

  it("cannot redeem after expiry", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    await truffleAssert.reverts(
      atomicSwap.redeem(
        "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
        "0x68656c6c6f666473667364666c64736a666c73646a6664736a6673646a6b666a",
        { from: accounts[2] }
      ),
      "refundTimestamp has already come"
    );
  });

  it("successful refund after expiry, can be called by anyone", async () => {
    const atomicSwap = await AtomicSwap.deployed();
    const token = await SimpleToken.deployed();
    await atomicSwap.refund(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
      { from: accounts[2] }
    );
    const swap = await atomicSwap.swaps(
      "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd"
    );
    expect(swap["state"].toNumber()).to.equal(0);
    let balance = await token.balanceOf(atomicSwap.address);
    expect(balance.toNumber()).to.equal(0);
    balance = await token.balanceOf(accounts[1]);
    expect(balance.toNumber()).to.equal(700);
  });
});
