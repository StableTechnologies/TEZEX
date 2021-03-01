const waitCompletion = async (new_swap, counterNetwork, counterAsset, bot) => {
  try {
    const swp = await bot.clients[new_swap.network].getSwap(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret
    );
    console.log(
      `WAITING TO COMPLETE ${
        bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    if (
      (new_swap.network === "ethereum" &&
        swp.initiator_tez_addr !== "" &&
        swp.refundTimestamp !== "0") ||
      (new_swap.network === "tezos" && swp !== undefined)
    ) {
      if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
        console.log(
          `REFUNDING ${
            bot.swapPairs[new_swap.pair][new_swap.asset].symbol
          } SWAP : ${new_swap.hashedSecret}\n`
        );
        try {
          await bot.clients[new_swap.network].refund(
            bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
            new_swap.hashedSecret
          );
          new_swap.state = 3;
          await bot.updateSwap(new_swap);
          return 3;
        } catch (err) {
          console.error(
            `FAILED TO REFUND ${
              bot.swapPairs[new_swap.pair][counterAsset].symbol
            } SWAP : ${new_swap.hashedSecret}\n` + err
          );
          new_swap.state = 4;
          await bot.updateSwap(new_swap);
          return 4;
        }
      }
      return 2;
    }
    console.log(
      `\nCOMPLETING ${
        bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    const secret = await bot.clients[new_swap.network].getRedeemedSecret(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret
    );
    await bot.clients[counterNetwork].redeem(
      bot.swapPairs[new_swap.pair][counterAsset].swapContract,
      new_swap.hashedSecret,
      secret
    );
    new_swap.state = 0;
    await bot.updateSwap(new_swap);
    console.log(
      `\nCOMPLETED ${
        bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    return 0;
  } catch (err) {
    console.error(
      `FAILED TO REDEEM ${
        bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n` + err
    );
    return 2; // keep retrying to redeem
  }
};

/**
 * Respond to a swap
 *
 * @param new_swap swap details used to create a new response swap
 * @param counterNetwork network name for the counter pair eg. `ethereum` or `tezos`
 * @param counterAsset name of the counter asset eg. `usdc`
 * @param bot Bot instance
 * @param state current state of the swap
 */
module.exports = async (new_swap, counterNetwork, counterAsset, bot, state) => {
  setTimeout(async function run() {
    switch (state) {
      case 0: {
        try {
          console.log(
            `RESPONDING TO ${
              bot.swapPairs[new_swap.pair][counterAsset].symbol
            }: ${new_swap.hashedSecret}`
          );
          // const approveTokens = await ethStore.approveToken(parseInt(amount));
          // if (!approveTokens) return undefined;
          if (new_swap.asset !== "eth" && new_swap.asset !== "xtz")
            await bot.clients[new_swap.network].tokenInitiateWait(
              bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
              new_swap.hashedSecret,
              new_swap.refundTime,
              bot.clients[counterNetwork].account,
              new_swap.value.toString()
            );
          else
            await bot.clients[new_swap.network].initiateWait(
              bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
              new_swap.hashedSecret,
              new_swap.refundTime,
              bot.clients[counterNetwork].account,
              new_swap.value.toString()
            );
          new_swap.state = 1;
          await bot.updateSwap(new_swap);
          state = 1;
          console.log(
            `\nSWAP GENERATED ${
              bot.swapPairs[new_swap.pair][new_swap.asset].symbol
            }| HASH: ${new_swap.hashedSecret}`
          );
        } catch (err) {
          console.error(
            `FAILED TO INITIATE ${
              bot.swapPairs[new_swap.pair][new_swap.asset].symbol
            } SWAP : ${new_swap.hashedSecret}\n` + err
          );
          new_swap.state = 3;
          await bot.updateSwap(new_swap);
          return;
        }
        break;
      }
      case 1: {
        state = await waitResponse(new_swap, counterNetwork, counterAsset, bot);
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
      case 2: {
        state = await waitCompletion(
          new_swap,
          counterNetwork,
          counterAsset,
          bot
        );
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
    }
    setTimeout(run, 90000);
    // watch swap response
  }, 0);
  // watch swap response
};

const waitResponse = async (new_swap, counterNetwork, counterAsset, bot) => {
  try {
    if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
      console.log(
        `REFUNDING ${
          bot.swapPairs[new_swap.pair][new_swap.asset].symbol
        } SWAP : ${new_swap.hashedSecret}\n`
      );
      await bot.clients[new_swap.network].refund(
        bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
        new_swap.hashedSecret
      );
      new_swap.state = 3;
      await bot.updateSwap(new_swap);
      return 3;
    }
    const swp = await bot.clients[counterNetwork].getSwap(
      bot.swapPairs[new_swap.pair][counterAsset].swapContract,
      new_swap.hashedSecret
    );
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== bot.clients[counterNetwork].account) return 1;
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    const addressKey = `initiator_${new_swap.network.substring(0, 3)}_addr`;
    await bot.clients[new_swap.network].addCounterParty(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret,
      swp[addressKey]
    );
    new_swap.state = 2;
    await bot.updateSwap(new_swap);
    return 2;
  } catch (err) {
    console.error(
      `FAILED TO ADD COUNTER-PARTY TO ${
        bot.swapPairs[new_swap.pair][new_swap.asset].symbol
      } SWAP : ${new_swap.hashedSecret}\n` + err
    );
    new_swap.state = 4;
    await bot.updateSwap(new_swap);
    return 4;
  }
};
