import { createSecrets } from "./util";

const waitCompletion = (secret, tezStore, ethStore, refundTime, update) => {
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= refundTime) {
        await tezStore.refund(secret.hashedSecret);
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await ethStore.getSwap(secret.hashedSecret);
      console.log("WAITING TO COMPLETE SWAP");
      if (swp.participant !== ethStore.account) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nCOMPLETING SWAP");
      await ethStore.redeem(secret.hashedSecret, secret.secret);
      update(secret.hashedSecret, 3);
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

const requestTezos = async (amount, minAmt, ethStore, tezStore, update) => {
  // generate swap secret
  try {
    const secret = createSecrets();
    console.log("Your SWAP Secret (XTZ->ETH): ", secret);

    // create new swap with refund time set to 2hrs
    const refundTime = Math.trunc(Date.now() / 1000) + 7200;
    await tezStore.approveToken(amount);
    await tezStore.initiateWait(
      secret.hashedSecret,
      refundTime,
      ethStore.account,
      amount + ""
    );

    console.log("\nSWAP Generated : ");
    const swap = await tezStore.getSwap(secret.hashedSecret);
    console.log(JSON.stringify(swap));

    // watch swap response

    waitResponse(secret, minAmt, tezStore, ethStore, refundTime, update);
    return {
      type: "tez",
      hashedSecret: secret.hashedSecret,
      value: amount + " USDTz",
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
        await tezStore.refund(secret.hashedSecret);
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await ethStore.getSwap(secret.hashedSecret);
      console.log("CHECKING FOR SWAP RESPONSE");
      if (swp.initiator_tez_addr === "" && swp.refundTimestamp === "0") {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nA SWAP RESPONSE FOUND : \n", swp);
      if (swp.value < minAmt) {
        console.log("swap response doesn't match min amount");
        setTimeout(run, 90000);
        return;
      }

      await tezStore.addCounterParty(
        secret.hashedSecret,
        swp.initiator_tez_addr
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
export default requestTezos;
