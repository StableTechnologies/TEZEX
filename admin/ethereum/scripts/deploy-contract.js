const config = require("../../config/eth-token-swap-config.json");
const BCInteract = require("../bc-intereraction");
const initAdminAccount = require("../init");

const Deploy = async () => {
  const web3 = initAdminAccount();
  var tokenInstance = new web3.eth.Contract(config.tokenABI);
  let data = tokenInstance
    .deploy({
      data: config.tokenByteCode,
      arguments: [],
    })
    .encodeABI();
  let rc = await BCInteract(web3, data, "0", "5000000", "", config.chain);
  console.log("TOKEN CONTRACT ADDR : ", rc);
  var contractinstance = new web3.eth.Contract(config.abi);
  data = contractinstance
    .deploy({
      data: config.byteCode,
      arguments: [rc],
    })
    .encodeABI();
  rc = await BCInteract(web3, data, "0", "5000000", "", config.chain);
  console.log("SWAP CONTRACT ADDR : ", rc);
};

Deploy();
