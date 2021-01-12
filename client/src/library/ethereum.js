import { Mutex } from "async-mutex";

export default class Ethereum {
  constructor(web3, account, swapContract) {
    this.web3 = web3;
    this.account = account;
    this.swapContract = swapContract;
    this.mutex = new Mutex();
  }
  async balance(address) {
    return await this.web3.eth.getBalance(address);
  }

  async initiateWait(hashedSecret, refundTime, tezAcc, amountInEther) {
    const data = await this.swapContract.methods
      .initiateWait(hashedSecret, tezAcc, refundTime)
      .encodeABI();
    return await this.interact(data, amountInEther.toString(), "1000000");
  }

  async addCounterParty(hashedSecret, ethAccount) {
    const data = await this.swapContract.methods
      .addCounterParty(hashedSecret, ethAccount)
      .encodeABI();
    return await this.interact(data, "0", "1000000");
  }

  async redeem(hashedSecret, secret) {
    const data = await this.swapContract.methods
      .redeem(hashedSecret, secret)
      .encodeABI();
    return await this.interact(data, "0", "1000000");
  }

  async refund(hashedSecret) {
    const data = await this.swapContract.methods
      .refund(hashedSecret)
      .encodeABI();
    return await this.interact(data, "0", "1000000");
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

  async interact(data, ether, gas, to = undefined) {
    await this.mutex.acquire();
    try {
      // web3.eth.handleRevert = true;
      to = to === undefined ? this.swapContract.options.address : to;
      const tx = {
        from: this.account,
        value: this.web3.utils.toHex(this.web3.utils.toWei(ether, "ether")),
        data,
        to,
      };
      console.log(tx);
      await this.web3.eth
        .sendTransaction(tx)
        .on("transactionHash", (transactionHash) => {
          console.log("ETH TX HASH : ", transactionHash);
        })
        .once("receipt", (rc) => {
          console.log(rc);
        });
      return true;
    } catch (error) {
      console.error("ETH TX ERROR : ", error);
      throw error;
    } finally {
      this.mutex.release();
    }
  }
}
