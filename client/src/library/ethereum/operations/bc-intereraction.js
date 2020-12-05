import config from "../../../globalConfig.json";

const interact = async (
  web3,
  store,
  data,
  ether,
  gas,
  to = config.ethereum.contractAddr
) => {
  return new Promise((resolve) => {
    try {
      // web3.eth.handleRevert = true;
      const tx = {
        from: store.account,
        value: web3.utils.toHex(web3.utils.toWei(ether, "ether")),
        data: data,
      };
      if (to !== "") tx["to"] = to;
      console.log(tx);
      web3.eth
        .sendTransaction(tx)
        .on("transactionHash", (transactionHash) => {
          console.log("ETH TX HASH : ", transactionHash);
        })
        .once("receipt", (rc) => {
          console.log(rc);
        })
        .then((contract) => {
          if (contract.contractAddress != null)
            resolve(contract.contractAddress);
          resolve(true);
        })
        .catch((error) => {
          console.error("ETH TX ERROR : ", error);
          resolve(false);
        });
    } catch (error) {
      console.error("ETH TX ERROR : ", error);
      resolve(false);
    }
  });
};

export default interact;
