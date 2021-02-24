const Web3 = require("web3");
const config = require("./network-config.json");
module.exports = class Ethereum {
  constructor(web3, swapContract, tokenContract) {
    this.web3 = web3; // Web3 instance
    this.swapContract = swapContract; // web3.eth.Contract instance for the ethereum swap contract
    this.tokenContract = tokenContract; // web3.eth.Contract instance for the ethereum erc20 token contract
  }

  /**
   * Creates a new instance of the Ethereum client
   */
  static newClient() {
    const web3 = new Web3(new Web3.providers.HttpProvider(config.ethereum.RPC));
    const swapContract = new web3.eth.Contract(
      config.pairs["usdc/usdtz"].usdc.swapContract.abi,
      config.pairs["usdc/usdtz"].usdc.swapContract.address
    );
    const tokenContract = new web3.eth.Contract(
      config.pairs["usdc/usdtz"].usdc.tokenContract.abi,
      config.pairs["usdc/usdtz"].usdc.tokenContract.address
    );
    return new Ethereum(web3, swapContract, tokenContract);
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
};
