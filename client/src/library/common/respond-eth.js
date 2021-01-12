const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  setTimeout(async function run() {
    try {
      const swp = await tezStore.getSwap(hashedSecret);
      console.log("WAITING TO COMPLETE SWAP");
      if (swp !== undefined) {
        if (Math.trunc(Date.now() / 1000) >= refundTime) {
          await tezStore.refund(hashedSecret);
          update(hashedSecret, 4);
          return;
        }
        setTimeout(run, 90000);
        return;
      }
      console.log("\nCOMPLETING SWAP");
      const secret = await tezStore.getRedeemedSecret(hashedSecret);
      await ethStore.redeem(hashedSecret, secret);
      update(hashedSecret, 3);
    } catch (err) {
      console.error(hashedSecret, err);
      update(hashedSecret, 0);
      return;
    }
  }, 0);
};

const respondEth = async (amount, ethStore, tezStore, req_swap, update) => {
  //create new swap response on ethereum
  try {
    const refundTime = req_swap.refundTimestamp - 3600;
    await tezStore.approveToken(amount);
    await tezStore.initiateWait(
      req_swap.hashedSecret,
      refundTime,
      ethStore.account,
      amount + ""
    );

    console.log("\nSWAP GENERATED | HASH: ", req_swap.hashedSecret);

    // watch swap response
    waitResponse(req_swap.hashedSecret, ethStore, tezStore, refundTime, update);
    return {
      type: "tez",
      hashedSecret: req_swap.hashedSecret,
      value: amount + " USDTz",
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
        await tezStore.refund(hashedSecret);
        update(hashedSecret, 4);
        return;
      }
      const swp = await ethStore.getSwap(hashedSecret);
      console.log("CHECKING FOR SWAP RESPONSE");
      if (swp.participant !== ethStore.account) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nA SWAP RESPONSE FOUND : \n", swp);
      await tezStore.addCounterParty(hashedSecret, swp.initiator_tez_addr);
      update(hashedSecret, 2);
      waitCompletion(hashedSecret, ethStore, tezStore, refundTime, update);
    } catch (err) {
      console.error(hashedSecret, err);
      update(hashedSecret, 0);
      return;
    }
  }, 0);
};
export default respondEth;
