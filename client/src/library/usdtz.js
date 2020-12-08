import { TezosMessageUtils, TezosNodeReader } from "conseiljs";
import { JSONPath } from "jsonpath-plus";
import config from "./globalConfig.json";
import Tezos from "./tezos";

export default class USDTz extends Tezos {
  constructor(tezos, account) {
    super(tezos, account);
  }
  async tokenBalance(address) {
    const key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    const tokenData = await TezosNodeReader.getValueForBigMapKey(
      config.tezos.RPC,
      config.tezos.token_map,
      key
    );
    let balance =
      tokenData === undefined
        ? "0"
        : JSONPath({ path: "$.args[1].int", json: tokenData })[0];
    return balance;
  }

  async tokenAllowance(address) {
    const key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    const tokenData = await TezosNodeReader.getValueForBigMapKey(
      config.tezos.RPC,
      config.tezos.token_map,
      key
    );
    let allowances =
      tokenData === undefined
        ? undefined
        : JSONPath({ path: "$.args[0]", json: tokenData })[0];
    const allowance =
      allowances === undefined
        ? []
        : allowances.filter(
            (allow) => allow.args[0].string === config.tezos.contractAddr
          );
    return allowance.length === 0 ? "0" : allowance[0].args[1].int;
  }

  async approveToken(amount) {
    const allow = await this.tokenAllowance(this.account);
    let ops = [];
    if (parseInt(allow) > 0) {
      ops.push({
        amtInMuTez: 0,
        entrypoint: "approve",
        parameters: `(Pair "${config.tezos.contractAddr}" 0)`,
        to: config.tezos.tokenAddr,
      });
    }
    ops.push({
      amtInMuTez: 0,
      entrypoint: "approve",
      parameters: `(Pair "${config.tezos.contractAddr}" ${amount})`,
      to: config.tezos.tokenAddr,
    });
    const res = await this.interact(ops);
    if (res.status !== "applied") {
      return false;
    }
    return true;
  }

  async initiateWait(hashedSecret, refundTime, ethAddress, amount) {
    const res = await this.interact([
      {
        amtInMuTez: 0,
        entrypoint: "initiateWait",
        parameters: `(Pair (Pair ${amount} ${hashedSecret}) (Pair "${refundTime}" "${ethAddress}"))`,
      },
    ]);
    if (res.status !== "applied") {
      return false;
    }
    return true;
  }
}
