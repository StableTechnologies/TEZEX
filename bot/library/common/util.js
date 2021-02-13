/**
 * Returns the minimum expected value by an initiator after deducting reward for swap responder
 *
 * @param swapValue the actual swap value initiated by the user
 * @param rewardInBIPS reward taken by the swap responder in basis points
 */
module.exports.calcSwapReturn = (swapValue, rewardInBIPS) => {
  return Math.floor(
    parseInt(swapValue) *
      (1 - parseInt(rewardInBIPS) / this.constants.decimals10_6)
  );
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
  minUSDCVolume: 50000000,
  minUSDtzVolume: 50000000,
};
