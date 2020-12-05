import config from "../../../globalConfig.json";

export const accountBalanceEth = async (web3, address) => {
  const balance = await web3.eth.getBalance(address); //Will give value in.
  return balance;
};

export const tokenBalanceEth = async (web3, address) => {
  const tokenContract = new web3.eth.Contract(
    config.ethereum.tokenABI,
    config.ethereum.tokenAddr
  );
  let bal = await tokenContract.methods.balanceOf(address).call();
  return bal;
};

export const allowanceEth = async (web3, address) => {
  const tokenContract = new web3.eth.Contract(
    config.ethereum.tokenABI,
    config.ethereum.tokenAddr
  );
  let allowance = await tokenContract.methods
    .allowance(address, config.ethereum.contractAddr)
    .call();
  return allowance;
};
