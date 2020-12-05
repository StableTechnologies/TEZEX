import { TezosMessageUtils, TezosNodeReader } from "conseiljs";
import { JSONPath } from "jsonpath-plus";
import config from "../../../globalConfig.json";

export const accountBalanceTez = async (address) => {
  const result = await TezosNodeReader.getSpendableBalanceForAccount(
    config.tezos.RPC,
    address
  );
  return result;
};

export const tokenBalanceTez = async (address) => {
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
};

export const allowanceTez = async (address) => {
  const key = TezosMessageUtils.encodeBigMapKey(
    Buffer.from(TezosMessageUtils.writePackedData(address, "address"), "hex")
  );
  const tokenData = await TezosNodeReader.getValueForBigMapKey(
    config.tezos.RPC,
    config.tezos.token_map,
    key
  );
  let allowances =
    tokenData == undefined
      ? undefined
      : JSONPath({ path: "$.args[0]", json: tokenData })[0];
  const allowance =
    allowances == undefined
      ? []
      : allowances.filter(
          (allow) => allow.args[0].string === config.tezos.contractAddr
        );
  return allowance.length === 0 ? "0" : allowance[0].args[1].int;
};
