import addCounterParty from "../ethereum/operations/addCounterParty";
import approveToken from "../ethereum/operations/approveToken";
import getSwapEth from "../ethereum/operations/getSwap";
import initWait from "../ethereum/operations/initiateWait";
import refund from "../ethereum/operations/refund";
import getSwapTez from "../tezos/operations/getSwap";
import redeem from "../tezos/operations/redeem";
import createSecrets from "./createSecrets";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(ethStore.web3, ethStore, secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await getSwapTez(secret.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.participant !== tezStore.account) return;
    clearInterval(tid);
    console.log("\nCOMPLETING SWAP");
    const res = await redeem(tezStore, secret.hashedSecret, secret.secret);
    if (!res) {
      update(secret.hashedSecret, 0);
      return;
    }
    update(secret.hashedSecret, 3);
  }, 180000);
};

const requestEth = async (amount, ethStore, tezStore, update) => {
  // generate swap secret
  const secret = createSecrets();
  console.log("Your SWAP Secret (USDC->USDTz): ", secret);

  // create new swap with refund time set to 2hrs
  const refundTime = Math.trunc(Date.now() / 1000) + 7200;
  const approveTokens = await approveToken(
    ethStore.web3,
    ethStore,
    parseInt(amount)
  );
  if (!approveTokens) return undefined;

  const status = await initWait(
    ethStore.web3,
    ethStore,
    secret.hashedSecret,
    refundTime,
    tezStore.account,
    amount
  );
  if (!status) return undefined;

  console.log("\nSWAP Generated : ");
  const swap = await getSwapEth(ethStore, secret.hashedSecret);
  console.log(JSON.stringify(swap));

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(ethStore.web3, ethStore, secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await getSwapTez(secret.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp === undefined) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await addCounterParty(
      ethStore.web3,
      ethStore,
      secret.hashedSecret,
      swp.initiator_eth
    );
    if (!res) {
      update(secret.hashedSecret, 0);
      return;
    }
    update(secret.hashedSecret, 2);
    waitCompletion(secret, tezStore, ethStore, refundTime, update);
  }, 180000);

  return {
    type: "eth",
    hashedSecret: secret.hashedSecret,
    value: amount + " USDC",
    refundTime,
    state: 1,
  };
};

export default requestEth;
