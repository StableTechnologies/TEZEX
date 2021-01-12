/**
 * Returns the minimum expected value by an initiator after deducting reward for swap responder
 *
 * @param swapValue the actual swap value initiated by the user
 * @param rewardInBIPS reward taken by the swap responder in basis points
 */
module.exports.calcSwapReturn = (swapValue, rewardInBIPS) => {
  return Math.floor(parseInt(swapValue) * (1 - parseInt(rewardInBIPS) / 10000));
};
