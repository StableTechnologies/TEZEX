import createSecrets from "./createSecrets";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await tezStore.refund(secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await ethStore.getSwap(secret.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.participant !== ethStore.account) return;
    clearInterval(tid);
    console.log("\nCOMPLETING SWAP");
    const res = await ethStore.redeem(secret.hashedSecret, secret.secret);
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
  const approve = await tezStore.approveToken(amount);
  if (!approve) return undefined;
  const status = await tezStore.initiateWait(
    secret.hashedSecret,
    refundTime,
    ethStore.account,
    amount + ""
  );

  if (!status) return undefined;

  console.log("\nSWAP Generated : ");
  const swap = await tezStore.getSwap(secret.hashedSecret);
  console.log(JSON.stringify(swap));

  // watch swap response
  const tid = setInterval(async () => {
    if (Math.trunc(Date.now() / 1000) >= refundTime) {
      clearInterval(tid);
      const res = await tezStore.refund(secret.hashedSecret);
      if (!res) {
        update(secret.hashedSecret, 0);
        return;
      }
      update(secret.hashedSecret, 4);
      return;
    }
    const swp = await ethStore.getSwap(secret.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.initiator_tez === "" && swp.refundTimestamp === "0") return;
    clearInterval(tid);
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const res = await tezStore.addCounterParty(
      secret.hashedSecret,
      swp.initiator_tez
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
