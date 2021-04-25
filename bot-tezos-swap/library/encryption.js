const crypto = require("crypto");
const fs = require("fs");

//algorith used for the encryption
const algorithm = "aes-256-ctr";

/**
 * Returns the hash of password provided, this is used as the secret key in encryption
 * @param password is the password used for encryption
 */
const getCipherKey = (password) => {
  return crypto.createHash("sha256").update(password).digest();
};

/**
 * Encrypts the data with the password provided and algorithm mentioned
 *
 * @param  text the data that is to be encrypted
 * @param  password is the password used for encryption
 */
module.exports.encrypt = (text, password) => {
  const secretKey = getCipherKey(password);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
};

/**
 * Decrypts the data with the password provided
 *
 * @param  hash the {iv,content} structure representing the encrypted data
 * @param  password the password used to create the encrypted hash
 */
module.exports.decrypt = (hash, password) => {
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

/**
 * Takes the user config file path and creates the encrypted file while overwriting the original one
 *
 * @param  configFile path to the user config
 * @param  password password used for encryption
 */
module.exports.encryptUserConfig = (configFile, password) => {
  let rawdata = fs.readFileSync(configFile);
  const config = JSON.parse(rawdata);
  fs.writeFileSync(
    configFile,
    JSON.stringify(this.encrypt(JSON.stringify(config), password))
  );
  return config;
};

/**
 * Takes the encrypted file and returns the decrypted data
 *
 * @param  configFile path to the encrypted user config
 * @param  password password used for encryption
 */
module.exports.decryptUserConfig = (configFile, password) => {
  let rawdata = fs.readFileSync(configFile);
  const config = JSON.parse(rawdata);
  return JSON.parse(this.decrypt(config, password));
};
