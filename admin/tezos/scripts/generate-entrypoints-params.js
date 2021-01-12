const { TezosContractIntrospector } = require("conseiljs");
const config = require("../../config/tez-token-swap-config.json");
const init = require("../init");

const GenParams = async () => {
  try {
    await init();
    const ep = await TezosContractIntrospector.generateEntryPointsFromAddress(
      config.conseilServer,
      config.network,
      "KT1RxKJyi48W3bZR8HErRiisXZQw19HwLGWj"
    );
    ep.forEach((p, i) => {
      console.log(
        `\n${i + 1}. ${p.name}(${p.parameters
          .map((pp) => (pp.name || "unnamed") + "/" + pp.type)
          .join(", ")})`
      );
      console.log(p.generateSampleInvocation());
    });
  } catch (err) {
    console.error(err);
  }
};
GenParams();
