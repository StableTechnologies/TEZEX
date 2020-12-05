import invokeContract from "./util/invokeContract";

const initWait = async (store, ethAddress, amount, hashedSecret, time) => {
  const res = await invokeContract(
    store,
    "0",
    "initiateWait",
    `(Pair (Pair ${amount} ${hashedSecret}) (Pair "${time}" "${ethAddress}"))`,
    15000,
    300
  );
  if (res.status !== "applied") {
    return false;
  }
  return true;
};

export default initWait;
