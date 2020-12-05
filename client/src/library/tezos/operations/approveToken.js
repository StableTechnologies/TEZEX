import config from "../../../globalConfig.json";
import { allowanceTez } from "../account/getAccountBalance";
import invokeContract from "./util/invokeContract";

const approveToken = async (store, amount) => {
  const allow = await allowanceTez(store.account);
  console.log(allow);
  if (parseInt(allow) > 0) {
    const res = await invokeContract(
      store,
      "0",
      "approve",
      `(Pair "${config.tezos.contractAddr}" 0)`,
      10000,
      300,
      config.tezos.tokenAddr
    );
    if (res.status !== "applied") {
      return false;
    }
  }
  const res = await invokeContract(
    store,
    "0",
    "approve",
    `(Pair "${config.tezos.contractAddr}" ${amount})`,
    10000,
    300,
    config.tezos.tokenAddr
  );
  if (res.status !== "applied") {
    return false;
  }
  return true;
};

export default approveToken;
