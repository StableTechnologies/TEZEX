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
