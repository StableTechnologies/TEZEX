const { Mutex } = require("async-mutex");
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
} = require("conseiljs");
const { KeyStoreUtils, SoftSigner } = require("conseiljs-softsigner");
const { JSONPath } = require("jsonpath-plus");
const log = require("loglevel");
const fetch = require("node-fetch");

module.exports = class Tezos {
  constructor(account, privateKey, swapContract, chainID, rpc, conseilServer) {
    this.account = account;
    this.privateKey = privateKey;
    this.rpc = rpc;
    this.conseilServer = conseilServer;
    this.swapContract = swapContract;
    this.chainID = chainID;
    this.mutex = new Mutex();
  }

  async initConseil() {
    const logger = log.getLogger("conseiljs");
    logger.setLevel("error", false);
    registerLogger(logger);
    registerFetch(fetch);
    this.keyStore = await KeyStoreUtils.restoreIdentityFromSecretKey(
      this.privateKey
    );
    this.signer = await SoftSigner.createSigner(
      TezosMessageUtils.writeKeyWithHint(this.keyStore.secretKey, "edsk"),
      -1
    );
  }

  async balance(address) {
    return await TezosNodeReader.getSpendableBalanceForAccount(
      this.rpc,
      address
    );
  }

  async initiateWait(hashedSecret, refundTime, ethAddress, amtInMuTez) {
    const res = await this.interact([
      {
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

  async addCounterParty(hashedSecret, tezAccount) {
    const res = await this.interact([
      {
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

  async redeem(hashedSecret, secret) {
    const res = await this.interact([
      {
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

  async refund(hashedSecret) {
    const res = await this.interact([
      {
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

  async getRedeemedSecret(hashedSecret) {
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
            set: [this.swapContract.address],
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
    return "";
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
          path: "$.args[0].args[0].bytes",
          json: jsonData,
        })[0],
      initiator: TezosMessageUtils.readAddress(
        JSONPath({ path: "$.args[0].args[1].args[0].bytes", json: jsonData })[0]
      ),
      initiator_eth: JSONPath({
        path: "$.args[0].args[1].args[1].string",
        json: jsonData,
      })[0],
      participant: TezosMessageUtils.readAddress(
        JSONPath({ path: "$.args[1].args[0].args[0].bytes", json: jsonData })[0]
      ),
      refundTimestamp: Number(
        JSONPath({ path: "$.args[1].args[0].args[1].int", json: jsonData })[0]
      ),
      state: Number(
        JSONPath({ path: "$.args[1].args[1].args[0].int", json: jsonData })[0]
      ),
      value: Number(
        JSONPath({ path: "$.args[1].args[1].args[1].int", json: jsonData })[0]
      ),
    };
  }

  async getSwap(hashedSecret) {
    hashedSecret = hashedSecret.substring(2);
    const packedKey = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(
        TezosMessageUtils.writePackedData(hashedSecret, "bytes"),
        "hex"
      )
    );
    const jsonData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      this.swapContract.mapID,
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
        path: "$.args[0].args[1].args[0].string",
        json: jsonData,
      })[0],
      initiator_eth: JSONPath({
        path: "$.args[0].args[1].args[1].string",
        json: jsonData,
      })[0],
      participant: JSONPath({
        path: "$.args[1].args[0].args[0].string",
        json: jsonData,
      })[0],
      refundTimestamp: Number(
        Math.round(
          new Date(
            JSONPath({
              path: "$.args[1].args[0].args[1].string",
              json: jsonData,
            })[0]
          ).getTime() / 1000
        )
      ),
      state: Number(
        JSONPath({ path: "$.args[1].args[1].args[0].int", json: jsonData })[0]
      ),
      value: Number(
        JSONPath({ path: "$.args[1].args[1].args[1].int", json: jsonData })[0]
      ),
    };
  }

  async getAllSwaps() {
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
            set: [this.swapContract.mapID.toString()],
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

  async getUserSwaps(account) {
    const swaps = await this.getAllSwaps();
    return swaps.filter((swp) => swp.initiator === account);
  }

  async getWaitingSwaps(minTimeToExpire) {
    const swaps = await this.getAllSwaps();
    return swaps.filter(
      (swp) =>
        swp.participant === swp.initiator &&
        swp.initiator !== this.account &&
        Math.trunc(Date.now() / 1000) < swp.refundTimestamp - minTimeToExpire
    );
  }

  async interact(operations, extraGas = 500, extraStorage = 50) {
    await this.mutex.acquire();
    try {
      for (let i = 0; i < operations.length; i++) {
        const fee = 105000,
          storageLimit = 6000,
          gasLimit = 1000000;
        operations[i].to =
          operations[i].to === undefined
            ? this.swapContract.address
            : operations[i].to;
        let {
          gas,
          storageCost: freight,
        } = await TezosNodeWriter.testContractInvocationOperation(
          this.rpc,
          this.chainID,
          this.keyStore,
          operations[i].to,
          operations[i].amtInMuTez,
          fee,
          storageLimit,
          gasLimit,
          operations[i].entrypoint,
          operations[i].parameters,
          TezosParameterFormat.Michelson
        );
        const fees = ~~((gas + extraGas) / 10 + 500);
        freight = freight == 0 ? 0 : freight + extraStorage;
        const result = await TezosNodeWriter.sendContractInvocationOperation(
          this.rpc,
          this.signer,
          this.keyStore,
          operations[i].to,
          operations[i].amtInMuTez,
          fees,
          freight,
          gas + extraGas,
          operations[i].entrypoint,
          operations[i].parameters,
          TezosParameterFormat.Michelson
        );
        const groupid = result["operationGroupID"]
          .replace(/"/g, "")
          .replace(/\n/, ""); // clean up RPC output
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
