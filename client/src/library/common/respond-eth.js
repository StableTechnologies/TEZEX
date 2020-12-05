import getSwapEth from "../ethereum/operations/getSwap";
import redeem from "../ethereum/operations/redeem";
import addCounterParty from "../tezos/operations/addCounterParty";
import approveToken from "../tezos/operations/approveToken";
import getRedeemedSecret from "../tezos/operations/getRedeemedSwap";
import getSwapTez from "../tezos/operations/getSwap";
import initWait from "../tezos/operations/initiateWait";
import refund from "../tezos/operations/refund";

const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  const id = setInterval(async () => {
    const swp = await getSwapTez(hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp !== undefined) {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        clearInterval(id);
        const res = await refund(tezStore, hashedSecret);
        if (!res) {
          update(hashedSecret, 0);
          return;
        }
        update(hashedSecret, 4);
      }
      return;
    }
    clearInterval(id);
    console.log("\nCOMPLETING SWAP");
    const secret = await getRedeemedSecret(hashedSecret);
    const res = await redeem(ethStore.web3, ethStore, hashedSecret, secret);
    if (!res) {
      update(hashedSecret, 0);
      return;
    }
    update(hashedSecret, 3);
  }, 180000);
};

const respondEth = async (amount, ethStore, tezStore, req_swap, update) => {
  //create new swap response on ethereum
  const refundTime = req_swap.refundTimestamp - 3600;
  const approve = await approveToken(tezStore, amount);
  if (!approve) return undefined;
  const status = await initWait(
    tezStore,
    ethStore.account,
    amount + "",
    req_swap.hashedSecret,
    refundTime
  );

  if (!status) return undefined;

  console.log("\nSWAP GENERATED | HASH: ", req_swap.hashedSecret);

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(tezStore, req_swap.hashedSecret);
      if (!res) {
        update(req_swap.hashedSecret, 0);
        return;
      }
      update(req_swap.hashedSecret, 4);
      return;
    }
    const swp = await getSwapEth(ethStore, req_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== ethStore.account) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await addCounterParty(
      tezStore,
      swp.initiator_tez,
      req_swap.hashedSecret
    );
    if (!res) {
      update(req_swap.hashedSecret, 0);
      return;
    }
    update(req_swap.hashedSecret, 2);
    waitCompletion(
      req_swap.hashedSecret,
      ethStore,
      tezStore,
      refundTime,
      update
    );
  }, 180000);

  return {
    type: "tez",
    hashedSecret: req_swap.hashedSecret,
    value: amount + " USDTz",
    refundTime,
    state: 1,
  };
};

export default respondEth;
