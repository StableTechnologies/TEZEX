import BCInteract from "./bc-intereraction";

const initWait = async (web3, store, secret, refundTime, tezAcc, amount) => {
  const data = await store.contract.methods
    .initiateWait(secret, tezAcc, amount, refundTime)
    .encodeABI();
  const rc = await BCInteract(web3, store, data, "0", "1000000");
  return rc;
};

export default initWait;
