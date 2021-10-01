import { BigNumber } from "bignumber.js";
import crypto from "crypto";
const config = require(`./${process.env.REACT_APP_ENV || "prod"
  }-network-config.json`);
/**
 * Creates a random secret and corresponding hashed secret for a swap
 */
export const createSecrets = () => {
  const rand = crypto.randomBytes(32);
  let hash = crypto.createHash("sha256").update(rand).digest();
  hash = crypto.createHash("sha256").update(hash).digest("hex");
  return {
    hashedSecret: "0x" + hash,
    secret: "0x" + rand.toString("hex"),
  };
};

/**
 * Returns the minimum expected value by an initiator after deducting reward for swap responder
 *
 * @param swapValue the actual swap value initiated by the user
 * @param rewardInBIPS reward taken by the swap responder in basis points
 */
export const calcSwapReturn = (swapValue, rewardInBIPS) => {
  return new BigNumber(swapValue)
    .multipliedBy(
      new BigNumber(1).minus(new BigNumber(rewardInBIPS).div(10000))
    )
    .toFixed(0, 3);
};

/**
 * constants for calculations
 * decimals10_6 : 10^6 value used to convert usdc/usdtz/xtz to whole no.s
 * feePad : padding to be added to the network fees for each swap pair and asset [Y*txFee]
 */
export const constants = {
  tokenTypes: {
    FA2: "fa2",
    FA12: "FA12",
  },
  decimals10_6: 1000000,
  feePad: {
    "usdc/usdtz": {
      usdc: new BigNumber(2),
      usdtz: new BigNumber(2),
    },
    "eth/ethtz": {
      eth: new BigNumber(2),
      ethtz: new BigNumber(2),
    },
    "wbtc/tzbtc": {
      wbtc: new BigNumber(2),
      tzbtc: new BigNumber(2),
    },
    "wbtc/btctz": {
      wbtc: new BigNumber(2),
      btctz: new BigNumber(2),
    },
  },
};

/**
 * Takes a whole no. with the original decimal count and required precision (rounded up)
 * @param number BigNumber compatible value
 * @param decimals original decimal count
 * @param precision required decimal places
 */
export const convertBigIntToFloat = (number, decimals, precision) => {
  return new BigNumber(number)
    .div(new BigNumber(10).pow(decimals))
    .toFixed(precision);
};

/**
 * Returns the individual pairs from a given pair string eg. "a/b" -> ["a","b"]
 *
 * @param pairString a valid pair string eg. "a/b"
 * @returns individual items/assets from the pair
 */
export const getAssets = (pairString) => {
  return pairString.split("/");
};

/**
 * Returns the counter item from a given pair string eg. ("a/b","b") -> "a"
 *
 * @param pairString a valid pair string eg. "a/b"
 * @param asset one of the items in the pair
 * @returns the other item in the pair
 */
export const getCounterPair = (pairString, asset) => {
  const items = pairString.split("/");
  if (items[0] !== asset) return items[0];
  if (items[1] !== asset) return items[1];
  throw new Error("counter pair not found");
};

/**
 * Polls the current bot stats from the tezex server.
 * Stats include active bot count and available liquidity and
 * swap size for each swap pair
 */
export const updateBotStats = async () => {
  try {
    const [res1, res2] = await Promise.all([fetch(config.tezex.server + config.tezex.route1), fetch(config.tezex.server + config.tezex.route2)]);
    if (!res1.ok || !res2.ok) throw new Error("Failed to ping server\n");
    const [data1, data2] = await Promise.all([res1.json(), res2.json()])
    return {
      activeBots: data1.activeBots + data2.activeBots,
      max: { ...data1.max, ...data2.max },
      total: { ...data1.total, ...data2.total }
    }
  } catch (err) {
    console.log(`\n[x] ERROR : ${err.toString()}`);
    return undefined;
  }
};
