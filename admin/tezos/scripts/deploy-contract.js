const conseiljs = require("conseiljs");
const config = require("../../config/tez-token-swap-config.json");
const convertJSON = require("../util/convertJSON");
const parseStorage = require("../util/parseStorage");
const init = require("../init");
const store = require("../store");

const Deploy = async () => {
  try {
    await init();
    const fee = Number(
      (
        await conseiljs.TezosConseilClient.getFeeStatistics(
          config.conseilServer,
          config.network,
          conseiljs.OperationKindType.Origination
        )
      )[0]["high"]
    );
    console.log(fee);
    let result = await conseiljs.TezosNodeWriter.sendContractOriginationOperation(
      config.tezosNode,
      store.signer,
      store.keyStore,
      0,
      undefined,
      fee,
      60000,
      100000,
      convertJSON(config["token-contract"]),
      parseStorage(config["token-storage"]),
      conseiljs.TezosParameterFormat.Micheline
    );
    let groupid = result["operationGroupID"]
      .replace(/"/g, "")
      .replace(/\n/, ""); // clean up RPC output
    console.log(`Injected operation group id ${groupid}`);
    let conseilResult = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
      config.conseilServer,
      config.network,
      groupid,
      2
    );
    console.log(
      `Originated token contract at ${conseilResult["originated_contracts"]}`
    );
    result = await conseiljs.TezosNodeWriter.sendContractOriginationOperation(
      config.tezosNode,
      store.signer,
      store.keyStore,
      0,
      undefined,
      fee,
      60000,
      100000,
      convertJSON(config.contract),
      parseStorage(config.storage, conseilResult["originated_contracts"]),
      conseiljs.TezosParameterFormat.Micheline
    );
    groupid = result["operationGroupID"].replace(/"/g, "").replace(/\n/, ""); // clean up RPC output
    console.log(`Injected operation group id ${groupid}`);
    conseilResult = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
      config.conseilServer,
      config.network,
      groupid,
      2
    );
    console.log(
      `Originated swap contract at ${conseilResult["originated_contracts"]}`
    );
  } catch (err) {
    console.error(err);
  }
};

Deploy();
