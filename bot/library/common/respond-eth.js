const waitCompletion = async (new_swap, ethStore, tezStore, bot) => {
  try {
    const swp = await tezStore.getSwap(new_swap.hashedSecret);
    console.log("WAITING TO COMPLETE SWAP");
    if (swp !== undefined) {
      if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
        await tezStore.refund(new_swap.hashedSecret);
        new_swap.state = 3;
        await bot.updateSwap(1, new_swap);
        return 3;
      }
      return 2;
    }
    console.log("\nCOMPLETING SWAP");
    const secret = await tezStore.getRedeemedSecret(new_swap.hashedSecret);
    await ethStore.redeem(new_swap.hashedSecret, secret);
    new_swap.state = 0;
    await bot.updateSwap(1, new_swap);
    return 0;
  } catch (err) {
    console.error(err);
    new_swap.state = 4;
    await bot.updateSwap(1, new_swap);
    return 4;
  }
};

/**
 * Respond to a tezos swap
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
        // initiate response swap
        try {
          console.log("RESPONDING TO USDC: ", new_swap.hashedSecret);
          //create new swap response on ethereum
          // const approve = await tezStore.approveToken(amount);
          // if (!approve) return undefined;
          await tezStore.initiateWait(
            new_swap.hashedSecret,
            new_swap.refundTime,
            ethStore.account,
            new_swap.value.toString()
          );
          new_swap.state = 1;
          await bot.updateSwap(1, new_swap);
          state = 1;
          console.log("\nSWAP GENERATED | HASH: ", new_swap.hashedSecret);
        } catch (err) {
          console.error("FAILED TO RESPOND TO USDC: ", new_swap.hashedSecret);
          new_swap.state = 3;
          await bot.updateSwap(1, new_swap);
          return;
        }
        break;
      }
      case 1: {
        // watch for response from counter-party
        state = await waitResponse(new_swap, ethStore, tezStore, bot);
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
      case 2: {
        // wait for counter-party to redeem, get secret and redeem assets
        state = await waitCompletion(new_swap, ethStore, tezStore, bot);
        if (state === 4 || state === 3 || state == 0) return;
        break;
      }
    }
    setTimeout(run, 90000);
  }, 0);
};

const waitResponse = async (new_swap, ethStore, tezStore, bot) => {
  try {
    if (Math.trunc(Date.now() / 1000) >= new_swap.refundTime) {
      await tezStore.refund(new_swap.hashedSecret);
      new_swap.state = 3;
      await bot.updateSwap(1, new_swap);
      return 3;
    }
    const swp = await ethStore.getSwap(new_swap.hashedSecret);
    console.log("CHECKING FOR SWAP RESPONSE");
    if (swp.participant !== ethStore.account) return 1;
    console.log("\nA SWAP RESPONSE FOUND : \n", swp);
    await tezStore.addCounterParty(
      new_swap.hashedSecret,
      swp.initiator_tez_addr
    );
    new_swap.state = 2;
    await bot.updateSwap(1, new_swap);
    return 2;
  } catch (err) {
    console.error("FAILED TO RESPOND TO USDC: ", new_swap.hashedSecret, err);
    new_swap.state = 4;
    await bot.updateSwap(1, new_swap);
    return 4;
  }
};
