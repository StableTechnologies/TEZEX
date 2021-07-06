const Bot = require("./library/bot");
var readlineSync = require("readline-sync");
const {
  decryptUserConfig,
  encryptUserConfig,
} = require("./library/encryption");
const userConfig = require("./user-config.json");
const winston = require("winston");

const logger = winston.createLogger({
  level: "warn",
  format: winston.format.json(),
  defaultMeta: { service: "tezex-bot" },
  transports: [
    new winston.transports.File({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      filename: `logs/bot-${new Date().getTime()}.log`,
      timestamp: true,
    }),
  ],
});

const init = () => {
  let config = {};
  try {
    if (userConfig["iv"] !== undefined && userConfig["content"] !== undefined) {
      console.log("[!] Encrypted User Config Found!");
      const password = readlineSync.question(
        "[?] Please enter your password to start the bot: ",
        {
          hideEchoBack: true,
        }
      );
      config = decryptUserConfig("./user-config.json", password);
    } else {
      console.log(
        "[x] Encrypted User Config Not Found! \n\nPlease make sure you have created the `user-config.json` file with the required details as mentioned in the documentation"
      );
      const password = readlineSync.question(
        "\n[?] Please enter your password to encrypt the `user-config.json`: ",
        {
          hideEchoBack: true,
        }
      );
      const passwordCheck = readlineSync.question("Re-enter password: ", {
        hideEchoBack: true,
      });
      if (password != passwordCheck) {
        console.log("\n[x] Passwords entered do not match, please try again!");
        return;
      }
      const answer = readlineSync.question(
        "\n[!] The user-config.json file is now going to be encrypted, make sure all required details are present. Continue? (y/n):  "
      );
      if (answer.toLowerCase() !== "y") {
        console.log("[x] Exiting");
        return;
      }
      config = encryptUserConfig("./user-config.json", password);
    }
  } catch (error) {
    console.log(`\nError while encrypting/decrypting config! Try Again`);
    logger.error("error while encrypting/decrypting config", error);
    return;
  }
  const bot = new Bot(logger);
  bot
    .init(config.ethereum, config.tezos)
    .then(() => {
      bot.start();
    })
    .catch(console.log);
};


init();
