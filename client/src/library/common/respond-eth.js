const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  const id = setInterval(async () => {
    const swp = await tezStore.getSwap(hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp !== undefined) {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        clearInterval(id);
        const res = await tezStore.refund(hashedSecret);
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
    const secret = await tezStore.getRedeemedSecret(hashedSecret);
    const res = await ethStore.redeem(hashedSecret, secret);
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
  const approve = await tezStore.approveToken(amount);
  if (!approve) return undefined;
  const status = await tezStore.initiateWait(
    req_swap.hashedSecret,
    refundTime,
    ethStore.account,
    amount + ""
  );

  if (!status) return undefined;

  console.log("\nSWAP GENERATED | HASH: ", req_swap.hashedSecret);

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await tezStore.refund(req_swap.hashedSecret);
      if (!res) {
        update(req_swap.hashedSecret, 0);
        return;
      }
      update(req_swap.hashedSecret, 4);
      return;
    }
    const swp = await ethStore.getSwap(req_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== ethStore.account) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await tezStore.addCounterParty(
      req_swap.hashedSecret,
      swp.initiator_tez
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
