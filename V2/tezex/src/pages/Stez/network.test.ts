import {
  isSnetAccount,
  resolveSnet,
  SNET_CHAIN_ID,
  SNET_FAUCET_URL,
  SNET_RPC_URL,
} from "./network";

test("resolves the stable Snet configuration", async () => {
  const network = await resolveSnet();

  expect(network.key).toBe("snet");
  expect(network.name).toBe("Snet");
  expect(network.rpcUrl).toBe(SNET_RPC_URL);
  expect(network.faucetUrl).toBe(SNET_FAUCET_URL);
  expect(network.chainId).toBe(SNET_CHAIN_ID);
  expect(network.info.tezosServer).toBe(SNET_RPC_URL);
});

test("recognizes only a wallet permission for the Snet RPC", async () => {
  const network = await resolveSnet();

  expect(
    isSnetAccount(
      { network: { type: "custom", rpcUrl: `${SNET_RPC_URL}/` } },
      network
    )
  ).toBe(true);
  expect(
    isSnetAccount(
      {
        network: {
          type: "custom",
          rpcUrl: "https://rpc.weeklynet.example",
        },
      },
      network
    )
  ).toBe(false);
  expect(
    isSnetAccount(
      { network: { type: "mainnet", rpcUrl: SNET_RPC_URL } },
      network
    )
  ).toBe(false);
});
