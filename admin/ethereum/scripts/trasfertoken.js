const config = require("../../config/eth-token-swap-config.json");
const BCInteract = require("../bc-intereraction");
const initAdminAccount = require("../init");

const Test = async (address, amount) => {
  const web3 = initAdminAccount();
  var contractinstance = new web3.eth.Contract(
    config.tokenABI,
    config.tokenAddr
  );
  const data = await contractinstance.methods
    .transfer(address, amount)
    .encodeABI();
  const rc = await BCInteract(
    web3,
    data,
    "0",
    "1000000",
    config.tokenAddr,
    config.chain
  );
  console.log("SUCCESS : ", rc);
};

//Tezos Addr to transfer the converted crypto and amount to convert in Eth
Test("0x91f79893E7B923410Ef1aEba6a67c6fab07D800C", 1000);
