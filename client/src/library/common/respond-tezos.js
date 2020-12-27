const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  setTimeout(async function run() {
    try {
      const swp = await ethStore.getSwap(hashedSecret);
      console.log("WAITING TO COMPLETE SWAP");
      if (swp.initiator_tez_addr !== "" && swp.refundTimestamp !== "0") {
        if (Math.trunc(Date.now() / 1000) >= refundTime) {
          await ethStore.refund(hashedSecret);
          update(hashedSecret, 4);
          return;
        }
        setTimeout(run, 90000);
        return;
      }
      console.log("\nCOMPLETING SWAP");
      const secret = await ethStore.getRedeemedSecret(hashedSecret);
      await tezStore.redeem(hashedSecret, secret);
      update(hashedSecret, 3);
    } catch (err) {
      console.error(hashedSecret, err);
      update(hashedSecret, 0);
      return;
    }
  });
};
const respondTezos = async (amount, ethStore, tezStore, req_swap, update) => {
  //create new swap response on ethereum
  try {
    const refundTime = req_swap.refundTimestamp - 3600;
    await ethStore.approveToken(parseInt(amount));
    await ethStore.initiateWait(
      req_swap.hashedSecret,
      refundTime,
      tezStore.account,
      amount.toString()
    );

    console.log("\nSWAP GENERATED | HASH: ", req_swap.hashedSecret);

    // watch swap response
    waitResponse(req_swap.hashedSecret, ethStore, tezStore, refundTime, update);
    return {
      type: "eth",
      hashedSecret: req_swap.hashedSecret,
      value: amount + " USDC",
      refundTime,
      state: 1,
    };
  } catch (err) {
    console.log("FAILED TO INITIATE SWAP", err);
  }
};

const waitResponse = (hashedSecret, ethStore, tezStore, refundTime, update) => {
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        await ethStore.refund(hashedSecret);
        update(hashedSecret, 4);
        return;
      }
      const swp = await tezStore.getSwap(hashedSecret);
      console.log("CHECKING FOR SWAP RESPONSE");
      if (swp.participant !== tezStore.account) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nA SWAP RESPONSE FOUND : \n", swp);
      await ethStore.addCounterParty(hashedSecret, swp.initiator_eth_addr);
      update(hashedSecret, 2);
      waitCompletion(hashedSecret, ethStore, tezStore, refundTime, update);
    } catch (err) {
      console.error(hashedSecret, err);
      update(hashedSecret, 0);
      return;
    }
  }, 0);
};

export default respondTezos;
