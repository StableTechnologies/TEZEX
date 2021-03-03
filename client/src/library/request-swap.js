import { BigNumber } from "bignumber.js";
import config from "./globalConfig.json";
import { createSecrets, getCounterPair } from "./util";

const waitCompletion = (
  secret,
  swap,
  clients,
  swapPairs,
  update,
  counterNetwork,
  counterAsset
) => {
  const network = swapPairs[swap.pair][swap.asset].network;
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= swap.refundTime) {
        await clients[network].refund(
          swapPairs[swap.pair][swap.asset].swapContract,
          secret.hashedSecret
        );
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await clients[counterNetwork].getSwap(
        swapPairs[swap.pair][counterAsset].swapContract,
        secret.hashedSecret
      );
      console.log("WAITING TO COMPLETE SWAP");
      if (swp.participant !== clients[counterNetwork].account) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nCOMPLETING SWAP");
      await clients[counterNetwork].redeem(
        swapPairs[swap.pair][counterAsset].swapContract,
        secret.hashedSecret,
        secret.secret
      );
      update(secret.hashedSecret, 3);
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

/**
 * Creates and completes a swap request for any asset and swap pair combo
 *
 * @param swap swap object to be created
 * @param clients ethereum and tezos network client
 * @param swapPairs data of all the swap pairs
 * @param update update callback to reflect state change in UI
 */
const requestSwap = async (swap, clients, swapPairs, update) => {
  const network = swapPairs[swap.pair][swap.asset].network;
  const counterNetwork = network === "ethereum" ? "tezos" : "ethereum";
  const counterAsset = getCounterPair(swap.pair, swap.asset);
  // generate swap secret
  console.log(swapPairs[swap.pair][swap.asset]);
  try {
    const secret = createSecrets();
    console.log(
      `Your SWAP Secret (${swapPairs[swap.pair][swap.asset].symbol}->${
        swapPairs[swap.pair][counterAsset].symbol
      }): ${JSON.stringify(secret)}`
    );

    // create new swap with refund time set to 2hrs
    const refundTime =
      Math.trunc(Date.now() / 1000) + config.swapConstants.refundPeriod;
    if (swap.asset !== "eth" && swap.asset !== "xtz") {
      await clients[network].approveToken(
        swapPairs[swap.pair][swap.asset].tokenContract,
        swapPairs[swap.pair][swap.asset].swapContract,
        swap.value
      );
      await clients[network].tokenInitiateWait(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret,
        refundTime,
        clients[counterNetwork].account,
        swap.value
      );
    } else {
      await clients[network].initiateWait(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret,
        refundTime,
        clients[counterNetwork].account,
        swap.value
      );
    }

    console.log("\nSWAP Generated : ");
    const checkSwap = await clients[network].getSwap(
      swapPairs[swap.pair][swap.asset].swapContract,
      secret.hashedSecret
    );
    console.log(JSON.stringify(checkSwap));
    swap = {
      ...swap,
      hashedSecret: secret.hashedSecret,
      exact: "nil",
      refundTime,
      state: 1,
    };
    waitResponse(
      secret,
      swap,
      clients,
      swapPairs,
      update,
      counterNetwork,
      counterAsset
    );
    return swap;
  } catch (err) {
    console.log("FAILED TO INITIATE SWAP", err);
  }
};

const waitResponse = (
  secret,
  swap,
  clients,
  swapPairs,
  update,
  counterNetwork,
  counterAsset
) => {
  const network = swapPairs[swap.pair][swap.asset].network;
  setTimeout(async function run() {
    try {
      if (Math.trunc(Date.now() / 1000) >= swap.refundTime) {
        await clients[network].refund(
          swapPairs[swap.pair][swap.asset].swapContract,
          secret.hashedSecret
        );
        update(secret.hashedSecret, 4);
        return;
      }
      const swp = await clients[counterNetwork].getSwap(
        swapPairs[swap.pair][counterAsset].swapContract,
        secret.hashedSecret
      );
      console.log("CHECKING FOR SWAP RESPONSE");
      if (
        (counterNetwork === "ethereum" &&
          swp.initiator_tez_addr === "" &&
          swp.refundTimestamp === "0") ||
        (counterNetwork === "tezos" && swp === undefined)
      ) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nA SWAP RESPONSE FOUND : \n", swp);
      if (new BigNumber(swp.value).lt(swap.minValue)) {
        console.log("swap response doesn't match min amount");
        setTimeout(run, 90000);
        return;
      }
      const addressKey = `initiator_${network.substring(0, 3)}_addr`;
      await clients[network].addCounterParty(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret,
        swp[addressKey]
      );
      update(
        secret.hashedSecret,
        2,
        new BigNumber(swp.value)
          .div(10 ** swapPairs[swap.pair][counterAsset].decimals)
          .toString() +
          " " +
          swapPairs[swap.pair][counterAsset].symbol
      );
      waitCompletion(
        secret,
        swap,
        clients,
        swapPairs,
        update,
        counterNetwork,
        counterAsset
      );
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

export default requestSwap;
