const waitCompletion = async (new_swap, ethStore, tezStore, bot) => {
  try {
    const swp = await ethStore.getSwap(new_swap.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp.initiator_tez_addr !== "" && swp.refundTimestamp !== "0") {
      if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
        await ethStore.refund(new_swap.hashedSecret);
        new_swap.state = 3;
        await bot.updateSwap(2, new_swap);
        return 3;
      }
      return 2;
    }
    console.log("\nCOMPLETING SWAP");
    const secret = await ethStore.getRedeemedSecret(new_swap.hashedSecret);
    await tezStore.redeem(new_swap.hashedSecret, secret);
    new_swap.state = 0;
    await bot.updateSwap(2, new_swap);
    return 0;
  } catch (err) {
    console.error(err);
    new_swap.state = 4;
    await bot.updateSwap(2, new_swap);
    return 4;
  }
};

/**
 * Respond to a ethereum swap
 *
 * @param ethStore ERC20 or Ethereum object instance
 * @param tezStore FA12 or Tezos object instance
 * @param new_swap swap details used to create a new response swap
 * @param bot Bot instance
 * @param state current state of the swap
 */
module.exports = async (ethStore, tezStore, new_swap, bot, state) => {
  setTimeout(async function run() {
    switch (state) {
      case 0: {
        try {
          console.log("RESPONDING TO USDTz: ", new_swap.hashedSecret);
          // const approveTokens = await ethStore.approveToken(parseInt(amount));
          // if (!approveTokens) return undefined;
          await ethStore.initiateWait(
            new_swap.hashedSecret,
            new_swap.refundTime,
            tezStore.account,
            new_swap.value.toString()
          );
          new_swap.state = 1;
          await bot.updateSwap(2, new_swap);
          state = 1;
          console.log("\nSWAP GENERATED | HASH: ", new_swap.hashedSecret);
        } catch (err) {
          console.error("FAILED TO RESPOND TO USDTz: ", new_swap.hashedSecret);
          new_swap.state = 3;
          await bot.updateSwap(2, new_swap);
          return;
        }
        break;
      }
      case 1: {
        state = await waitResponse(new_swap, ethStore, tezStore, bot);
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
      case 2: {
        state = await waitCompletion(new_swap, ethStore, tezStore, bot);
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
    }
    setTimeout(run, 90000);
    // watch swap response
  }, 0);
  // watch swap response
};

const waitResponse = async (new_swap, ethStore, tezStore, bot) => {
  try {
    if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
      await ethStore.refund(new_swap.hashedSecret);
      new_swap.state = 3;
      await bot.updateSwap(2, new_swap);
      return 3;
    }
    const swp = await tezStore.getSwap(new_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== tezStore.account) return 1;
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    await ethStore.addCounterParty(
      new_swap.hashedSecret,
      swp.initiator_eth_addr
    );
    new_swap.state = 2;
    await bot.updateSwap(2, new_swap);
    return 2;
  } catch (err) {
    console.error("FAILED TO RESPOND TO USDTz: ", new_swap.hashedSecret, err);
    new_swap.state = 4;
    await bot.updateSwap(2, new_swap);
    return 4;
  }
};
