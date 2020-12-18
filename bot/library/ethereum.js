const { Mutex } = require("async-mutex");
const { Transaction } = require("ethereumjs-tx");

module.exports = class Ethereum {
  constructor(web3, account, privateKey, chain, swapContract) {
    this.web3 = web3;
    this.web3.eth.defaultAccount = account;
    this.web3.eth.handleRevert = true;
    this.account = account;
    this.swapContract = swapContract;
    this.privateKey = privateKey;
    this.chain = chain;
    this.mutex = new Mutex();
  }

  async balance(address) {
    return await this.web3.eth.getBalance(address);
  }

  async initiateWait(hashedSecret, refundTime, tezAcc, amountInEther) {
    const data = await this.swapContract.methods
      .initiateWait(hashedSecret, tezAcc, refundTime)
      .encodeABI();
    return await this.interact(data, amountInEther.toString(), "10000");
  }

  async addCounterParty(hashedSecret, ethAccount) {
    const data = await this.swapContract.methods
      .addCounterParty(hashedSecret, ethAccount)
      .encodeABI();
    return await this.interact(data, "0", "10000");
  }

  async redeem(hashedSecret, secret) {
    const data = await this.swapContract.methods
      .redeem(hashedSecret, secret)
      .encodeABI();
    const rc = await this.interact(data, "0", "10000");
    return rc;
  }

  async refund(hashedSecret) {
    const data = await this.swapContract.methods
      .refund(hashedSecret)
      .encodeABI();
    return await this.interact(data, "0", "10000");
  }

  async getRedeemedSecret(hashedSecret) {
    const data = await this.swapContract.getPastEvents("Redeemed", {
      filter: { _hashedSecret: hashedSecret },
      fromBlock: 0,
      toBlock: "latest",
    });
    return data[0].returnValues["_secret"];
  }

  async getSwap(hashedSecret) {
    return await this.swapContract.methods.swaps(hashedSecret).call();
  }

  async getAllSwaps() {
    return await this.swapContract.methods.getAllSwaps().call();
  }

  async getUserSwaps(account) {
    const swaps = await this.getAllSwaps();
    return swaps.filter((swp) => swp.initiator === account);
  }

  async getWaitingSwaps(minTimeToExpire) {
    const swaps = await this.getAllSwaps();
    return swaps.filter(
      (swp) =>
        swp.participant === swp.initiator &&
        swp.initiator !== this.account &&
        Math.trunc(Date.now() / 1000) < swp.refundTimestamp - minTimeToExpire
    );
  }

  async getEstimates(data, ether, from, to) {
    const blockDetails = await this.web3.eth.getBlock("latest", false);
    const gasLimit = blockDetails.gasLimit;
    const gasPrice = await this.web3.eth.getGasPrice();
    const gasEstimate = await this.web3.eth.estimateGas({
      from,
      to,
      data,
      value: this.web3.utils.toHex(this.web3.utils.toWei(ether, "ether")),
    });
    return {
      fee: parseInt(gasPrice) * gasEstimate,
      gas: gasEstimate,
      gasLimit,
      gasPrice,
    };
  }

  async interact(data, ether, extraGas, to = undefined) {
    await this.mutex.acquire();
    console.log("going", to);
    try {
      to = to === undefined ? this.swapContract.options.address : to;
      const estimates = await this.getEstimates(data, ether, this.account, to);
      const privateKey = Buffer.from(this.privateKey, "hex");
      const _hex_gasLimit = this.web3.utils.toHex(
        estimates.gasLimit + parseInt(extraGas)
      );
      const _hex_gasPrice = this.web3.utils.toHex(estimates.gasPrice);
      const _hex_Gas = this.web3.utils.toHex(
        estimates.gas + parseInt(extraGas)
      );
      const nonce = await this.web3.eth.getTransactionCount(this.account);
      const _hex_nonce = this.web3.utils.toHex(nonce);
      const rawTx = {
        to,
        nonce: _hex_nonce,
        from: this.account,
        gasPrice: _hex_gasPrice,
        gasLimit: _hex_gasLimit,
        gas: _hex_Gas,
        value: this.web3.utils.toHex(this.web3.utils.toWei(ether, "ether")),
        data: data,
      };
      const tx = new Transaction(rawTx, { chain: this.chain });
      tx.sign(privateKey);
      const serializedTx = "0x" + tx.serialize().toString("hex");
      await this.web3.eth.sendSignedTransaction(serializedTx.toString("hex"));
      return true;
    } catch (err) {
      console.error("ETH TX ERROR : ", err);
      throw err;
    } finally {
      this.mutex.release();
      console.log("done", to);
    }
  }
};
