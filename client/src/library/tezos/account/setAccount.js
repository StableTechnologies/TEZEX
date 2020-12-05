import { DAppClient, NetworkType } from "@airgap/beacon-sdk";

const setTezAccount = async () => {
  const client = new DAppClient({ name: "TEZEX" });
  const resp = await client.requestPermissions({
    network: { type: NetworkType.DELPHINET },
  });
  const account = await client.getActiveAccount();
  return { client, account: account["address"] };
};

export default setTezAccount;
