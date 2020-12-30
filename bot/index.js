const Bot = require("./library/bot");
var readlineSync = require("readline-sync");
const {
  decryptUserConfig,
  encryptUserConfig,
} = require("./library/encryption");
const userConfig = require("./user-config.json");

const init = () => {
  let config = {};
  if (userConfig["iv"] !== undefined && userConfig["content"] !== undefined) {
    console.log("Encrypted User Config Found!");
    const password = readlineSync.question(
      "Please enter your password to start the bot: ",
      {
        hideEchoBack: true,
      }
    );
    config = decryptUserConfig("./user-config.json", password);
    console.log(
      `\nPlease Confirm Details:\n - Eth Address: ${
        config.ethereum.walletAddress
      }\n - Tezos Address: ${
        config.tezos.walletAddress
      }\n - Trade Volume : ${JSON.stringify(config.maxVolume)}`
    );
    const answer = readlineSync.question(
      "Are the above details correct? (y/n): "
    );
    if (answer.toLowerCase() !== "y") {
      console.log("Exiting");
      return;
    }
  } else {
    console.log(
      "XX Encrypted User Config Not Found! \n\nPlease make sure you have created the `user-config.json` file with the required details as mentioned in the documentation"
    );
    const password = readlineSync.question(
      "\nPlease enter your password to encrypt the `user-config.json`: ",
      {
        hideEchoBack: true,
      }
    );
    const passwordCheck = readlineSync.question("Re-enter password: ", {
      hideEchoBack: true,
    });
    if (password != passwordCheck) {
      console.log("Passwords entered do not match, please try again!");
      return;
    }
    const answer = readlineSync.question(
      "\nThe user-config.json file is now going to be encrypted, make sure all required details are present. Continue? (y/n):  "
    );
    if (answer.toLowerCase() !== "y") {
      console.log("Exiting");
      return;
    }
    config = encryptUserConfig("./user-config.json", password);
  }
  const bot = new Bot();
  bot
    .init(config.ethereum, config.tezos, config.maxVolume)
    .then(() => bot.start());
};

init();
