const Bot = require("./library/bot");
const config = require("./user-config.json");

const bot = new Bot();
bot
  .init(config.ethereum, config.tezos, config.maxVolume)
  .then(() => bot.start());
