import { createSecrets, getCounterPair } from "./util";

const config = require(`./${process.env.REACT_APP_ENV || "prod"
  }-network-config.json`);

/**
 * Creates and completes a swap request for any asset and swap pair combo
 *
 * @param swap swap object to be created
 * @param clients ethereum and tezos network client
 * @param swapPairs data of all the swap pairs
 * @param update update callback to reflect state change in UI
 */
const requestPureSwap = async (swap, secret, clients, swapPairs, update) => {
  const network = swapPairs[swap.pair][swap.asset].network;
  const counterAsset = getCounterPair(swap.pair, swap.asset);
  // generate swap secret
  try {
    console.log(
      `Your SWAP Secret (${swapPairs[swap.pair][swap.asset].symbol}->${swapPairs[swap.pair][counterAsset].symbol
      }): ${JSON.stringify(secret)}`
    );

    if (swap.asset !== "eth" && swap.asset !== "xtz") {
      await clients[network].approveToken(
        swapPairs[swap.pair][swap.asset].tokenContract,
        swapPairs[swap.pair][swap.asset].swapContract,
        swap.value
      );
      await clients[network].offer(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret,
        swap.pair,
        swap.asset,
        swap.refundTime,
        swap.value,
        swap.minValue
      );
    } else {
      await clients[network].offer(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret,
        swap.pair,
        swap.asset,
        swap.refundTime,
        swap.value,
        swap.minValue,
        swap.value,
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
      state: 1,
    };
    waitResponse(
      secret,
      swap,
      clients,
      swapPairs,
      update
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
  update
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
      const swp = await clients[network].getSwap(
        swapPairs[swap.pair][swap.asset].swapContract,
        secret.hashedSecret
      );
      console.log("CHECKING FOR SWAP RESPONSE");
      if (
        swp !== undefined
      ) {
        setTimeout(run, 90000);
        return;
      }
      console.log("\nSWAP COMPLETED! ", secret.hashedSecret);
      update(
        secret.hashedSecret,
        3
      );
    } catch (err) {
      console.error(secret.hashedSecret, err);
      update(secret.hashedSecret, 0);
      return;
    }
  }, 0);
};

export default requestPureSwap;
