import addCounterParty from "../ethereum/operations/addCounterParty";
import approveToken from "../ethereum/operations/approveToken";
import getRedeemedSecret from "../ethereum/operations/getRedeemedSwap";
import getSwapEth from "../ethereum/operations/getSwap";
import initWait from "../ethereum/operations/initiateWait";
import refund from "../ethereum/operations/refund";
import getSwapTez from "../tezos/operations/getSwap";
import redeem from "../tezos/operations/redeem";

const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  const id = setInterval(async () => {
    const swp = await getSwapEth(ethStore, hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.initiator_tez !== "" && swp.refundTimestamp !== "0") {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        clearInterval(id);
        const res = await refund(ethStore.web3, ethStore, hashedSecret);
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
    const secret = await getRedeemedSecret(ethStore, hashedSecret);
    const res = await redeem(tezStore, hashedSecret, secret);
    if (!res) {
      update(hashedSecret, 0);
      return;
    }
    update(hashedSecret, 3);
  }, 180000);
};

const respondTezos = async (amount, ethStore, tezStore, req_swap, update) => {
  //create new swap response on ethereum
  const refundTime = req_swap.refundTimestamp - 3600;
  const approveTokens = await approveToken(
    ethStore.web3,
    ethStore,
    parseInt(amount)
  );
  if (!approveTokens) return undefined;
  const status = await initWait(
    ethStore.web3,
    ethStore,
    req_swap.hashedSecret,
    refundTime,
    tezStore.account,
    amount.toString()
  );

  if (!status) return undefined;

  console.log("\nSWAP GENERATED | HASH: ", req_swap.hashedSecret);

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await refund(ethStore.web3, ethStore, req_swap.hashedSecret);
      if (!res) {
        update(req_swap.hashedSecret, 0);
        return;
      }
      update(req_swap.hashedSecret, 4);
      return;
    }
    const swp = await getSwapTez(req_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== tezStore.account) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await addCounterParty(
      ethStore.web3,
      ethStore,
      req_swap.hashedSecret,
      swp.initiator_eth
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
    type: "eth",
    hashedSecret: req_swap.hashedSecret,
    value: amount + " USDC",
    refundTime,
    state: 1,
  };
};

export default respondTezos;
