import createSecrets from "./createSecrets";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        await ethStore.refund(secret.hashedSecret);
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await tezStore.getSwap(secret.hashedSecret);
      console.log("WAITING TO COMPLETE SWAP");
      if (swp.participant !== tezStore.account) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nCOMPLETING SWAP");
      await tezStore.redeem(secret.hashedSecret, secret.secret);
      update(secret.hashedSecret, 3);
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

const requestEth = async (amount, minAmt, ethStore, tezStore, update) => {
  // generate swap secret
  try {
    const secret = createSecrets();
    console.log("Your SWAP Secret (USDC->USDTz): ", secret);

    // create new swap with refund time set to 2hrs
    const refundTime = Math.trunc(Date.now() / 1000) + 7200;
    await ethStore.approveToken(parseInt(amount));

    await ethStore.initiateWait(
      secret.hashedSecret,
      refundTime,
      tezStore.account,
      amount
    );

    console.log("\nSWAP Generated : ");
    const swap = await ethStore.getSwap(secret.hashedSecret);
    console.log(JSON.stringify(swap));
    waitResponse(secret, minAmt, tezStore, ethStore, refundTime, update);
    return {
      type: "eth",
      hashedSecret: secret.hashedSecret,
      value: amount + " USDC",
      refundTime,
      state: 1,
    };
  } catch (err) {
    console.log("FAILED TO INITIATE SWAP", err);
  }
};

const waitResponse = (
  secret,
  minAmt,
  tezStore,
  ethStore,
  refundTime,
  update
) => {
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        await ethStore.refund(secret.hashedSecret);
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await tezStore.getSwap(secret.hashedSecret);
      console.log("CHECKING FOR SWAP RESPONSE");
      if (swp === undefined) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nA SWAP RESPONSE FOUND : \n", swp);
      if (swp.value < minAmt) {
        console.log("swap response doesn't match min amount");
        setTimeout(run, 90000);
        return;
      }
      await ethStore.addCounterParty(
        secret.hashedSecret,
        swp.initiator_eth_addr
      );
      update(secret.hashedSecret, 2);
      waitCompletion(secret, tezStore, ethStore, refundTime, update);
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

export default requestEth;
