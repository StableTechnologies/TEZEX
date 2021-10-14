import { constants, updateBotStats } from "../../library/util";

import { BigNumber } from "bignumber.js";

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
const getBotFees = async (clients, swapContract, network) => {
  let ops = [
    clients["tezos"].getFees(),
    clients[network].getReward(swapContract),
  ];
  if (network !== "pureTezos") {
    ops.push(clients["ethereum"].web3.eth.getGasPrice());
  }
  const data = await Promise.all(ops);
  const ethereumGasPrice = network !== "pureTezos" ? new BigNumber(data[2]) : new BigNumber(0);
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

    const [eth_usd, xtz_usd, btc_usd] = await Promise.all([
      clients["tezos"].getPrice("ETH-USD"),
      clients["tezos"].getPrice("XTZ-USD"),
      clients["tezos"].getPrice("BTC-USD"),
    ]);
    const feeConverter = {
      wbtc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .div(new BigNumber(btc_usd))
            .multipliedBy(10 ** 8)
            .toFixed(0, 2)
        ),
      tzbtc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .div(new BigNumber(btc_usd))
            .multipliedBy(10 ** 8)
            .toFixed(0, 2)
        ),
      btctz: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .div(new BigNumber(btc_usd))
            .multipliedBy(10 ** 8)
            .toFixed(0, 2)
        ),
      usdc: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .toFixed(0, 2)
        ),
      usdtz: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .div(10 ** 18)
            .multipliedBy(new BigNumber(eth_usd))
            .plus(xtz.div(10 ** 6).multipliedBy(new BigNumber(xtz_usd)))
            .toFixed(0, 2)
        ),
      ethtz: ({ eth, xtz }) =>
        new BigNumber(
          eth
            .plus(
              xtz
                .div(10 ** 6)
                .multipliedBy(new BigNumber(xtz_usd))
                .div(new BigNumber(eth_usd))
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
                .multipliedBy(new BigNumber(xtz_usd))
                .div(new BigNumber(eth_usd))
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
      "wbtc/tzbtc": {
        wbtc: (amt) => amt,
        tzbtc: (amt) => amt,
      },
      "wbtc/btctz": {
        wbtc: (amt) => amt,
        btctz: (amt) => amt,
      },
      "xtz/usdtz": {
        xtz: (amt) =>
          new BigNumber(
            amt
              .multipliedBy(10 ** 6)
              .div(new BigNumber(xtz_usd))
              .toFixed(0, 2)
          ),
        usdtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 6)
              .multipliedBy(new BigNumber(xtz_usd))
              .toFixed(0, 2)
          ),
      },
      "xtz/ethtz": {
        xtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 18)
              .multipliedBy(new BigNumber(eth_usd))
              .div(new BigNumber(xtz_usd))
              .multipliedBy(10 ** 6)
              .toFixed(0, 2)
          ),
        ethtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 6)
              .multipliedBy(new BigNumber(xtz_usd))
              .div(new BigNumber(eth_usd))
              .multipliedBy(10 ** 18)
              .toFixed(0, 2)
          ),
      },
      "ethtz/usdtz": {
        ethtz: (amt) =>
          new BigNumber(
            amt
              .multipliedBy(10 ** 18)
              .div(new BigNumber(eth_usd))
              .toFixed(0, 2)
          ),
        usdtz: (amt) =>
          new BigNumber(
            amt
              .div(10 ** 18)
              .multipliedBy(new BigNumber(eth_usd))
              .toFixed(0, 2)
          ),
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
  const assets = pair.split("/");
  let swapContract = swapPairs["usdc/usdtz"]["usdtz"].swapContract;
  let network = "tezos"
  if (swapPairs[pair][assets[0]].network === "pureTezos") {
    swapContract = swapPairs[pair][assets[0]].swapContract;
    network = "pureTezos"
  }
  const resp = await Promise.all([
    getBalance(clients, swapPairs, pair),
    getBotFees(clients, swapContract, network),
    updateBotStats(),
    getConverter(clients, pair),
  ]);
  const { feeConverter, assetConverter } = resp[3];
  const networkFees = {};
  if (network !== "pureTezos") {
    const pureFees = getPureSwapFee(resp[1], swapPairs, pair);
    for (const asset of assets) {
      networkFees[asset] = feeConverter[asset](pureFees[pair][asset]);
    }
  }
  return {
    balances: resp[0],
    reward: resp[1].reward.reward,
    botStats: resp[2],
    networkFees,
    assetConverter,
  };
};
