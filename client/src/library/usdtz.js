import { TezosMessageUtils, TezosNodeReader } from "conseiljs";
import { JSONPath } from "jsonpath-plus";
import Tezos from "./tezos";

export default class USDTz extends Tezos {
  constructor(tezos, account, swapContract, tokenContract, rpc, conseilServer) {
    super(tezos, account, swapContract, rpc, conseilServer);
    this.tokenContract = tokenContract;
  }

  async tokenBalance(address) {
    const key = TezosMessageUtils.encodeBigMapKey(
      Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
    );
    const tokenData = await TezosNodeReader.getValueForBigMapKey(
      this.rpc,
      this.tokenContract.mapID,
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
      this.rpc,
      this.tokenContract.mapID,
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
            (allow) => allow.args[0].string === this.swapContract.address
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
        parameters: `(Pair "${this.swapContract.address}" 0)`,
        to: this.tokenContract.address,
      });
    }
    ops.push({
      amtInMuTez: 0,
      entrypoint: "approve",
      parameters: `(Pair "${this.swapContract.address}" ${amount})`,
      to: this.tokenContract.address,
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
