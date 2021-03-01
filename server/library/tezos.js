const {
  registerLogger,
  registerFetch,
  TezosMessageUtils,
  TezosNodeReader,
} = require("conseiljs");
const { JSONPath } = require("jsonpath-plus");
const log = require("loglevel");
const fetch = require("node-fetch");
const config = require("./network-config.json");
module.exports = class Tezos {
  constructor(chainID, rpc, conseilServer) {
    this.rpc = rpc; // rpc server address for network interaction
    this.conseilServer = conseilServer; // conseil server setting
    this.chainID = chainID; // chain id being used
  }

  /**
   * Creates a new instance of the Tezos client
   *
   * @param logLevel sets the verbosity of conseiljs logs
   */
  static newClient(logLevel) {
    const logger = log.getLogger("conseiljs");
    logger.setLevel(logLevel, false);
    registerLogger(logger);
    registerFetch(fetch);
    return new Tezos(
      config.tezos.chain_id,
      config.tezos.RPC,
      config.tezos.conseilServer
    );
  }

  /**
   * Get the tezos balance for an account
   *
   * @param address tezos address for the account
   */
  async balance(address) {
    return await TezosNodeReader.getSpendableBalanceForAccount(
      this.rpc,
      address
    );
  }

  /**
   * Get the tezos fa1.2 token balance for an account
   *
   * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
   * @param address tezos address for the account
   */
  async tokenBalance(tokenContract, address) {
    const key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    const tokenData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      tokenContract.mapID,
      key
    );
    let balance =
      tokenData === undefined
        ? "0"
        : JSONPath({ path: "$.args[0].int", json: tokenData })[0];
    return balance;
  }

  /**
   * Get the tezos fa1.2 token allowance for swap contract by an account
   *
   * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param address tezos address for the account
   */
  async tokenAllowance(tokenContract, swapContract, address) {
    const key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    const tokenData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      tokenContract.mapID,
      key
    );
    let allowances =
      tokenData === undefined
        ? undefined
        : JSONPath({ path: "$.args[1]", json: tokenData })[0];
    const allowance =
      allowances === undefined
        ? []
        : allowances.filter(
            (allow) => allow.args[0].string === swapContract.address
          );
    return allowance.length === 0 ? "0" : allowance[0].args[1].int;
  }
};
