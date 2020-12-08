const waitCompletion = (
  hashedSecret,
  ethStore,
  tezStore,
  refundTime,
  update
) => {
  const id = setInterval(async () => {
    const swp = await ethStore.getSwap(hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.initiator_tez !== "" && swp.refundTimestamp !== "0") {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        clearInterval(id);
        const res = await ethStore.refund(hashedSecret);
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
    const secret = await ethStore.getRedeemedSecret(hashedSecret);
    const res = await tezStore.redeem(hashedSecret, secret);
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
  const approveTokens = await ethStore.approveToken(parseInt(amount));
  if (!approveTokens) return undefined;
  const status = await ethStore.initiateWait(
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
      const res = await ethStore.refund(req_swap.hashedSecret);
      if (!res) {
        update(req_swap.hashedSecret, 0);
        return;
      }
      update(req_swap.hashedSecret, 4);
      return;
    }
    const swp = await tezStore.getSwap(req_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== tezStore.account) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await ethStore.addCounterParty(
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
