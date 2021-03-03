import { BigNumber } from "bignumber.js";
import crypto from "crypto";
import config from "../globalConfig.json";
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

export const constants = {
  decimals10_6: 1000000,
  usdcFeePad: 2,
  usdtzFeePad: 2,
};

export const updateBotStats = async () => {
  try {
    const res = await fetch(config.tezex.server + config.tezex.route);
    if (!res.ok) throw new Error("Failed to ping server\n");
    return await res.json();
  } catch (err) {
    console.log(`\n[x] ERROR : ${err.toString()}`);
    return undefined;
  }
};

export const convertBigIntToFloat = (number, decimals, precision) => {
  return new BigNumber(number)
    .div(new BigNumber(10).pow(decimals))
    .toFixed(precision);
};
