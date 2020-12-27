import { TezosOperationType } from "@airgap/beacon-sdk";
import { Mutex } from "async-mutex";
import {
  ConseilDataClient,
  ConseilOperator,
  ConseilSortDirection,
  TezosConseilClient,
  TezosLanguageUtil,
  TezosMessageUtils,
  TezosNodeReader,
} from "conseiljs";
import { JSONPath } from "jsonpath-plus";

export default class Tezos {
  constructor(tezos, account, swapContract, rpc, conseilServer) {
    this.account = account;
    this.tezos = tezos;
    this.rpc = rpc;
    this.conseilServer = conseilServer;
    this.swapContract = swapContract;
    this.mutex = new Mutex();
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

  async getReward() {
    const storage = await TezosNodeReader.getContractStorage(
      this.rpc,
      this.swapContract.address
    );
    return parseInt(
      JSONPath({
        path: "$.args[1].args[1].args[0].int",
        json: storage,
      })[0]
    );
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
      initiator_eth_addr: JSONPath({
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
      initiator_eth_addr: JSONPath({
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

  async interact(operations, extraGas = 300, extraStorage = 50) {
    await this.mutex.acquire();
    try {
      let ops = [];
      operations.forEach((op) => {
        op.to = op.to === undefined ? this.swapContract.address : op.to;
        ops.push({
          kind: TezosOperationType.TRANSACTION,
          amount: op.amtInMuTez,
          destination: op.to,
          source: this.account,
          parameters: {
            entrypoint: op.entrypoint,
            value: JSON.parse(
              TezosLanguageUtil.translateParameterMichelsonToMicheline(
                op.parameters
              )
            ),
          },
        });
      });
      const result = await this.tezos.requestOperation({
        operationDetails: ops,
      });
      console.log(result);
      const groupid = result["transactionHash"]
        .replace(/"/g, "")
        .replace(/\n/, ""); // clean up RPC output
      const confirm = await TezosConseilClient.awaitOperationConfirmation(
        this.conseilServer,
        this.conseilServer.network,
        groupid,
        2
      );
      return confirm;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      this.mutex.release();
    }
  }
}
