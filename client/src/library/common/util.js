import crypto from "crypto";

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
  return Math.floor(parseInt(swapValue) * (1 - parseInt(rewardInBIPS) / 10000));
};
