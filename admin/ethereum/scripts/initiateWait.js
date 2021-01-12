const config = require("../../config/eth-token-swap-config.json");
const BCInteract = require("../bc-intereraction");
const initAdminAccount = require("../init");

const Test = async (secret, refundTime, tezAcc, tokenAmount) => {
  const web3 = initAdminAccount();
  var contractinstance = new web3.eth.Contract(config.abi, config.contractAddr);
  const data = await contractinstance.methods
    .initiateWait(secret, tezAcc, tokenAmount, refundTime)
    .encodeABI();
  const rc = await BCInteract(
    web3,
    data,
    "0",
    "1000000",
    config.contractAddr,
    config.chain
  );
  console.log("SUCCESS : ", rc);
};

//Tezos Addr to transfer the converted crypto and amount to convert in Eth
Test(
  "0x055e1d97b8f4a2d0e8913e6300818ed3c235f886d3b71bdfde7ed5aa05d724fd",
  Math.trunc(Date.now() / 1000) + 600,
  "tz1TjCVuTLE7mHRJdS8GDYhtmjTu1eAncq8e",
  100
);
