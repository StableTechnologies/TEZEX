const Ethereum = require("./ethereum");

module.exports = class USDC extends (
  Ethereum
) {
  constructor(web3, account, privateKey, chain, swapContract, tokenContract) {
    super(web3, account, privateKey, chain, swapContract);
    this.tokenContract = tokenContract;
  }

  async tokenBalance(address) {
    return await this.tokenContract.methods.balanceOf(address).call();
  }

  async tokenAllowance(address) {
    return await this.tokenContract.methods
      .allowance(address, this.swapContract.options.address)
      .call();
  }

  async initiateWait(secretHash, refundTime, tezAcc, amount) {
    const data = await this.swapContract.methods
      .initiateWait(secretHash, tezAcc, amount, refundTime)
      .encodeABI();
    return await this.interact(data, "0", "1000");
  }

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
