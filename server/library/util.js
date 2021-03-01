const Ethereum = require("./ethereum");
const Tezos = require("./tezos");
const config = require("./network-config.json");
const { BigNumber } = require("bignumber.js");

module.exports.init = async () => {
  const clients = {
    ethereum: Ethereum.newClient(),
    tezos: Tezos.newClient("error"),
  };
  const swapPairs = {};
  const pairs = Object.keys(config.pairs);
  pairs.forEach((pair) => {
    const assets = pair.split("/");
    for (const asset of assets) {
      let swapContract = config.pairs[pair][asset].swapContract,
        tokenContract = config.pairs[pair][asset].tokenContract;
      if (config.pairs[pair][asset].network === "ethereum") {
        swapContract = new clients["ethereum"].web3.eth.Contract(
          config.pairs[pair][asset].swapContract.abi,
          config.pairs[pair][asset].swapContract.address
        );
        tokenContract =
          asset !== "eth"
            ? new clients["ethereum"].web3.eth.Contract(
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
  return { clients, swapPairs };
};

const verifyBalance = async (clients, network, accounts, givenBalance) => {
  const bal = await clients[network].balance(accounts[network]);
  if (new BigNumber(givenBalance).gt(new BigNumber(bal))) return "0";
  return givenBalance;
};

module.exports.getAllowances = async (
  { accounts, volume },
  clients,
  swapPairs
) => {
  if (
    accounts === undefined ||
    volume === undefined ||
    accounts["ethereum"] === undefined ||
    accounts["tezos"] === undefined
  ) {
    return { allowances: undefined, foundNonZero: undefined };
  }
  let foundNonZero = false;
  const allowances = {},
    ops = [];
  const pairs = Object.keys(swapPairs);
  for (const pair of pairs) {
    const assets = pair.split("/");
    if (Object.prototype.hasOwnProperty.call(volume, pair)) {
      if (
        !Object.prototype.hasOwnProperty.call(volume[pair], assets[0]) ||
        !Object.prototype.hasOwnProperty.call(volume[pair], assets[1])
      )
        continue;
      for (const asset of assets) {
        if (asset !== "eth" && asset !== "xtz") {
          ops.push(
            clients[swapPairs[pair][asset].network].tokenAllowance(
              swapPairs[pair][asset].tokenContract,
              swapPairs[pair][asset].swapContract,
              accounts[swapPairs[pair][asset].network]
            )
          );
        } else {
          const vol = new BigNumber(
            new BigNumber(volume[pair][asset]).toFixed(0, 3)
          );
          if (vol.isPositive() && !vol.isNaN())
            ops.push(
              verifyBalance(
                clients,
                swapPairs[pair][asset].network,
                accounts,
                vol.toString()
              )
            );
          else ops.push("0");
        }
      }
    } else {
      allowances[pair] = {
        [assets[0]]: new BigNumber("0"),
        [assets[0]]: new BigNumber("0"),
      };
    }
  }
  let i = 0;
  const data = await Promise.all(ops);
  for (const pair of pairs) {
    const assets = pair.split("/");
    if (Object.prototype.hasOwnProperty.call(volume, pair)) {
      if (
        !Object.prototype.hasOwnProperty.call(volume[pair], assets[0]) ||
        !Object.prototype.hasOwnProperty.call(volume[pair], assets[1])
      )
        continue;
      allowances[pair] = {
        [assets[0]]: new BigNumber(data[i]).div(
          10 ** swapPairs[pair][assets[0]].decimals
        ),
        [assets[1]]: new BigNumber(data[i + 1]).div(
          10 ** swapPairs[pair][assets[1]].decimals
        ),
      };
      if (
        !allowances[pair][assets[0]].eq(0) ||
        !allowances[pair][assets[1]].eq(0)
      )
        foundNonZero = true;
      i += 2;
    }
  }
  return { allowances, foundNonZero };
};

module.exports.log = (msg) => {
  console.log(`\n[${(new Date().getTime() / 1000).toFixed()}] `, ...msg);
};
