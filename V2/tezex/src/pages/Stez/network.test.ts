import {
  isWeeklynetAccount,
  resolveCurrentWeeklynet,
  TEZTNETS_DIRECTORY_URL,
} from "./network";

const response = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test("resolves the newest rotating Weeklynet and its matching faucet", async () => {
  jest.spyOn(global, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url === TEZTNETS_DIRECTORY_URL) {
      return response({
        "weeklynet-2026-07-29": {
          human_name: "Weeklynet",
          activated_on: "2026-07-29",
          rpc_url: "https://rpc.old.example",
          faucet_url: "https://faucet.old.example",
        },
        "weeklynet-2026-08-05": {
          human_name: "Weeklynet",
          activated_on: "2026-08-05",
          rpc_url: "https://rpc.current.example/",
          faucet_url: "https://faucet.current.example/",
        },
      });
    }
    if (url === "https://rpc.current.example/chains/main/chain_id") {
      return response("NetXmT6tP86uFqw");
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const network = await resolveCurrentWeeklynet();

  expect(network.key).toBe("weeklynet-2026-08-05");
  expect(network.rpcUrl).toBe("https://rpc.current.example");
  expect(network.faucetUrl).toBe("https://faucet.current.example");
  expect(network.chainId).toBe("NetXmT6tP86uFqw");
});

test("recognizes only a wallet permission for the resolved Weeklynet RPC", () => {
  const network = {
    key: "weeklynet-2026-08-05",
    name: "Weeklynet" as const,
    rpcUrl: "https://rpc.current.example",
    faucetUrl: "https://faucet.current.example",
    chainId: "NetXTest",
    activatedOn: "2026-08-05",
    info: {
      tezosServer: "https://rpc.current.example",
      rpcFallbacks: [],
      chainId: "NetXTest",
      pools: [],
      assets: [],
    },
  };

  expect(
    isWeeklynetAccount(
      { network: { type: "custom", rpcUrl: "https://rpc.current.example/" } },
      network
    )
  ).toBe(true);
  expect(
    isWeeklynetAccount(
      { network: { type: "custom", rpcUrl: "https://rpc.old.example" } },
      network
    )
  ).toBe(false);
});
