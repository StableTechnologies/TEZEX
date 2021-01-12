// const Web3 = require("web3");
// const USDC = require("./library/usdc");
const Bot = require("./library/bot");
// const config = require("./library/network-config.json");
const config = require("./user-config.json");

const bot = new Bot();
bot
  .init(config.ethereum, config.tezos, config.maxVolume)
  .then(() => bot.usdc.tokenAllowance(bot.usdc.account))
  .then(console.log)
  // .then(() =>
  //   bot.usdc.initiateWait(
  //     "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
  //     1607798683,
  //     "dsfsdf",
  //     2
  //   )
  // )
  .then(() => bot.start());
