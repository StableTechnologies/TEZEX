const config = require("../../config/tez-token-swap-config.json");
const convertJSON = require("./convertJSON");

module.exports = (storage, tokenContract = "") => {
  return convertJSON(storage)
    .replace("${config.walletAddr}", config.walletAddr)
    .replace("${config.tokenAddr}", tokenContract);
};
