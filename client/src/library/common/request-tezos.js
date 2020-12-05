import getSwapEth from "../ethereum/operations/getSwap";
import redeem from "../ethereum/operations/redeem";
import addCounterParty from "../tezos/operations/addCounterParty";
import approveToken from "../tezos/operations/approveToken";
import getSwapTez from "../tezos/operations/getSwap";
import initWait from "../tezos/operations/initiateWait";
import refund from "../tezos/operations/refund";
import createSecrets from "./createSecrets";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(tezStore, secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await getSwapEth(ethStore, secret.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.participant !== ethStore.account) return;
    clearInterval(tid);
    console.log("\nCOMPLETING SWAP");
    const res = await redeem(
      ethStore.web3,
      ethStore,
      secret.hashedSecret,
      secret.secret
    );
    if (!res) {
      update(secret.hashedSecret, 0);
      return;
    }
    update(secret.hashedSecret, 3);
  }, 180000);
};

const requestTezos = async (amount, ethStore, tezStore, update) => {
  // generate swap secret
  const secret = createSecrets();
  console.log("Your SWAP Secret (XTZ->ETH): ", secret);

  // create new swap with refund time set to 2hrs
  const refundTime = Math.trunc(Date.now() / 1000) + 7200;
  const approve = await approveToken(tezStore, amount);
  if (!approve) return undefined;
  const status = await initWait(
    tezStore,
    ethStore.account,
    amount + "",
    secret.hashedSecret,
    refundTime
  );

  if (!status) return undefined;

  console.log("\nSWAP Generated : ");
  const swap = await getSwapTez(secret.hashedSecret);
  console.log(JSON.stringify(swap));

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(tezStore, secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await getSwapEth(ethStore, secret.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.initiator_tez === "" && swp.refundTimestamp === "0") return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await addCounterParty(
      tezStore,
      swp.initiator_tez,
      secret.hashedSecret
    );
    if (!res) {
      update(secret.hashedSecret, 0);
      return;
    }
    update(secret.hashedSecret, 2);
    waitCompletion(secret, tezStore, ethStore, refundTime, update);
  }, 180000);

  return {
    type: "tez",
    hashedSecret: secret.hashedSecret,
    value: amount + " USDTz",
    refundTime,
    state: 1,
  };
};

export default requestTezos;
