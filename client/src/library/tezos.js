import { TezosOperationType } from "@airgap/beacon-sdk";
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
import config from "./globalConfig.json";

export default class Tezos {
  constructor(tezos, account) {
    this.tezos = tezos;
    this.account = account;
  }
  async balance(address) {
    return await TezosNodeReader.getSpendableBalanceForAccount(
      config.tezos.RPC,
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
      return false;
    }
    return true;
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
      return false;
    }
    return true;
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
      return false;
    }
    return true;
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
      return false;
    }
    return true;
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
      config.tezos.conseilServer,
      "tezos",
      config.tezos.network,
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
            set: [config.tezos.contractAddr],
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
      config.tezos.RPC,
      config.tezos.contract_map,
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
      config.tezos.conseilServer,
      "tezos",
      config.tezos.network,
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
            set: [config.tezos.contract_map.toString()],
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

  interact(operations, extraGas = 300, extraStorage = 50) {
    return new Promise((resolve, reject) => {
      let ops = [];
      operations.forEach((op) => {
        op.to = op.to === undefined ? config.tezos.contractAddr : op.to;
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
      this.tezos
        .requestOperation({
          operationDetails: ops,
        })
        .then((result) => {
          console.log(result);
          const groupid = result["transactionHash"]
            .replace(/"/g, "")
            .replace(/\n/, ""); // clean up RPC output
          return TezosConseilClient.awaitOperationConfirmation(
            config.tezos.conseilServer,
            config.tezos.network,
            groupid,
            1
          );
        })
        .then(resolve)
        .catch((err) => {
          console.log(err);
          resolve({ status: "error" });
        });
    });
  }
}
