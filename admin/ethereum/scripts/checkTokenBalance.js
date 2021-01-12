const config = require("../../config/eth-token-swap-config.json");
const initAdminAccount = require("../init");

const getTokenBalanceAllowance = async (owner, delegate) => {
  const web3 = initAdminAccount();
  const contractinstance = new web3.eth.Contract(
    config.tokenABI,
    config.tokenAddr
  );
  let bal = await contractinstance.methods.balanceOf(owner).call();
  console.log("OWNER BALANCE : ", bal);
  bal = await contractinstance.methods.balanceOf(delegate).call();
  console.log("DELEGATE BALANCE : ", bal);
  bal = await contractinstance.methods.allowance(owner, delegate).call();
  console.log("DELEGATE ALLOWANCE : ", bal);
};

getTokenBalanceAllowance(config.walletAddress, config.contractAddr);
