import { BigNumber } from "bignumber.js";
import { constants, updateBotStats } from "../../library/util";

const getBalance = async (clients, swapPairs, pair) => {
  const assets = pair.split("/");
  const balances = {};
  for (const asset of assets) {
    if (asset !== "eth" && asset !== "xtz") {
      balances[asset] = await clients[swapPairs[pair][asset].network]
        .tokenBalance(
          swapPairs[pair][asset].tokenContract,
          clients[swapPairs[pair][asset].network].account
        )
        .then((data) => new BigNumber(data));
    } else {
      balances[asset] = await clients[swapPairs[pair][asset].network]
        .balance(clients[swapPairs[pair][asset].network].account)
        .then((data) => new BigNumber(data));
    }
  }
  return balances;
};

/**
 * Returns tx fees and reward in bps
 */
const getBotFees = async (clients, swapPairs) => {
  const data = await Promise.all([
    clients["tezos"].getFees(),
    clients["tezos"].getReward(swapPairs["usdc/usdtz"]["usdtz"].swapContract),
    clients["ethereum"].web3.eth.getGasPrice(),
  ]);
  const ethereumGasPrice = new BigNumber(data[2]);
  return {
    txFees: data[0],
    ethereumGasPrice,
    reward: data[1],
  };
};

const getPureSwapFee = ({ txFees, ethereumGasPrice }, swapPairs, pair) => {
  const pureSwapFees = {};
  const assets = pair.split("/");
  const initialTxs = {
    [assets[0]]: new BigNumber(
      new BigNumber(txFees[assets[0].toUpperCase()]["initiateWait"])
        .plus(txFees[assets[0].toUpperCase()]["addCounterParty"])
        .multipliedBy(constants.feePad[pair][assets[0]])
        .toFixed(0, 2)
    ),
    [assets[1]]: new BigNumber(
      new BigNumber(txFees[assets[1].toUpperCase()]["initiateWait"])
        .plus(txFees[assets[1].toUpperCase()]["addCounterParty"])
        .multipliedBy(constants.feePad[pair][assets[1]])
        .toFixed(0, 2)
    ),
  };
  const redeemTxs = {
    [assets[0]]: new BigNumber(
      new BigNumber(txFees[assets[1].toUpperCase()]["redeem"])
        .multipliedBy(constants.feePad[pair][assets[0]])
        .toFixed(0, 2)
    ),
    [assets[1]]: new BigNumber(
      new BigNumber(txFees[assets[0].toUpperCase()]["redeem"])
        .multipliedBy(constants.feePad[pair][assets[1]])
        .toFixed(0, 2)
    ),
  };
  pureSwapFees[pair] = {};
  if (swapPairs[pair][assets[0]].network === "ethereum") {
    pureSwapFees[pair][assets[0]] = {
      eth: initialTxs[assets[0]].multipliedBy(ethereumGasPrice),
      xtz: new BigNumber(0),
    };
    pureSwapFees[pair][assets[1]] = {
      eth: redeemTxs[assets[1]].multipliedBy(ethereumGasPrice),
      xtz: new BigNumber(0),
    };
  } else {
    pureSwapFees[pair][assets[0]] = {
      xtz: initialTxs[assets[0]],
      eth: new BigNumber(0),
    };
    pureSwapFees[pair][assets[1]] = {
      xtz: redeemTxs[assets[1]],
      eth: new BigNumber(0),
    };
  }
  if (swapPairs[pair][assets[1]].network === "ethereum") {
    pureSwapFees[pair][assets[1]] = {
      eth: pureSwapFees[pair][assets[1]].eth.plus(
        initialTxs[assets[1]].multipliedBy(ethereumGasPrice)
      ),
      xtz: pureSwapFees[pair][assets[1]].xtz,
    };
    pureSwapFees[pair][assets[0]] = {
      eth: pureSwapFees[pair][assets[0]].eth.plus(
        redeemTxs[assets[0]].multipliedBy(ethereumGasPrice)
      ),
      xtz: pureSwapFees[pair][assets[0]].xtz,
    };
  } else {
    pureSwapFees[pair][assets[1]] = {
      xtz: pureSwapFees[pair][assets[1]].xtz.plus(initialTxs[assets[1]]),
      eth: pureSwapFees[pair][assets[1]].eth,
    };
    pureSwapFees[pair][assets[0]] = {
      xtz: pureSwapFees[pair][assets[0]].xtz.plus(redeemTxs[assets[0]]),
      eth: pureSwapFees[pair][assets[0]].eth,
    };
  }
  return pureSwapFees;
};

const getConverter = async (clients, pair) => {
  try {

  const exchangeRates = await Promise.all([
    clients["tezos"].getPrice("ETH-USD"),
    clients["tezos"].getPrice("XTZ-USD"),
  ]);
  const feeConverter = {
    usdc: ({ eth, xtz }) =>
      new BigNumber(
        eth
          .div(10 ** 18)
          .multipliedBy(new BigNumber(exchangeRates[0]))
          .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(exchangeRates[1])))
          .toFixed(0, 2)
      ),
    usdtz: ({ eth, xtz }) =>
      new BigNumber(
        eth
          .div(10 ** 18)
          .multipliedBy(new BigNumber(exchangeRates[0]))
          .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(exchangeRates[1])))
          .toFixed(0, 2)
      ),
    ethtz: ({ eth, xtz }) =>
      new BigNumber(
        eth
          .plus(
            xtz
              .div(10 ** 6)
              .multipliedBy(new BigNumber(exchangeRates[1]))
              .div(new BigNumber(exchangeRates[0]))
              .multipliedBy(10 ** 18)
          )
          .toFixed(0, 2)
      ),
    eth: ({ eth, xtz }) =>
      new BigNumber(
        eth
          .plus(
            xtz
              .div(10 ** 6)
              .multipliedBy(new BigNumber(exchangeRates[1]))
              .div(new BigNumber(exchangeRates[0]))
              .multipliedBy(10 ** 18)
          )
          .toFixed(0, 2)
      ),
  };
  const assetConverter = {
    "usdc/usdtz": {
      usdc: (amt) => amt,
      usdtz: (amt) => amt,
    },
    "eth/ethtz": {
      eth: (amt) => amt,
      ethtz: (amt) => amt,
    },
  };
  return {
    feeConverter,
    assetConverter: assetConverter[pair],
  };
  } catch (e) {
      console.log(e);
  }
};

/**
 * Returns the user asset balances, network fees, reward and
 * assetConverter for the particular swap pair
 *
 * @param clients ethereum and tezos network clients
 * @param swapPairs details of all the swap pairs
 * @param pair pair whose stats are required
 */
export const getSwapStat = async (clients, swapPairs, pair) => {
  try {
    const resp = await Promise.all([
      getBalance(clients, swapPairs, pair),
      getBotFees(clients, swapPairs),
      updateBotStats(),
      getConverter(clients, pair),
    ]);
    const pureFees = getPureSwapFee(resp[1], swapPairs, pair);
    const { feeConverter, assetConverter } = resp[3];
    const assets = pair.split("/");
    const networkFees = {};
    for (const asset of assets) {
      networkFees[asset] = feeConverter[asset](pureFees[pair][asset]);
    }
    return {
      balances: resp[0],
      reward: resp[1].reward,
      botStats: resp[2],
      networkFees,
      assetConverter,
    };

  } catch (e) {console.log(e); }
};
