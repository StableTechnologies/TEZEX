const readlineSync = require("readline-sync");
const winston = require("winston");
const Bot = require("./library/bot");
const {
  decryptUserConfig,
  encryptUserConfig,
} = require("./library/encryption");
const userConfig = require("./user-config.json");

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
    if (userConfig.iv !== undefined && userConfig.content !== undefined) {
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
    console.log("\nError while encrypting/decrypting config! Try Again");
    logger.error("error while encrypting/decrypting config", error);
    return;
  }
  const bot = new Bot(logger);
  bot
    .init(config.tezos, config.maxVolume)
    .then((data) => {
      showDetails(data);
      validateBalance(data, config);
      bot.start();
    })
    .catch(console.log);
};

const validateBalance = ({
  balanceRequirements: balances,
  networkFees: fees,
}) => {
  try {
    const assets = Object.keys(balances);
    for (const asset of assets) {
      if (balances[asset].balance.lt(balances[asset].need)) {
        throw new Error(
          `Not enough ${balances[asset].symbol} balance ${balances[
            asset
          ].balance
            .div(10 ** balances[asset].decimals)
            .toString()} ${balances[asset].symbol} < ${balances[asset].need
              .div(10 ** balances[asset].decimals)
              .toString()} ${balances[asset].symbol}\n`
        );
      }
    }
    let question = "Are the above details correct? (y/n): ";
    if (balances.xtz.balance.minus(balances.xtz.need).lt(fees.xtz)) {
      logger.warn("balance less than fees", {
        xtz: { need: balances.xtz.need, fees: fees.xtz },
      });
      question = `\n[x] Estimated amount of balance required for fees excluding trade volume :\n   [*] Tezos : ${fees.xtz.div(
        10 ** balances.xtz.decimals
      )} xtz\n\n[!] If your balance drops below the tx fees at any point your bot will fail to operate.\n[*] These balances are estimated values with a considerable safety margins\n\nDo you want to continue with current settings? (y/n)`;
    }
    const answer = readlineSync.question(question);

    if (answer.toLowerCase() !== "y") {
      throw new Error("[x] Exiting..\n");
    }
  } catch (err) {
    logger.error("balance validation failed", err);
    throw err;
  }
};

const showDetails = ({ tezosAccount, balanceRequirements: balances }) => {
  let tezAssets = "";
  let tezVolumes = "";
  const assets = Object.keys(balances);
  for (const asset of assets) {
    tezAssets += `  -- ${balances[asset].symbol} : ${balances[asset].balance
      .div(10 ** balances[asset].decimals)
      .toString()} ${asset}\n`;
    tezVolumes += `  -- ${balances[asset].symbol} : ${balances[asset].need
      .div(10 ** balances[asset].decimals)
      .toString()} ${asset}\n`;
  }
  console.log(
    `\nPlease Confirm Details:\n\n- Tezos Details:\n--- Account: ${tezosAccount}\n--- Asset Balance: \n${tezAssets}--- Bot trade Volume: \n${tezVolumes}\n`
  );
};

init();
