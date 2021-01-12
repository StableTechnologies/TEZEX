import { Mutex } from "async-mutex";

export default class Ethereum {
  constructor(web3, account, swapContract) {
    this.web3 = web3; // web3 instance
    this.account = account; // ethereum wallet address
    this.swapContract = swapContract; // web3.eth.Contract instance for the ethereum swap contract
    this.mutex = new Mutex();
  }

  /**
   * Get the ethereum balance for an account
   *
   * @param address ethereum address for the account
   */
  async balance(address) {
    return await this.web3.eth.getBalance(address);
  }

  /**
   * Initiate a swap on the ethereum chain
   *
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param tezAcc initiators tezos account address
   * @param amountInEther value of the swap in ether
   */
  async initiateWait(hashedSecret, refundTime, tezAcc, amountInEther) {
    const data = await this.swapContract.methods
      .initiateWait(hashedSecret, tezAcc, refundTime)
      .encodeABI();
    return await this.interact(data, amountInEther.toString());
  }

  /**
   * Add counter-party details to an existing(initiated) swap
   *
   * @param hashedSecret hashed secret of the swap being updated
   * @param ethAccount participant/counter-party ethereum address
   */
  async addCounterParty(hashedSecret, ethAccount) {
    const data = await this.swapContract.methods
      .addCounterParty(hashedSecret, ethAccount)
      .encodeABI();
    return await this.interact(data, "0");
  }

  /**
   * Redeem the swap if possible
   *
   * @param hashedSecret hashed secret of the swap being redeemed
   * @param secret secret for the swap which produced the corresponding hashedSecret
   */
  async redeem(hashedSecret, secret) {
    const data = await this.swapContract.methods
      .redeem(hashedSecret, secret)
      .encodeABI();
    return await this.interact(data, "0");
  }

  /**
   * Refund the swap if possible
   *
   * @param hashedSecret hashed secret of the swap being refunded
   */
  async refund(hashedSecret) {
    const data = await this.swapContract.methods
      .refund(hashedSecret)
      .encodeABI();
    return await this.interact(data, "0");
  }

  /**
   * Get the secret for a swap that has already been redeemed
   *
   * @param hashedSecret hashed secret of the redeemed swap
   *
   * @return the secret for the swap if available
   */
  async getRedeemedSecret(hashedSecret) {
    const data = await this.swapContract.getPastEvents("Redeemed", {
      filter: { _hashedSecret: hashedSecret },
      fromBlock: 0,
      toBlock: "latest",
    });
    return data[0].returnValues["_secret"];
  }

  /**
   * Get details of a particular swap
   *
   * @param hashedSecret hashed secret of the swap requested
   *
   * @return the swap details if available
   */
  async getSwap(hashedSecret) {
    return await this.swapContract.methods.swaps(hashedSecret).call();
  }

  /**
   * Get the list of all active swaps
   *
   * @return a list of all active swaps with their details
   */
  async getAllSwaps() {
    return await this.swapContract.methods.getAllSwaps().call();
  }

  /**
   * Get the list of all active swaps initiated by a specific user
   *
   * @param account ethereum address of the user whose swaps are to be retrieved
   *
   * @return a list of all active swaps initiated by a specific user
   */
  async getUserSwaps(account) {
    const swaps = await this.getAllSwaps();
    return swaps.filter((swp) => swp.initiator === account);
  }

  /**
   * Get all swaps waiting for a response matching the min expire time requested
   *
   * @param minTimeToExpire minimum time left for swap to expire in seconds
   *
   * @return a list of waiting swaps with details
   */
  async getWaitingSwaps(minTimeToExpire) {
    const swaps = await this.getAllSwaps();
    return swaps.filter(
      (swp) =>
        swp.participant === swp.initiator &&
        swp.initiator !== this.account &&
        Math.trunc(Date.now() / 1000) < swp.refundTimestamp - minTimeToExpire
    );
  }

  /**
   * Get fee and gas estimates for a particular transaction
   *
   * @param data data for the tx [abi encoded]
   * @param ether amount of ether being transferred
   * @param from ethereum address of the tx initiator
   * @param to ethereum address of the destination
   *
   * @return returns the estimates for fee and gas
   */
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

  /**
   * Send a tx to the blockchain
   *
   * @param data data for the tx [abi encoded]
   * @param ether amount of ether being transferred
   * @param to ethereum address of the destination
   *
   * @return true for a successful tx else throws error
   */
  async interact(data, ether, to = undefined) {
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
