const TokenSwap = artifacts.require("TokenSwap");
const SimpleToken = artifacts.require("SimpleToken");

module.exports = async function (deployer) {
  await deployer.deploy(SimpleToken);
  const token = await SimpleToken.deployed();
  await deployer.deploy(TokenSwap, token.address);
};
