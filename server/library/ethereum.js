const Web3 = require("web3");
const config = require(`./${
  process.env.NODE_ENV || "prod"
}-network-config.json`);
module.exports = class Ethereum {
  constructor(web3) {
    this.web3 = web3; // Web3 instance
  }

  /**
   * Creates a new instance of the Ethereum client
   */
  static newClient() {
    const web3 = new Web3(new Web3.providers.HttpProvider(config.ethereum.RPC));
    return new Ethereum(web3);
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
};
