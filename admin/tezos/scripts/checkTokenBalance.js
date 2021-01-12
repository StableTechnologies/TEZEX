const { TezosNodeReader, TezosMessageUtils } = require("conseiljs");
const config = require("../../config/tez-token-swap-config.json");
const init = require("../../tezos/init");
const { JSONPath } = require("jsonpath-plus");

const getBalanceAllowance = async (owner, delegate) => {
  await init();
  const ownerKey = TezosMessageUtils.encodeBigMapKey(
    Buffer.from(TezosMessageUtils.writePackedData(owner, "address"), "hex")
  );
  const delegateKey = TezosMessageUtils.encodeBigMapKey(
    Buffer.from(TezosMessageUtils.writePackedData(delegate, "address"), "hex")
  );
  const ownerData = await TezosNodeReader.getValueForBigMapKey(
    config.RPC,
    17195,
    ownerKey,
    undefined,
    config.chain_id
  );
  const delegateData = await TezosNodeReader.getValueForBigMapKey(
    config.RPC,
    32417,
    delegateKey,
    undefined,
    config.chain_id
  );
  let ownerBalance =
      ownerData === undefined
        ? "0"
        : JSONPath({ path: "$.args[1].int", json: ownerData })[0],
    allowances =
      ownerData == undefined
        ? undefined
        : JSONPath({ path: "$.args[0]", json: ownerData })[0],
    delegateBalance =
      delegateData == undefined
        ? "0"
        : JSONPath({
            path: "$.args[1].int",
            json: delegateData,
          })[0];
  const allowance =
    allowances == undefined
      ? []
      : allowances.filter((allow) => allow.args[0].string === delegate);
  return {
    ownerBalance,
    delegateAllowance: allowance.length === 0 ? "0" : allowance[0].args[1].int,
    delegateBalance,
  };
};
getBalanceAllowance(config.walletAddr, config.contractAddr).then(console.log);
