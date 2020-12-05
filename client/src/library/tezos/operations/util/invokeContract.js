import { TezosOperationType } from "@airgap/beacon-sdk";
import { TezosConseilClient, TezosLanguageUtil } from "conseiljs";
import config from "../../../../globalConfig.json";
const invokeContract = (
  store,
  amtInMuTez,
  entry_point,
  parameters,
  extraGas = 300,
  extraStorage = 50,
  to = config.tezos.contractAddr
) => {
  return new Promise((resolve, reject) => {
    const operation = {
      kind: TezosOperationType.TRANSACTION,
      amount: amtInMuTez,
      destination: to,
      source: store.account,
      parameters: {
        entrypoint: entry_point,
        value: JSON.parse(
          TezosLanguageUtil.translateParameterMichelsonToMicheline(parameters)
        ),
      },
    };
    store.client
      .requestOperation({
        operationDetails: [operation],
      })
      .then((result) => {
        console.log(result);
        const groupid = result["transactionHash"]
          .replace(/"/g, "")
          .replace(/\n/, ""); // clean up RPC output
        return TezosConseilClient.awaitOperationConfirmation(
          config.tezos.conseilServer,
          config.tezos.network,
          groupid,
          1
        );
      })
      .then(resolve)
      .catch((err) => {
        console.log(err);
        resolve({ status: "error" });
      });
  });
};

export default invokeContract;
