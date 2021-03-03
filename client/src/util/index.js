import { DAppClient, NetworkType } from "@airgap/beacon-sdk";
import Web3 from "web3";
import ERC20 from "../library/erc20";
import FA12 from "../library/fa12";
import config from "../library/globalConfig.json";

export const shorten = (first, last, str) => {
  return str.substring(0, first) + "..." + str.substring(str.length - last);
};

export const truncate = (number, digits) => {
  return Math.trunc(number * Math.pow(10, digits)) / Math.pow(10, digits);
};

export const setEthAccount = async () => {
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    await window.ethereum.enable();
    const swapContract = new web3.eth.Contract(
      config.pairs["usdc/usdtz"].usdc.swapContract.abi,
      config.pairs["usdc/usdtz"].usdc.swapContract.address
    );
    const tokenContract = new web3.eth.Contract(
      config.pairs["usdc/usdtz"].usdc.tokenContract.abi,
      config.pairs["usdc/usdtz"].usdc.tokenContract.address
    );
    const account = await web3.eth.getAccounts();
    return new ERC20(web3, account[0], swapContract, tokenContract);
  }
  alert(
    "Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!"
  );
  return undefined;
};

export const setTezAccount = async () => {
  const client = new DAppClient({ name: "TEZEX" });
  const resp = await client.requestPermissions({
    network: { type: NetworkType.MAINNET },
  });
  const account = await client.getActiveAccount();
  return new FA12(
    client,
    account["address"],
    config.pairs["usdc/usdtz"].usdtz.swapContract,
    config.tezos.priceOracle,
    config.tezos.feeContract,
    config.pairs["usdc/usdtz"].usdtz.tokenContract,
    config.tezos.RPC,
    config.tezos.conseilServer
  );
};
