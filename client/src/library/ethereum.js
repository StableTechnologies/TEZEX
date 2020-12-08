export default class Ethereum {
  constructor(web3, account, swapContract) {
    this.web3 = web3;
    this.account = account;
    this.swapContract = swapContract;
  }
  async balance(address) {
    return await this.web3.eth.getBalance(address);
  }

  async initiateWait(hashedSecret, refundTime, tezAcc, amountInEther) {
    const data = await this.swapContract.methods
      .initiateWait(hashedSecret, tezAcc, refundTime)
      .encodeABI();
    const rc = await this.interact(data, amountInEther.toString(), "1000000");
    return rc;
  }

  async addCounterParty(hashedSecret, ethAccount) {
    const data = await this.swapContract.methods
      .addCounterParty(hashedSecret, ethAccount)
      .encodeABI();
    const rc = await this.interact(data, "0", "1000000");
    return rc;
  }

  async redeem(hashedSecret, secret) {
    const data = await this.swapContract.methods
      .redeem(hashedSecret, secret)
      .encodeABI();
    const rc = await this.interact(data, "0", "1000000");
    return rc;
  }

  async refund(hashedSecret) {
    const data = await this.swapContract.methods
      .refund(hashedSecret)
      .encodeABI();
    const rc = await this.interact(data, "0", "1000000");
    return rc;
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

  async interact(data, ether, gas, to = undefined) {
    return new Promise((resolve) => {
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
        this.web3.eth
          .sendTransaction(tx)
          .on("transactionHash", (transactionHash) => {
            console.log("ETH TX HASH : ", transactionHash);
          })
          .once("receipt", (rc) => {
            console.log(rc);
          })
          .then((contract) => {
            resolve(true);
          })
          .catch((error) => {
            console.error("ETH TX ERROR : ", error);
            resolve(false);
          });
      } catch (error) {
        console.error("ETH TX ERROR : ", error);
        resolve(false);
      }
    });
  }
}
