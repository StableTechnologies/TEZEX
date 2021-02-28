const { BigNumber } = require("bignumber.js");
/**
 * Returns the minimum expected value by an initiator after deducting reward for swap responder
 *
 * @param swapValue the actual swap value initiated by the user
 * @param rewardInBIPS reward taken by the swap responder in basis points
 */
module.exports.calcSwapReturn = (swapValue, rewardInBIPS) => {
  return new BigNumber(swapValue)
    .multipliedBy(
      new BigNumber(1).minus(new BigNumber(rewardInBIPS).div(10000))
    )
    .toFixed(0, 3);
};

/**
 * constants for calculations
 * decimals10_6 : 10^6 value used to convert usdc/usdtz/xtz to whole no.s
 * usdcFeePad : adds padding to the bot usdc swap tx fee [Y*txFee]
 * usdtzFeePad : adds padding to the bot usdtz swap tx fee [Y*txFee]
 * minUSDCVolume : minimum volume of swaps expected, helps calculate estimated eth balance req. (no. of swaps = maxVolume/minUSDCVolume)*feePerTx*feePad
 * minUSDtzVolume : minimum volume of swaps expected, helps calculate estimated tez balance req. (no. of swaps = maxVolume/minUSDtzVolume)*feePerTx*feePad
 */
module.exports.constants = {
  decimals10_6: 1000000,
  usdcFeePad: 1.7,
  usdtzFeePad: 1.5,
  feePad: {
    "usdc/usdtz": {
      usdc: new BigNumber(1.7),
      usdtz: new BigNumber(1.5),
    },
    "eth/ethtz": {
      eth: new BigNumber(1.7),
      ethtz: new BigNumber(1.5),
    },
  },
  minTradeVolume: {
    "usdc/usdtz": {
      usdc: new BigNumber(50).multipliedBy(10 ** 6),
      usdtz: new BigNumber(50).multipliedBy(10 ** 6),
    },
    "eth/ethtz": {
      eth: new BigNumber(0.001).multipliedBy(10 ** 18),
      ethtz: new BigNumber(0.001).multipliedBy(10 ** 18),
    },
  },
};

/**
 * Takes a whole no. with the original decimal count and required precision (rounded up)
 * @param number BigNumber compatible value
 * @param decimals original decimal count
 * @param precision required decimal places
 */
module.exports.convertBigIntToFloat = (number, decimals, precision) => {
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
module.exports.getAssets = (pairString) => {
  return pairString.split("/");
};

/**
 * Returns the counter item from a given pair string eg. ("a/b","b") -> "a"
 *
 * @param pairString a valid pair string eg. "a/b"
 * @param asset one of the items in the pair
 * @returns the other item in the pair
 */
module.exports.getCounterPair = (pairString, asset) => {
  const items = pairString.split("/");
  if (items[0] !== asset) return items[0];
  if (items[1] !== asset) return items[1];
  throw new Error("counter pair not found");
};
