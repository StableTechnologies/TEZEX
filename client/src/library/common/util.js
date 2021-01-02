import crypto from "crypto";

export const createSecrets = () => {
  const rand = crypto.randomBytes(32);
  let hash = crypto.createHash("sha256").update(rand).digest();
  hash = crypto.createHash("sha256").update(hash).digest("hex");
  return {
    hashedSecret: "0x" + hash,
    secret: "0x" + rand.toString("hex"),
  };
};

export const calcSwapReturn = (swapValue, reward) => {
  console.log("Here");
  return Math.floor(parseInt(swapValue) * (1 - parseInt(reward) / 10000));
};
