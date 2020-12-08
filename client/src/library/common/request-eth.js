import createSecrets from "./createSecrets";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await ethStore.refund(secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await tezStore.getSwap(secret.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.participant !== tezStore.account) return;
    clearInterval(tid);
    console.log("\nCOMPLETING SWAP");
    const res = await tezStore.redeem(secret.hashedSecret, secret.secret);
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
  const approveTokens = await ethStore.approveToken(parseInt(amount));
  if (!approveTokens) return undefined;

  const status = await ethStore.initiateWait(
    secret.hashedSecret,
    refundTime,
    tezStore.account,
    amount
  );
  if (!status) return undefined;

  console.log("\nSWAP Generated : ");
  const swap = await ethStore.getSwap(secret.hashedSecret);
  console.log(JSON.stringify(swap));

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await ethStore.refund(secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await tezStore.getSwap(secret.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp === undefined) return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await ethStore.addCounterParty(
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
