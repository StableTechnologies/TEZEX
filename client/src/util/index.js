import { BigNumber } from "bignumber.js";
import { DAppClient } from "@airgap/beacon-sdk";
import Ethereum from "../library/ethereum";
import { Mutex } from "async-mutex";
import PureTezos from "../library/pure_tezos";
import Tezos from "../library/tezos";
import Web3 from "web3";
const config = require(`../library/${process.env.REACT_APP_ENV || "prod"
  }-network-config.json`);


/**
 * This function is used to truncate a blockchain address for presentation by replacing the middle digits with an ellipsis.
 *
 * @param {number} first Number of characters to preserve at the front.
 * @param {number} last Number of characters to preserve at the end.
 * @param {string} str Address to format.
 * @returns
 */
export const shorten = (first, last, str) => {
  return str.substring(0, first) + "..." + str.substring(str.length - last);
};

export const truncate = (number, digits) => {
  return Math.trunc(number * Math.pow(10, digits)) / Math.pow(10, digits);
};

export const connectEthAccount = async () => {
  if (window.ethereum) {
    const web3 = new Web3(window.ethereum);
    const network = await web3.eth.net.getNetworkType()
    if (config.ethereum.chain === "mainnet" && network !== "main") {
      alert("Please connect to mainnet in your ethereum wallet");
      throw new Error("ethereum not connected to mainnet")
    }
    if (config.ethereum.chain !== "mainnet" && network !== config.ethereum.chain) {
      alert(`Please connect to ${config.ethereum.chain} in your ethereum wallet`);
      throw new Error(`ethereum not connected ${config.ethereum.chain}`)
    }
    await window.ethereum.enable();
    const account = await web3.eth.getAccounts();
    return { web3, account: account[0] };

  }

  alert(
    "Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!"
  );

  return undefined;
};

export const connectTezAccount = async () => {
  const client = new DAppClient({ name: "TEZEX" });
  const network =
    config.tezos.conseilServer.network === "mainnet" ? "mainnet" : "florencenet";
  const resp = await client.requestPermissions({
    network: { type: network },
  });
  const account = await client.getActiveAccount();
  return { client, account: account["address"] };
};

/**
 * Creates the ethereum clients
 */
export const setupEthClient = async () => {
  const { web3, account: ethAccount } = await connectEthAccount();

  const clients = {
    ethereum: new Ethereum(web3, ethAccount),
  }
  return { clients };
}
/**
 * Creates the tezos clients
 */
export const setupTezClient = async () => {
  const { client, account: tezAccount } = await connectTezAccount();

  const mutex = new Mutex()
  const clients = {
    tezos: new Tezos(
      client,
      tezAccount,
      config.tezos.priceOracle,
      config.tezos.feeContract,
      config.tezos.RPC,
      config.tezos.conseilServer,
      mutex
    ),
    pureTezos: new PureTezos(
      client,
      tezAccount,
      config.tezos.priceOracle,
      config.tezos.RPC,
      config.tezos.conseilServer,
      mutex)
  };
  return { clients };
};


/**
 * Initializes the swap pair details
 */
export const initSwapDetails = async () => {

  const web3 = new Web3(window.ethereum);

  const pairs = Object.keys(config.pairs);
  const swapPairs = {};
  pairs.forEach((pair) => {
    const assets = pair.split("/");
    for (const asset of assets) {
      let swapContract = config.pairs[pair][asset].swapContract,
        tokenContract = config.pairs[pair][asset].tokenContract;
      if (config.pairs[pair][asset].network === "ethereum") {
        swapContract = new web3.eth.Contract(
          config.pairs[pair][asset].swapContract.abi,
          config.pairs[pair][asset].swapContract.address
        );
        tokenContract =
          asset !== "eth"
            ? new web3.eth.Contract(
              config.pairs[pair][asset].tokenContract.abi,
              config.pairs[pair][asset].tokenContract.address
            )
            : undefined;
      }
      swapPairs[pair] = {
        ...swapPairs[pair],
        [asset]: {
          network: config.pairs[pair][asset].network,
          swapContract: swapContract,
          tokenContract: tokenContract,
          decimals: config.pairs[pair][asset].decimals,
          symbol: config.pairs[pair][asset].symbol,
        },
      };
    }
  });

  return { swapPairs };
};

/**
 * Fetch all the old swaps for all swap pairs for the current user
 *
 * @param clients ethereum and tezos network clients
 * @param swapPairs details of each swap pair
 */
export const getOldSwaps = async (clients, swapPairs) => {
  if (swapPairs === undefined) return {};
  const swaps = {};
  const pairs = Object.keys(swapPairs);
  let pureTez = false;
  for (const pair of pairs) {
    const assets = pair.split("/");
    for (const asset of assets) {
      const network = swapPairs[pair][asset].network;
      if (clients[network] === null) continue;
      if (network === "pureTezos" && pureTez)
        continue;
      if (network === "pureTezos")
        pureTez = true;
      const allSwaps = await clients[network].getUserSwaps(
        swapPairs[pair][asset].swapContract,
        clients[network].account
      );
      allSwaps.forEach((swp) => {
        let p = pair, a = asset;
        if (network === "pureTezos") {
          p = swp.pair; a = swp.asset;
        }
        swaps[swp.hashedSecret] = {
          network: network,
          pair: p,
          asset: a,
          hashedSecret: swp.hashedSecret,
          value:
            new BigNumber(swp.value)
              .div(10 ** swapPairs[p][a].decimals)
              .toString() +
            " " +
            swapPairs[p][a].symbol,
          minReturn: "nil",
          exact: "nil",
          refundTime: swp.refundTimestamp,
          state: 0,
        };
      });
    }
  }
  return swaps;
};
