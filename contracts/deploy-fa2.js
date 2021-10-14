const conseiljs = require("conseiljs");
const config = require("./config.json");
const log = require("loglevel");
const conSign = require("conseiljs-softsigner");
const fetch = require("node-fetch");
const bigInt = require("big-integer");
const tezConfig = require("./tezos/build/FA2_comp/step_000_cont_0_contract.json");

const trim = (obj) => {
  const str = JSON.stringify(obj);
  const temp = str
    .replace(" ", "")
    .replace(/\\"/g, '"')
    .replace(/[\n\t\r]/, "");
  return temp;
};

const init = async () => {
  const logger = log.getLogger("conseiljs");
  logger.setLevel("error", false);
  const store = {};
  store.keyStore = await conSign.KeyStoreUtils.restoreIdentityFromSecretKey(
    config.tezos.privateKey
  );
  store.signer = await conSign.SoftSigner.createSigner(
    conseiljs.TezosMessageUtils.writeKeyWithHint(
      store.keyStore.secretKey,
      "edsk"
    )
  );
  conseiljs.registerFetch(fetch);
  conseiljs.registerLogger(logger);
  return store;
};

const deployTokenContract = async (code, storage, store) => {
  const fee = await conseiljs.TezosNodeWriter.testContractDeployOperation(
    config.tezos.RPC,
    config.tezos.chain_id,
    store.keyStore,
    0,
    undefined,
    100000,
    10000,
    20000,
    trim(code),
    conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
    conseiljs.TezosParameterFormat.Micheline
  );
  const result =
    await conseiljs.TezosNodeWriter.sendContractOriginationOperation(
      config.tezos.RPC,
      store.signer,
      store.keyStore,
      0,
      undefined,
      fee["estimatedFee"],
      fee["storageCost"],
      fee["gas"],
      trim(code),
      conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
      conseiljs.TezosParameterFormat.Micheline,
      conseiljs.TezosConstants.HeadBranchOffset,
      true
    );
  const groupid = result["operationGroupID"]
    .replace(/"/g, "")
    .replace(/\n/, ""); // clean up RPC output
  console.log(`Injected operation group id ${groupid}`);
  const conseilResult =
    await conseiljs.TezosConseilClient.awaitOperationConfirmation(
      config.tezos.conseilServer,
      config.tezos.conseilServer.network,
      groupid,
      2
    );
  return conseilResult["originated_contracts"];
};

async function mintMinimumBalance(store, contractAddress) {
  const result = await conseiljs.TezosNodeWriter.sendContractInvocationOperation(
    config.tezos.RPC,
    store.signer,
    store.keyStore,
    contractAddress,
    0,
    105000,
    6050,
    1000500,
    "mint",
    `(Pair (Pair "${store.keyStore.publicKeyHash}" ${bigInt(500000)
      .multiply(10 ** 8)
      .toString()}) (Pair {Elt "decimals" 0x32; Elt "name" 0x54686520546f6b656e205a65726f; Elt "symbol" 0x544b30} 0))`,
    conseiljs.TezosParameterFormat.Michelson,
    conseiljs.TezosConstants.HeadBranchOffset,
    true
  );
  const groupid = result["operationGroupID"]
          .replace(/"/g, "")
          .replace(/\n/, "");
  console.log(`Injected operation group id ${groupid}`);
  const opRes = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
    config.tezos.conseilServer,
    config.tezos.conseilServer.network,
    groupid,
    2
  );
  if (opRes.status != "applied") {
    throw new Error("tx failed : " + JSON.stringify(opRes));
  }
  console.log("Successful Mint");
}

const deploy = async () => {
  const store = await init();
  const contract = await deployTokenContract(tezConfig,
    `(Pair (Pair "${store.keyStore.publicKeyHash}" (Pair 0 {})) (Pair (Pair {Elt "" 0x68747470733a2f2f6578616d706c652e636f6d} {}) (Pair False {})))`,store);
  console.log("deployed contract : ", contract)
  await mintMinimumBalance(store, contract);
};

deploy();
