import config from "../../../globalConfig.json";
import BCInteract from "./bc-intereraction";

const approveToken = async (web3, store, amount) => {
  var tokenInstance = new web3.eth.Contract(
    config.ethereum.tokenABI,
    config.ethereum.tokenAddr
  );
  const data = await tokenInstance.methods
    .approve(config.ethereum.contractAddr, parseInt(amount))
    .encodeABI();
  const rc = await BCInteract(
    web3,
    store,
    data,
    "0",
    "1000000",
    config.ethereum.tokenAddr
  );
  return rc;
};

export default approveToken;
