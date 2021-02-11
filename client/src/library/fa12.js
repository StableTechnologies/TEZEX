import { TezosMessageUtils, TezosNodeReader } from "conseiljs";
import { JSONPath } from "jsonpath-plus";
import Tezos from "./tezos";

export default class USDtz extends Tezos {
  constructor(
    tezos,
    account,
    swapContract,
    priceContract,
    feeContract,
    tokenContract,
    rpc,
    conseilServer
  ) {
    super(
      tezos,
      account,
      swapContract,
      priceContract,
      feeContract,
      rpc,
      conseilServer
    );
    this.tokenContract = tokenContract; // tezos fa1.2 token contract details {address:string, mapID:nat}
  }

  /**
   * Get the tezos fa1.2 token balance for an account
   *
   * @param address tezos address for the account
   */
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
        : JSONPath({ path: "$.args[0].int", json: tokenData })[0];
    return balance;
  }

  /**
   * Get the tezos fa1.2 token allowance for swap contract by an account
   *
   * @param address tezos address for the account
   */
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
        : JSONPath({ path: "$.args[1]", json: tokenData })[0];
    const allowance =
      allowances === undefined
        ? []
        : allowances.filter(
            (allow) => allow.args[0].string === this.swapContract.address
          );
    return allowance.length === 0 ? "0" : allowance[0].args[1].int;
  }

  /**
   * Approve tokens for the swap contract
   *
   * @param amount the quantity of fa1.2 tokens to be approved
   */
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
      throw new Error("TEZOS TX FAILED");
    }
    return res;
  }

  /**
   * Initiate a swap on the tezos chain
   *
   * @param hashedSecret hashed secret for the swap
   * @param refundTime  unix time(sec) after which the swap expires
   * @param ethAddress initiators tezos account address
   * @param amount value of the swap in fa1.2 tokens
   */
  async initiateWait(hashedSecret, refundTime, ethAddress, amount) {
    const res = await this.interact([
      {
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
}
