const { STATE } = require("./util");

const waitCompletion = async (new_swap, counterNetwork, counterAsset, bot) => {
  try {
    const swp = await bot.clients[new_swap.network].getSwap(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret
    );
    // check if the counter swap has already been refunded or redeemed
    const swpCounter = await bot.clients[counterNetwork].getSwap(
      bot.swapPairs[new_swap.pair][counterAsset].swapContract,
      new_swap.hashedSecret
    );
    if (
      (counterNetwork === "ethereum" &&
        swpCounter.initiator_tez_addr === "" &&
        swpCounter.refundTimestamp === "0") ||
      (counterNetwork === "tezos" && swpCounter === undefined)
    ) {
      console.log(
        `COUNTER SWAP IS ALREADY REDEEMED OR REFUNDED ${bot.swapPairs[new_swap.pair][counterAsset].symbol
        } SWAP : ${new_swap.hashedSecret}\n`
      );
      bot.logger.warn("counter swap already redeemed or refunded", { swap: new_swap });
      new_swap.state = STATE.DONE;
      await bot.updateSwap(new_swap);
      return STATE.DONE;
    }
    // else try to redeem it
    console.log(
      `WAITING TO COMPLETE ${bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    bot.logger.warn("swap redeem check", { swap: new_swap });
    if (
      (new_swap.network === "ethereum" &&
        swp.initiator_tez_addr !== "" &&
        swp.refundTimestamp !== "0") ||
      (new_swap.network === "tezos" && swp !== undefined)
    ) {
      if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
        console.log(
          `REFUNDING ${bot.swapPairs[new_swap.pair][new_swap.asset].symbol
          } SWAP : ${new_swap.hashedSecret}\n`
        );
        bot.logger.warn("refunding swap", { swap: new_swap });
        try {
          await bot.clients[new_swap.network].refund(
            bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
            new_swap.hashedSecret
          );
          new_swap.state = STATE.REFUNDED;
          await bot.updateSwap(new_swap);
          return STATE.REFUNDED;
        } catch (err) {
          console.error(
            `FAILED TO REFUND ${bot.swapPairs[new_swap.pair][counterAsset].symbol
            } SWAP : ${new_swap.hashedSecret}\n` + err
          );
          bot.logger.error(
            `swap redeem : refund step error : ${new_swap.hashedSecret}`,
            err
          );
          new_swap.state = STATE.ERROR;
          await bot.updateSwap(new_swap);
          return STATE.ERROR;
        }
      }
      return STATE.RESPONSE_FOUND;
    }
    console.log(
      `\nCOMPLETING ${bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    bot.logger.warn("redeeming swap", { swap: new_swap });
    const secret = await bot.clients[new_swap.network].getRedeemedSecret(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret
    );
    if (secret === undefined) {
      console.error(
        `FAILED TO REDEEM ${bot.swapPairs[new_swap.pair][counterAsset].symbol
        } SWAP : ${new_swap.hashedSecret} | No secret found`
      );
      bot.logger.error(`swap redeem check error, no secret found: ${new_swap.hashedSecret}`);
      return STATE.RESPONSE_FOUND; // keep retrying to redeem
    }
    await bot.clients[counterNetwork].redeem(
      bot.swapPairs[new_swap.pair][counterAsset].swapContract,
      new_swap.hashedSecret,
      secret
    );
    new_swap.state = STATE.DONE;
    await bot.updateSwap(new_swap);
    console.log(
      `\nCOMPLETED ${bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n`
    );
    bot.logger.warn("redeemed swap", { swap: new_swap });
    return STATE.DONE;
  } catch (err) {
    console.error(
      `FAILED TO REDEEM ${bot.swapPairs[new_swap.pair][counterAsset].symbol
      } SWAP : ${new_swap.hashedSecret}\n` + err
    );
    bot.logger.error(`swap redeem check error: ${new_swap.hashedSecret}`, err);
    return STATE.RESPONSE_FOUND; // keep retrying to redeem
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
      case STATE.START: {
        try {
          console.log(
            `RESPONDING TO ${bot.swapPairs[new_swap.pair][counterAsset].symbol
            }: ${new_swap.hashedSecret}`
          );
          bot.logger.warn("responding to swap", { swap: new_swap });
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
          new_swap.state = STATE.INITIATED;
          await bot.updateSwap(new_swap);
          state = STATE.INITIATED;
          console.log(
            `\nSWAP GENERATED ${bot.swapPairs[new_swap.pair][new_swap.asset].symbol
            }| HASH: ${new_swap.hashedSecret}`
          );
          bot.logger.warn("swap generated", { swap: new_swap });
        } catch (err) {
          console.error(
            `FAILED TO INITIATE ${bot.swapPairs[new_swap.pair][new_swap.asset].symbol
            } SWAP : ${new_swap.hashedSecret}\n` + err
          );
          bot.logger.error(
            `swap initiation failed : ${new_swap.hashedSecret}`,
            err
          );
          new_swap.state = STATE.REFUNDED;
          await bot.updateSwap(new_swap);
          return;
        }
        break;
      }
      case STATE.INITIATED: {
        state = await waitResponse(new_swap, counterNetwork, counterAsset, bot);
        if (
          state === STATE.ERROR ||
          state === STATE.REFUNDED ||
          state == STATE.DONE
        )
          return;
        break;
      }
      case STATE.RESPONSE_FOUND: {
        state = await waitCompletion(
          new_swap,
          counterNetwork,
          counterAsset,
          bot
        );
        if (
          state === STATE.ERROR ||
          state === STATE.REFUNDED ||
          state == STATE.DONE
        )
          return;
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
        `REFUNDING ${bot.swapPairs[new_swap.pair][new_swap.asset].symbol
        } SWAP : ${new_swap.hashedSecret}\n`
      );
      bot.logger.warn("refunding swap", { swap: new_swap });
      await bot.clients[new_swap.network].refund(
        bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
        new_swap.hashedSecret
      );
      new_swap.state = STATE.REFUNDED;
      await bot.updateSwap(new_swap);
      return STATE.REFUNDED;
    }
    const swp = await bot.clients[counterNetwork].getSwap(
      bot.swapPairs[new_swap.pair][counterAsset].swapContract,
      new_swap.hashedSecret
    );
    console.log("CHECKING FOR SWAP RESPONSE");
    bot.logger.warn("swap response check", { swap: new_swap });
    if (swp.participant !== bot.clients[counterNetwork].account)
      return STATE.INITIATED;

    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    bot.logger.warn("swap response found", { swap: new_swap });
    const addressKey = `initiator_${new_swap.network.substring(0, 3)}_addr`;
    await bot.clients[new_swap.network].addCounterParty(
      bot.swapPairs[new_swap.pair][new_swap.asset].swapContract,
      new_swap.hashedSecret,
      swp[addressKey]
    );
    new_swap.state = STATE.RESPONSE_FOUND;
    await bot.updateSwap(new_swap);
    return STATE.RESPONSE_FOUND;
  } catch (err) {
    console.error(
      `FAILED TO ADD COUNTER-PARTY TO ${bot.swapPairs[new_swap.pair][new_swap.asset].symbol
      } SWAP : ${new_swap.hashedSecret}\n` + err
    );
    bot.logger.error(
      `swap response check error : ${new_swap.hashedSecret}`,
      err
    );
    new_swap.state = STATE.ERROR;
    await bot.updateSwap(new_swap);
    return STATE.ERROR;
  }
};
