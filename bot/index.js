const Bot = require("./library/bot");
var readlineSync = require("readline-sync");
const {
  decryptUserConfig,
  encryptUserConfig,
} = require("./library/encryption");
const userConfig = require("./user-config.json");
const { constants } = require("./library/common/util");

const init = () => {
  let config = {};
  try {
    if (userConfig["iv"] !== undefined && userConfig["content"] !== undefined) {
      console.log("Encrypted User Config Found!");
      const password = readlineSync.question(
        "Please enter your password to start the bot: ",
        {
          hideEchoBack: true,
        }
      );
      config = decryptUserConfig("./user-config.json", password);
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
  } catch (error) {
    console.log(`\nError while encrypting/decrypting config! Try Again`);
    return;
  }
  const bot = new Bot();
  config.maxVolume = {
    usdc: Math.floor(config.maxVolume.usdc * constants.decimals10_6),
    usdtz: Math.floor(config.maxVolume.usdtz * constants.decimals10_6),
  };
  bot
    .init(config.ethereum, config.tezos, config.maxVolume)
    .then((data) => {
      console.log(
        `\nPlease Confirm Details:\n\n- Etherum Details:\n--- Account: ${
          data.eth.account
        }\n--- Eth Balance: ${data.eth.balance} eth\n--- USDC Balance: ${
          data.eth.usdc
        } usdc\n--- Bot trade Volume: ${
          config.maxVolume.usdc / constants.decimals10_6
        } usdc\n\n- Tezos Details:\n--- Account: ${
          data.tez.account
        }\n--- Tez Balance: ${data.tez.balance} xtz\n--- USDTz Balance: ${
          data.tez.usdtz
        } usdtz\n--- Bot trade Volume: ${
          config.maxVolume.usdtz / constants.decimals10_6
        } usdtz\n`
      );
      const answer = readlineSync.question(
        "Are the above details correct? (y/n): "
      );
      if (answer.toLowerCase() !== "y") {
        throw new Error("[x] Exiting..");
      }
      bot.start();
    })
    .catch(console.log);
};

init();
