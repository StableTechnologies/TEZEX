module.exports.calcSwapReturn = (swapValue, reward) => {
  return Math.floor(parseInt(swapValue) * (1 - parseInt(reward) / 10000));
};
