const { Transaction } = require("ethereumjs-tx");

module.exports = class Ethereum {
  constructor(web3, privateKey, chain, mutex) {
    const ethAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
    this.web3 = web3; // web3 instance
    this.web3.eth.defaultAccount = ethAccount.address; // ethereum wallet address
    this.web3.eth.handleRevert = true;
    this.account = ethAccount.address; // ethereum wallet address
    this.privateKey = privateKey; // ethereum private key
    this.chain = chain; // ethereum chain id being used
    this.mutex = mutex;
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
   * Get the ethereum erc20 token balance for an account
   *
   * @param tokenContract web3.eth.Contract instance for the ethereum token contract
   * @param address ethereum address for the account
   */
  async tokenBalance(tokenContract, address) {
    return await tokenContract.methods.balanceOf(address).call();
  }

  /**
   * Get the ethereum erc20 token allowance for swap contract by an account
   *
   * @param tokenContract web3.eth.Contract instance for the ethereum token contract
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param address ethereum address for the account
   */
  async tokenAllowance(tokenContract, swapContract, address) {
    return await tokenContract.methods
      .allowance(address, swapContract.options.address)
      .call();
  }

  /**
   * Initiate a erc20 token swap on the ethereum chain
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param tezAcc initiators tezos account address
   * @param amount value of the swap in erc20 tokens
   */
  async tokenInitiateWait(
    swapContract,
    secretHash,
    refundTime,
    tezAcc,
    amount
  ) {
    const data = await swapContract.methods
      .initiateWait(secretHash, tezAcc, amount, refundTime)
      .encodeABI();
    return await this.interact(data, "0", "1000", swapContract.options.address);
  }

  /**
   * Approve tokens for the swap contract
   *
   * @param tokenContract web3.eth.Contract instance for the ethereum token contract
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param amount the quantity of erc20 tokens to be approved
   */
  async approveToken(tokenContract, swapContract, amount) {
    const data = await tokenContract.methods
      .approve(swapContract.options.address, amount)
      .encodeABI();
    return await this.interact(
      data,
      "0",
      "1000",
      tokenContract.options.address
    );
  }

  /**
   * Initiate a eth swap on the ethereum chain
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param tezAcc initiators tezos account address
   * @param amountInWei value of the swap in wei
   */
  async initiateWait(
    swapContract,
    hashedSecret,
    refundTime,
    tezAcc,
    amountInWei
  ) {
    const data = await swapContract.methods
      .initiateWait(hashedSecret, tezAcc, refundTime)
      .encodeABI();
    return await this.interact(
      data,
      amountInWei.toString(),
      "10000",
      swapContract.options.address
    );
  }

  /**
   * Add counter-party details to an existing(initiated) swap
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret of the swap being updated
   * @param ethAccount participant/counter-party ethereum address
   */
  async addCounterParty(swapContract, hashedSecret, ethAccount) {
    const data = await swapContract.methods
      .addCounterParty(hashedSecret, ethAccount)
      .encodeABI();
    return await this.interact(
      data,
      "0",
      "10000",
      swapContract.options.address
    );
  }

  /**
   * Redeem the swap if possible
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret of the swap being redeemed
   * @param secret secret for the swap which produced the corresponding hashedSecret
   */
  async redeem(swapContract, hashedSecret, secret) {
    const data = await swapContract.methods
      .redeem(hashedSecret, secret)
      .encodeABI();
    const rc = await this.interact(
      data,
      "0",
      "10000",
      swapContract.options.address
    );
    return rc;
  }

  /**
   * Refund the swap if possible
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret of the swap being refunded
   */
  async refund(swapContract, hashedSecret) {
    const data = await swapContract.methods.refund(hashedSecret).encodeABI();
    return await this.interact(
      data,
      "0",
      "10000",
      swapContract.options.address
    );
  }

  /**
   * Get the secret for a swap that has already been redeemed
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret of the redeemed swap
   *
   * @return the secret for the swap if available
   */
  async getRedeemedSecret(swapContract, hashedSecret) {
    const data = await swapContract.getPastEvents("Redeemed", {
      filter: { _hashedSecret: hashedSecret },
      fromBlock: 0,
      toBlock: "latest",
    });
    if (data.length === 0) return undefined;
    return data[0].returnValues["_secret"];
  }

  /**
   * Get details of a particular swap
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param hashedSecret hashed secret of the swap requested
   *
   * @return the swap details if available
   */
  async getSwap(swapContract, hashedSecret) {
    return await swapContract.methods.swaps(hashedSecret).call();
  }

  /**
   * Get the list of all active swaps
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @return a list of all active swaps with their details
   */
  async getAllSwaps(swapContract) {
    return await swapContract.methods.getAllSwaps().call();
  }

  /**
   * Get the list of all active swaps initiated by a specific user
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param account ethereum address of the user whose swaps are to be retrieved
   *
   * @return a list of all active swaps initiated by a specific user
   */
  async getUserSwaps(swapContract, account) {
    const swaps = await this.getAllSwaps(swapContract);
    return swaps.filter((swp) => swp.initiator === account);
  }

  /**
   * Get all swaps waiting for a response matching the min expire time requested
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   * @param minTimeToExpire minimum time left for swap to expire in seconds
   *
   * @return a list of waiting swaps with details
   */
  async getWaitingSwaps(swapContract, minTimeToExpire) {
    const swaps = await this.getAllSwaps(swapContract);
    return swaps.filter(
      (swp) =>
        swp.participant === swp.initiator &&
        swp.initiator !== this.account &&
        Math.trunc(Date.now() / 1000) < swp.refundTimestamp - minTimeToExpire
    );
  }

  /**
   * Get all swaps waiting to be redeemed
   *
   * @param swapContract web3.eth.Contract instance for the ethereum swap contract
   *
   * @return a list of waiting swaps with details
   */
  async getRedeemableSwaps(swapContract) {
    const swaps = await this.getAllSwaps(swapContract);
    return swaps.filter(
      (swp) =>
        swp.state === "2" &&
        Math.trunc(Date.now() / 1000) < (swp.refundTimestamp - 300)
    );
  }

  /**
   * Get fee and gas estimates for a particular transaction
   *
   * @param data data for the tx [abi encoded]
   * @param wei amount of ether(wei) being transferred
   * @param from ethereum address of the tx initiator
   * @param to ethereum address of the destination
   *
   * @return returns the estimates for fee and gas
   */
  async getEstimates(data, wei, from, to) {
    const blockDetails = await this.web3.eth.getBlock("latest", false);
    const gasLimit = blockDetails.gasLimit;
    const gasPrice = await this.web3.eth.getGasPrice();
    const gasEstimate = await this.web3.eth.estimateGas({
      from,
      to,
      data,
      value: this.web3.utils.toHex(wei),
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
   * @param wei amount of ether(wei) being transferred
   * @param extraGas extra gas to add for the tx (user choice)
   * @param to ethereum address of the destination
   *
   * @return true for a successful tx else throws error
   */
  async interact(data, wei, extraGas, to) {
    await this.mutex.acquire();
    console.log("going", to);
    try {
      const estimates = await this.getEstimates(data, wei, this.account, to);
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
        value: this.web3.utils.toHex(wei),
        data: data,
      };
      const tx = new Transaction(rawTx, { chain: this.chain });
      tx.sign(privateKey);
      const serializedTx = "0x" + tx.serialize().toString("hex");
      await this.web3.eth
        .sendSignedTransaction(serializedTx.toString("hex"))
        .on("transactionHash", (transactionHash) => {
          console.log("ETH TX HASH : ", transactionHash);
        });
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
