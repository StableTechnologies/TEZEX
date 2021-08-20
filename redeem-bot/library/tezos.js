const {
  ConseilDataClient,
  ConseilOperator,
  ConseilSortDirection,
  registerFetch,
  registerLogger,
  TezosConseilClient,
  TezosLanguageUtil,
  TezosMessageUtils,
  TezosNodeReader,
  TezosNodeWriter,
  TezosParameterFormat,
  TezosConstants,
} = require("conseiljs");
const { KeyStoreUtils, SoftSigner } = require("conseiljs-softsigner");
const { JSONPath } = require("jsonpath-plus");
const log = require("loglevel");
const fetch = require("node-fetch");

module.exports = class Tezos {
  constructor(
    privateKey,
    priceContract,
    feeContract,
    chainID,
    rpc,
    conseilServer,
    mutex
  ) {
    this.account = ""; // tezos wallet address
    this.privateKey = privateKey; // tezos private key
    this.rpc = rpc; // rpc server address for network interaction
    this.conseilServer = conseilServer; // conseil server setting
    this.priceContract = priceContract; // tezos harbinger oracle contract details {address:string, mapID:nat}
    this.feeContract = feeContract; // tezos tx fee contract details {address:string, mapID:nat}
    this.chainID = chainID; // chain id being used
    this.mutex = mutex;
  }

  /**
   * Initiate conseil keystore and signer
   */
  async initConseil() {
    const logger = log.getLogger("conseiljs");
    logger.setLevel("error", false);
    registerLogger(logger);
    registerFetch(fetch);
    this.keyStore = await KeyStoreUtils.restoreIdentityFromSecretKey(
      this.privateKey
    );
    this.account = this.keyStore.publicKeyHash;
    this.signer = await SoftSigner.createSigner(
      TezosMessageUtils.writeKeyWithHint(this.keyStore.secretKey, "edsk")
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
    let key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    if (tokenContract.mapID === 31) {
      key = Buffer.from(TezosMessageUtils.writePackedData(`(Pair "ledger" 0x${TezosMessageUtils.writeAddress(address)})`, '', TezosParameterFormat.Michelson), 'hex');
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
      if (!(Object.prototype.hasOwnProperty.call(err, "httpStatus") && err.httpStatus === 404))
        throw err;
    }
    if (tokenContract.mapID === 31 && tokenData !== undefined) {
      tokenData = JSON.parse(TezosLanguageUtil.hexToMicheline(JSONPath({ path: '$.bytes', json: tokenData })[0].slice(2)).code)
    }
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
    let key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    if (tokenContract.mapID === 31) {
      key = Buffer.from(TezosMessageUtils.writePackedData(`(Pair "ledger" 0x${TezosMessageUtils.writeAddress(address)})`, '', TezosParameterFormat.Michelson), 'hex');
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
      if (!(Object.prototype.hasOwnProperty.call(err, "httpStatus") && err.httpStatus === 404))
        throw err;
    }
    if (tokenContract.mapID === 31 && tokenData !== undefined) {
      tokenData = JSON.parse(TezosLanguageUtil.hexToMicheline(JSONPath({ path: '$.bytes', json: tokenData })[0].slice(2)).code)
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
            (allow) => TezosMessageUtils.readAddress(allow.args[0].bytes) === swapContract.address
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

  /**
   * Approve tokens for the swap contract
   *
   * @param tokenContract tezos fa1.2 token contract details {address:string, mapID:nat}
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param amount the quantity of fa1.2 tokens to be approved
   */
  async approveToken(tokenContract, swapContract, amount) {
    const allow = await this.tokenAllowance(
      tokenContract,
      swapContract,
      this.account
    );
    let ops = [];
    if (parseInt(allow) > 0) {
      ops.push({
        amtInMuTez: 0,
        entrypoint: "approve",
        parameters: `(Pair "${swapContract.address}" 0)`,
        to: tokenContract.address,
      });
    }
    ops.push({
      amtInMuTez: 0,
      entrypoint: "approve",
      parameters: `(Pair "${swapContract.address}" ${amount})`,
      to: tokenContract.address,
    });
    const res = await this.interact(ops);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Initiate a token swap on the tezos chain
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param ethAddress initiators tezos account address
   * @param amount value of the swap in fa1.2 tokens
   */
  async tokenInitiateWait(
    swapContract,
    hashedSecret,
    refundTime,
    ethAddress,
    amount
  ) {
    const res = await this.interact([
      {
        to: swapContract.address,
        amtInMuTez: 0,
        entrypoint: "initiateWait",
        parameters: `(Pair (Pair ${amount} ${hashedSecret}) (Pair "${refundTime}" "${ethAddress}"))`,
      },
    ]);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Initiate a xtz swap on the tezos chain
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param ethAddress initiators tezos account address
   * @param amtInMuTez value of the swap in mutez
   */
  async initiateWait(
    swapContract,
    hashedSecret,
    refundTime,
    ethAddress,
    amtInMuTez
  ) {
    const res = await this.interact([
      {
        to: swapContract.address,
        amtInMuTez,
        entrypoint: "initiateWait",
        parameters: `(Pair ${hashedSecret} (Pair "${refundTime}" "${ethAddress}"))`,
      },
    ]);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Add counter-party details to an existing(initiated) swap
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret of the swap being updated
   * @param tezAccount participant/counter-party tezos address
   */
  async addCounterParty(swapContract, hashedSecret, tezAccount) {
    const res = await this.interact([
      {
        to: swapContract.address,
        amtInMuTez: 0,
        entrypoint: "addCounterParty",
        parameters: `(Pair ${hashedSecret} "${tezAccount}")`,
      },
    ]);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Redeem the swap if possible
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret of the swap being redeemed
   * @param secret secret for the swap which produced the corresponding hashedSecret
   */
  async redeem(swapContract, hashedSecret, secret) {
    const res = await this.interact([
      {
        to: swapContract.address,
        amtInMuTez: 0,
        entrypoint: "redeem",
        parameters: `(Pair ${hashedSecret} ${secret})`,
      },
    ]);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Refund the swap if possible
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret of the swap being refunded
   */
  async refund(swapContract, hashedSecret) {
    const res = await this.interact([
      {
        to: swapContract.address,
        amtInMuTez: 0,
        entrypoint: "refund",
        parameters: `${hashedSecret}`,
      },
    ]);
    if (res.status !== "applied") {
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Get reward basis points for responding to swaps
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   */
  async getReward(swapContract) {
    const storage = await TezosNodeReader.getContractStorage(
      this.rpc,
      swapContract.address
    );
    return parseInt(
      JSONPath({
        path: "$.args[2].int",
        json: storage,
      })[0]
    );
  }

  /**
   * Get Tx Fee details/Gas consumption for each tx of the swap
   */
  async getFees() {
    const storage = await TezosNodeReader.getContractStorage(
      this.rpc,
      this.feeContract.address
    );
    const feeDetails = JSONPath({
      path: "$.args[1]",
      json: storage,
    })[0];
    const res = {};
    feeDetails.forEach((fee) => {
      const name = JSONPath({
        path: "$.args[0].string",
        json: fee,
      })[0];
      res[name] = {
        addCounterParty: parseInt(
          JSONPath({
            path: "$.args[1].args[0].args[0].int",
            json: fee,
          })[0]
        ),
        approve: parseInt(
          JSONPath({
            path: "$.args[1].args[0].args[1].int",
            json: fee,
          })[0]
        ),
        initiateWait: parseInt(
          JSONPath({
            path: "$.args[1].args[1].int",
            json: fee,
          })[0]
        ),
        redeem: parseInt(
          JSONPath({
            path: "$.args[1].args[2].int",
            json: fee,
          })[0]
        ),
        updateTime: new Date(
          JSONPath({
            path: "$.args[1].args[3].string",
            json: fee,
          })[0]
        ).getTime(),
      };
    });
    return res;
  }

  /**
   * Get the current asset pair price from the harbinger oracle
   *
   * @param asset asset pair eg. ETH-USD as supported by harbinger
   */
  async getPrice(asset) {
    const packedKey = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(asset, "string"), "hex")
    );
    const jsonData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      this.priceContract.mapID,
      packedKey
    );
    return parseInt(
      JSONPath({
        path: "$.args[0].args[0].int",
        json: jsonData,
      })[0]
    );
  }

  parseRedeemValue(e) {
    const splt = e.parameters.split(" ");
    return {
      ...e,
      parameters: {
        hashedSecret: splt[1],
        secret: splt[2],
      },
    };
  }

  /**
   * Get the secret for a swap that has already been redeemed
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret of the redeemed swap
   *
   * @return the secret for the swap if available
   */
  async getRedeemedSecret(swapContract, hashedSecret) {
    const data = await ConseilDataClient.executeEntityQuery(
      this.conseilServer,
      "tezos",
      this.conseilServer.network,
      "operations",
      {
        fields: ["timestamp", "source", "parameters_entrypoints", "parameters"],
        predicates: [
          {
            field: "kind",
            operation: "eq",
            set: ["transaction"],
            inverse: false,
          },
          {
            field: "timestamp",
            operation: "after",
            set: [1599984675000],
            inverse: false,
          },
          {
            field: "status",
            operation: "eq",
            set: ["applied"],
            inverse: false,
          },
          {
            field: "destination",
            operation: "eq",
            set: [swapContract.address],
            inverse: false,
          },
          {
            field: "parameters_entrypoints",
            operation: "eq",
            set: ["redeem"],
            inverse: false,
          },
        ],
        orderBy: [{ field: "timestamp", direction: "desc" }],
        aggregation: [],
        limit: 1000,
      }
    );
    for (let i = 0; i < data.length; ++i) {
      const swp = this.parseRedeemValue(data[i]);
      if (swp.parameters.hashedSecret === hashedSecret)
        return swp.parameters.secret;
    }
    return undefined;
  }

  parseSwapValue(michelsonData) {
    const michelineData = TezosLanguageUtil.translateMichelsonToMicheline(
      michelsonData
    );
    const jsonData = JSON.parse(michelineData);
    return {
      hashedSecret:
        "0x" +
        JSONPath({
          path: "$.args[0].bytes",
          json: jsonData[0],
        })[0],
      initiator: TezosMessageUtils.readAddress(
        JSONPath({ path: "$.args[1].args[0].bytes", json: jsonData[0] })[0]
      ),
      initiator_eth_addr: JSONPath({
        path: "$.args[1].args[1].string",
        json: jsonData[0],
      })[0],
      participant: TezosMessageUtils.readAddress(
        JSONPath({ path: "$.args[0].bytes", json: jsonData[1] })[0]
      ),
      refundTimestamp: Number(
        JSONPath({ path: "$.args[1].int", json: jsonData[1] })[0]
      ),
      state: Number(jsonData[2].int),
      value: jsonData[3].int,
    };
  }

  /**
   * Get details of a particular swap
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param hashedSecret hashed secret of the swap requested
   *
   * @return the swap details if available
   */
  async getSwap(swapContract, hashedSecret) {
    hashedSecret = hashedSecret.substring(2);
    const packedKey = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(
        TezosMessageUtils.writePackedData(hashedSecret, "bytes"),
        "hex"
      )
    );
    const jsonData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      swapContract.mapID,
      packedKey
    );
    if (jsonData === undefined) return jsonData;
    return {
      hashedSecret:
        "0x" +
        JSONPath({
          path: "$.args[0].args[0].bytes",
          json: jsonData,
        })[0],
      initiator: JSONPath({
        path: "$.args[0].args[1].string",
        json: jsonData,
      })[0],
      initiator_eth_addr: JSONPath({
        path: "$.args[0].args[2].string",
        json: jsonData,
      })[0],
      participant: JSONPath({
        path: "$.args[1].args[0].string",
        json: jsonData,
      })[0],
      refundTimestamp: Number(
        Math.round(
          new Date(
            JSONPath({
              path: "$.args[1].args[1].string",
              json: jsonData,
            })[0]
          ).getTime() / 1000
        )
      ),
      state: Number(JSONPath({ path: "$.args[2].int", json: jsonData })[0]),
      value: JSONPath({ path: "$.args[3].int", json: jsonData })[0],
    };
  }

  /**
   * Get the list of all active swaps
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @return a list of all active swaps with their details
   */
  async getAllSwaps(swapContract) {
    const data = await ConseilDataClient.executeEntityQuery(
      this.conseilServer,
      "tezos",
      this.conseilServer.network,
      "big_map_contents",
      {
        fields: [
          "key",
          "key_hash",
          "operation_group_id",
          "big_map_id",
          "value",
        ],
        predicates: [
          {
            field: "big_map_id",
            operation: ConseilOperator.EQ,
            set: [swapContract.mapID.toString()],
            inverse: false,
          },
          {
            field: "value",
            operation: ConseilOperator.ISNULL,
            set: [""],
            inverse: true,
          },
        ],
        orderBy: [{ field: "key", direction: ConseilSortDirection.DESC }],
        aggregation: [],
        limit: 1000,
      }
    );
    let swaps = [];
    data.forEach((e) => {
      if (e.value !== null) swaps.push(this.parseSwapValue(e.value));
    });
    return swaps;
  }

  /**
   * Get the list of all active swaps initiated by a specific user
   *
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   * @param account tezos address of the user whose swaps are to be retrieved
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
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
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
   * @param swapContract tezos swap contract details {address:string, mapID:nat}
   *
   * @return a list of waiting swaps with details
   */
  async getRedeemableSwaps(swapContract) {
    const swaps = await this.getAllSwaps(swapContract);
    return swaps.filter(
      (swp) =>
        swp.state === 2 &&
        Math.trunc(Date.now() / 1000) < (swp.refundTimestamp - 300)
    );
  }

  /**
   * Send a tx to the blockchain
   *
   * @param operations List of operations needed to be sent to the chain
   * @param extraGas extra gas to add for the tx (user choice)
   * @param extraStorage extra storage to add for the tx (user choice)
   *
   * @return operation result
   */
  async interact(operations, extraGas = 500, extraStorage = 50) {
    await this.mutex.acquire();
    try {
      for (let i = 0; i < operations.length; i++) {
        const fee = 105000,
          storageLimit = 6000,
          gasLimit = 1000000;
        const result = await TezosNodeWriter.sendContractInvocationOperation(
          this.rpc,
          this.signer,
          this.keyStore,
          operations[i].to,
          operations[i].amtInMuTez,
          fee,
          storageLimit + extraStorage,
          gasLimit + extraGas,
          operations[i].entrypoint,
          operations[i].parameters,
          TezosParameterFormat.Michelson,
          TezosConstants.HeadBranchOffset,
          true
        );
        const groupid = result["operationGroupID"]
          .replace(/"/g, "")
          .replace(/\n/, ""); // clean up RPC output
        console.log("TEZOS TX HASH: ", groupid);
        const opRes = await TezosConseilClient.awaitOperationConfirmation(
          this.conseilServer,
          this.conseilServer.network,
          groupid,
          2
        );
        if (opRes.status != "applied") {
          return opRes;
        }
      }
      return { status: "applied" };
    } catch (err) {
      console.error("TEZOS TX ERROR : ", err);
      throw err;
    } finally {
      this.mutex.release();
    }
  }
};
