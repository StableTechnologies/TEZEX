import Web3 from "web3";
import config from "../../../globalConfig.json";

const setEthAccount = async () => {
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    await window.ethereum.enable();
    const contract = new web3.eth.Contract(
      config.ethereum.abi,
      config.ethereum.contractAddr
    );
    const account = await web3.eth.getAccounts();
    return { web3, account: account[0], contract };
  }
  alert(
    "Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!"
  );
  return undefined;
};

export default setEthAccount;
