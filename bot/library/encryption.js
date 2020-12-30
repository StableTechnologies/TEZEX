const crypto = require("crypto");
const fs = require("fs");

const algorithm = "aes-256-ctr";

const getCipherKey = (password) => {
  return crypto.createHash("sha256").update(password).digest();
};

const encrypt = (text, password) => {
  const secretKey = getCipherKey(password);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
};

const decrypt = (hash, password) => {
  const secretKey = getCipherKey(password);
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, "hex")
  );

  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, "hex")),
    decipher.final(),
  ]);

  return decrpyted.toString();
};

module.exports.encryptUserConfig = (configFile, password) => {
  let rawdata = fs.readFileSync(configFile);
  const config = JSON.parse(rawdata);
  fs.writeFileSync(
    configFile,
    JSON.stringify(encrypt(JSON.stringify(config), password))
  );
  return config;
};

module.exports.decryptUserConfig = (configFile, password) => {
  let rawdata = fs.readFileSync(configFile);
  const config = JSON.parse(rawdata);
  return JSON.parse(decrypt(config, password));
};
