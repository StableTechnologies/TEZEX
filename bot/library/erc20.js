const Ethereum = require("./ethereum");

module.exports = class ERC20 extends (
  Ethereum
) {
  constructor(web3, account, privateKey, chain, swapContract, tokenContract) {
    super(web3, account, privateKey, chain, swapContract);
    this.tokenContract = tokenContract; // web3.eth.Contract instance for the ethereum erc20 token contract
  }

  /**
   * Get the ethereum erc20 token balance for an account
   *
   * @param address ethereum address for the account
   */
  async tokenBalance(address) {
    return await this.tokenContract.methods.balanceOf(address).call();
  }

  /**
   * Get the ethereum erc20 token allowance for swap contract by an account
   *
   * @param address ethereum address for the account
   */
  async tokenAllowance(address) {
    return await this.tokenContract.methods
      .allowance(address, this.swapContract.options.address)
      .call();
  }

  /**
   * Initiate a swap on the ethereum chain
   *
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param tezAcc initiators tezos account address
   * @param amount value of the swap in erc20 tokens
   */
  async initiateWait(secretHash, refundTime, tezAcc, amount) {
    const data = await this.swapContract.methods
      .initiateWait(secretHash, tezAcc, amount, refundTime)
      .encodeABI();
    return await this.interact(data, "0", "1000");
  }

  /**
   * Approve tokens for the swap contract
   *
   * @param amount the quantity of erc20 tokens to be approved
   */
  async approveToken(amount) {
    const data = await this.tokenContract.methods
      .approve(this.swapContract.options.address, parseInt(amount))
      .encodeABI();
    return await this.interact(
      data,
      "0",
      "1000",
      this.tokenContract.options.address
    );
  }
};
