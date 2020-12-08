import Ethereum from "./ethereum";

export default class USDC extends Ethereum {
  constructor(web3, account, swapContract, tokenContract) {
    super(web3, account, swapContract);
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
    const rc = await this.interact(data, "0", "1000000");
    return rc;
  }

  async approveToken(amount) {
    const data = await this.tokenContract.methods
      .approve(this.swapContract.options.address, parseInt(amount))
      .encodeABI();
    const rc = await this.interact(
      data,
      "0",
      "1000000",
      this.tokenContract.options.address
    );
    return rc;
  }
}
