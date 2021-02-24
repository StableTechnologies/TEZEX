const Bot = require("./library/bot");
var readlineSync = require("readline-sync");
const {
  decryptUserConfig,
  encryptUserConfig,
} = require("./library/encryption");
const userConfig = require("./user-config.json");
const { constants } = require("./library/common/util");
const { BigNumber } = require("bignumber.js");
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
        }\n--- Eth Balance: ${
          data.eth.balance
        } eth\n--- USDC Balance: ${new BigNumber(data.eth.usdc)
          .div(constants.decimals10_6)
          .toString()} usdc\n--- Bot trade Volume: ${new BigNumber(
          config.maxVolume.usdc
        )
          .div(constants.decimals10_6)
          .toString()} usdc\n\n- Tezos Details:\n--- Account: ${
          data.tez.account
        }\n--- Tez Balance: ${
          data.tez.balance
        } xtz\n--- USDtz Balance: ${new BigNumber(data.tez.usdtz)
          .div(constants.decimals10_6)
          .toString()} usdtz\n--- Bot trade Volume: ${new BigNumber(
          config.maxVolume.usdtz
        )
          .div(constants.decimals10_6)
          .toString()} usdtz\n`
      );
      validateBalance(data, config);
      bot.start();
    })
    .catch(console.log);
};

const validateBalance = (data, config) => {
  if (new BigNumber(data.eth.usdc).lt(config.maxVolume.usdc)) {
    throw new Error(
      `Not enough USDC balance ${data.eth.usdc}<${config.maxVolume.usdc}\n`
    );
  }
  if (new BigNumber(data.tez.usdtz).lt(config.maxVolume.usdtz)) {
    throw new Error(
      `Not enough USDtz balance ${data.tez.usdtz}<${config.maxVolume.usdtz}\n`
    );
  }
  const usdcSwapsCount = new BigNumber(config.maxVolume.usdc).div(
    constants.minUSDCVolume
  );
  const usdtzSwapsCount = new BigNumber(config.maxVolume.usdtz).div(
    constants.minUSDtzVolume
  );
  const minTezFee = new BigNumber(
    data.fee.usdtzFeeData["initiateWait"] +
      data.fee.usdtzFeeData["addCounterParty"]
  )
    .div(constants.decimals10_6)
    .multipliedBy(constants.usdtzFeePad)
    .multipliedBy(usdtzSwapsCount)
    .plus(
      new BigNumber(data.fee.usdtzFeeData["redeem"])
        .div(constants.decimals10_6)
        .multipliedBy(constants.usdcFeePad)
        .multipliedBy(usdcSwapsCount)
    )
    .toFixed(6);
  const minEthFee = new BigNumber(data.fee.usdcFeeData["redeem"])
    .multipliedBy(data.fee.ethereumGasPrice)
    .multipliedBy(constants.usdtzFeePad)
    .multipliedBy(usdtzSwapsCount)
    .plus(
      new BigNumber(
        data.fee.usdcFeeData["initiateWait"] +
          data.fee.usdcFeeData["addCounterParty"]
      )
        .multipliedBy(data.fee.ethereumGasPrice)
        .multipliedBy(constants.usdcFeePad)
        .multipliedBy(usdcSwapsCount)
    )
    .toFixed(6);

  let question = "Are the above details correct? (y/n): ";
  if (
    new BigNumber(data.tez.balance).lt(minTezFee) ||
    new BigNumber(data.eth.balance).lt(minEthFee)
  )
    question = `\n[x] The estimated amount of balance required is :\n   [*] Ethereum : ${minEthFee} eth\n   [*] Tezos : ${minTezFee} xtz\n\n[!] If your balance drops below the tx fees at any point your bot will fail to operate\n[*] These balances are estimated values with a considerable safety margins\n\nDo you want to continue with current settings? (y/n)`;
  const answer = readlineSync.question(question);

  if (answer.toLowerCase() !== "y") {
    throw new Error("[x] Exiting..\n");
  }
};

init();
