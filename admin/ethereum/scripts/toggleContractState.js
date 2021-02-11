const config = require("../../config/eth-token-swap-config.json");
const BCInteract = require("../bc-intereraction");
const initAdminAccount = require("../init");

const toggleContractState = async (state) => {
  const web3 = initAdminAccount();
  var contractinstance = new web3.eth.Contract(config.abi, config.contractAddr);
  const data = await contractinstance.methods
    .toggleContractState(state)
    .encodeABI();
  const rc = await BCInteract(
    web3,
    data,
    "0",
    "1000000",
    "0x051aa11d0da7fae4395b837e60238d9fd5b80ba5",
    config.chain
  );
  if (rc) {
    const data = await contractinstance.methods.active().call();
    console.log(`CONTRACT STATE ${data}`);
  } else {
    console.log("ERROR UPDATING CONTRACT STATE");
  }
  return;
};

// true -> active
// false -> deactivated

toggleContractState(true);
