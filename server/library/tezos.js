const {
  registerLogger,
  registerFetch,
  TezosMessageUtils,
  TezosNodeReader,
  TezosParameterFormat,
  TezosLanguageUtil
} = require("conseiljs");
const { JSONPath } = require("jsonpath-plus");
const log = require("loglevel");
const fetch = require("node-fetch");
const config = require(`./${process.env.SERVER_ENV || "prod"
  }-network-config.json`);


  const FA2="fa2",FA12="fa12";
  
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
   * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat, type:string, tokenID:nat}
   * @param address tezos address for the account
   */
   async tokenBalance(tokenContract, address) {
    if (tokenContract.type === FA2) {
      const accountHex = `0x${TezosMessageUtils.writeAddress(address)}`;
      const packedKey = TezosMessageUtils.encodeBigMapKey(
        Buffer.from(
          TezosMessageUtils.writePackedData(
            `(Pair ${accountHex} ${tokenContract.tokenID})`,
            "",
            TezosParameterFormat.Michelson
          ),
          "hex"
        )
      );

      let mapResult = undefined;
      try {
        mapResult = await TezosNodeReader.getValueForBigMapKey(
          this.rpc,
          tokenContract.mapID,
          packedKey
        );
      } catch (err) {
        if (
          !(
            Object.prototype.hasOwnProperty.call(err, "httpStatus") &&
            err.httpStatus === 404
          )
        )
          throw err;
      }

      const balance =
        mapResult === undefined
          ? "0"
          : JSONPath({ path: "$.int", json: mapResult })[0];
      return balance;
    }
    let key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    if (tokenContract.mapID === 31) {
      key = Buffer.from(
        TezosMessageUtils.writePackedData(
          `(Pair "ledger" 0x${TezosMessageUtils.writeAddress(address)})`,
          "",
          TezosParameterFormat.Michelson
        ),
        "hex"
      );
      key = TezosMessageUtils.encodeBigMapKey(
        Buffer.from(TezosMessageUtils.writePackedData(key, "bytes"), "hex")
      );
    }
    let tokenData = undefined;
    try {
      tokenData = await TezosNodeReader.getValueForBigMapKey(
        this.rpc,
        tokenContract.mapID,
        key
      );
    } catch (err) {
      if (
        !(
          Object.prototype.hasOwnProperty.call(err, "httpStatus") &&
          err.httpStatus === 404
        )
      )
        throw err;
    }
    if (tokenContract.mapID === 31 && tokenData !== undefined) {
      tokenData = JSON.parse(
        TezosLanguageUtil.hexToMicheline(
          JSONPath({ path: "$.bytes", json: tokenData })[0].slice(2)
        ).code
      );
    }
    let balance =
      tokenData === undefined
        ? "0"
        : JSONPath({ path: "$.args[0].int", json: tokenData })[0];
    return balance;
  }

  /**
   * Get the tezos fa1.2 token allowance and fa2 operator status(0 or 1) for swap contract by an account
   *
   * @param tokenContract tezos fa1.2/fa2 token contract details {address:string, mapID:nat, type:string, tokenID:nat}
   * @param swapContract tezos swap contract details {address:string, mapID:nat, type:string, tokenID:nat}
   * @param address tezos address for the account
   */
  async tokenAllowance(tokenContract, swapContract, address) {
    if (tokenContract.type === FA2) {
      const accountHex = `0x${TezosMessageUtils.writeAddress(address)}`;
      const contractHex = `0x${TezosMessageUtils.writeAddress(
        swapContract.address
      )}`;
      const packedKey = TezosMessageUtils.encodeBigMapKey(
        Buffer.from(
          TezosMessageUtils.writePackedData(
            `(Pair ${accountHex} (Pair ${contractHex} ${tokenContract.tokenID}))`,
            "",
            TezosParameterFormat.Michelson
          ),
          "hex"
        )
      );

      let mapResult = undefined;
      try {
        mapResult = await TezosNodeReader.getValueForBigMapKey(
          this.rpc,
          tokenContract.allowanceMapID,
          packedKey
        );
      } catch (err) {
        if (
          !(
            Object.prototype.hasOwnProperty.call(err, "httpStatus") &&
            err.httpStatus === 404
          )
        )
          throw err;
      }

      const balance = mapResult === undefined ? "0" : "1";
      return balance;
    }
    let key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    if (tokenContract.mapID === 31) {
      key = Buffer.from(
        TezosMessageUtils.writePackedData(
          `(Pair "ledger" 0x${TezosMessageUtils.writeAddress(address)})`,
          "",
          TezosParameterFormat.Michelson
        ),
        "hex"
      );
      key = TezosMessageUtils.encodeBigMapKey(
        Buffer.from(TezosMessageUtils.writePackedData(key, "bytes"), "hex")
      );
    }
    let tokenData = undefined;
    try {
      tokenData = await TezosNodeReader.getValueForBigMapKey(
        this.rpc,
        tokenContract.mapID,
        key
      );
    } catch (err) {
      if (
        !(
          Object.prototype.hasOwnProperty.call(err, "httpStatus") &&
          err.httpStatus === 404
        )
      )
        throw err;
    }
    if (tokenContract.mapID === 31 && tokenData !== undefined) {
      tokenData = JSON.parse(
        TezosLanguageUtil.hexToMicheline(
          JSONPath({ path: "$.bytes", json: tokenData })[0].slice(2)
        ).code
      );
    }
    let allowances =
      tokenData === undefined
        ? undefined
        : JSONPath({ path: "$.args[1]", json: tokenData })[0];
    let allowance = [];
    if (tokenContract.mapID === 31)
      allowance =
        allowances === undefined
          ? []
          : allowances.filter(
              (allow) =>
                TezosMessageUtils.readAddress(allow.args[0].bytes) ===
                swapContract.address
            );
    else
      allowance =
        allowances === undefined
          ? []
          : allowances.filter(
              (allow) => allow.args[0].string === swapContract.address
            );
    return allowance.length === 0 ? "0" : allowance[0].args[1].int;
  }
};
