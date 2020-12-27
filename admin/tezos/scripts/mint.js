const init = require("../init");
const invokeContract = require("../util/invokeContract");
const config = require("../../config/tez-token-swap-config.json");

const amount = 10000;

init().then(() => {
  invokeContract(
    0,
    "mint",
    `(Pair "${config.walletAddr}" ${amount})`,
    10000,
    300,
    config.tokenAddr
  )
    .then((res) => {
      if (res.status !== "applied") {
        console.log("FAILED - XTZ HASH : ", res.operation_group_hash);
        console.log("STATUS : ", res.status, "\nREASON : ", res.errors);
      } else console.log("CONFIRMED - XTZ HASH : ", res.operation_group_hash);
    })
    .catch((err) => {
      console.error("ERROR : ", err);
    });
});
