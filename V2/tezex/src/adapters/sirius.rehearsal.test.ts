import { DAppClient } from "@airgap/beacon-dapp";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import mainnet from "../config/network/mainnet.json";
import { Asset, ExecutionKit, Token } from "../types/general";
import { PoolConfig } from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";
import { SiriusAdapter } from "./sirius";

type BeaconOperation = {
  amount?: string;
  destination?: string;
  parameters?: {
    entrypoint?: string;
  };
};

type BeaconRequest = {
  operationDetails: BeaconOperation[];
};

const USER_ADDRESS = "tz1burnburnburnburnburnburnburjAYjjX";

const liveConfig = mainnet as unknown as {
  tezosServer: string;
  chainId: string;
  pools: PoolConfig[];
  assets: Asset[];
};

const pool = liveConfig.pools.find(
  (candidate) => candidate.id === "xtz-tzbtc-sirius"
);

if (!pool) {
  throw new Error("Canonical Sirius pool is missing from mainnet config");
}

const entrypoints = (request: BeaconRequest): Array<string | undefined> =>
  request.operationDetails.map((operation) => operation.parameters?.entrypoint);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const flattenCombPair = (value: unknown): unknown[] => {
  const node = asRecord(value);
  if (node?.prim !== "Pair" || !Array.isArray(node.args)) return [value];
  return node.args.flatMap(flattenCombPair);
};

const assertConfiguredChainId = (actual: string, expected: string): void => {
  if (actual !== expected) {
    throw new Error(
      `Sirius rehearsal chain mismatch: expected ${expected}, received ${actual}`
    );
  }
};

const assertRawStorageAddresses = (
  storage: unknown,
  expectedTokenAddress: string,
  expectedLqtAddress: string
): void => {
  const fields = flattenCombPair(storage);
  const tokenAddress = asRecord(fields[3])?.string;
  const lqtAddress = asRecord(fields[4])?.string;

  if (fields.length !== 5 || typeof tokenAddress !== "string") {
    throw new Error("Sirius raw storage has an unexpected token address shape");
  }
  if (typeof lqtAddress !== "string") {
    throw new Error("Sirius raw storage has an unexpected SIRS address shape");
  }
  if (tokenAddress !== expectedTokenAddress) {
    throw new Error(
      `Sirius raw storage token mismatch: expected ${expectedTokenAddress}, received ${tokenAddress}`
    );
  }
  if (lqtAddress !== expectedLqtAddress) {
    throw new Error(
      `Sirius raw storage SIRS mismatch: expected ${expectedLqtAddress}, received ${lqtAddress}`
    );
  }
};

const assertOperationDestinations = (
  request: BeaconRequest,
  expected: string[]
): void => {
  const actual = request.operationDetails.map(
    (operation) => operation.destination
  );
  const matches =
    actual.length === expected.length &&
    actual.every((destination, index) => destination === expected[index]);

  if (!matches) {
    throw new Error(
      `Sirius operation destination mismatch: expected ${expected.join(
        ","
      )}, received ${actual.join(",")}`
    );
  }
};

const requireAssetAddress = (token: Token): string => {
  const address = liveConfig.assets.find(
    (asset) => asset.name === token
  )?.address;
  if (!address) {
    throw new Error(`Canonical ${token} asset is missing from mainnet config`);
  }
  return address;
};

describe("Sirius rehearsal boundary validation", () => {
  const rawStorage = {
    prim: "Pair",
    args: [
      { int: "1" },
      { int: "2" },
      { int: "3" },
      { string: "KT1-token" },
      { string: "KT1-sirs" },
    ],
  };

  it("rejects a response from the wrong chain", () => {
    expect(() =>
      assertConfiguredChainId("NetXWrongChain", "NetXExpectedChain")
    ).toThrow(/chain mismatch/i);
  });

  it("rejects mismatched raw storage addresses", () => {
    expect(() =>
      assertRawStorageAddresses(rawStorage, "KT1-other-token", "KT1-sirs")
    ).toThrow(/token mismatch/i);
    expect(() =>
      assertRawStorageAddresses(rawStorage, "KT1-token", "KT1-other-sirs")
    ).toThrow(/SIRS mismatch/i);
  });

  it("rejects an operation sent to the wrong destination", () => {
    expect(() =>
      assertOperationDestinations(
        { operationDetails: [{ destination: "KT1-wrong" }] },
        ["KT1-pool"]
      )
    ).toThrow(/destination mismatch/i);
  });
});

const describeLiveRehearsal =
  process.env.RUN_SIRIUS_MAINNET_REHEARSAL === "1" ? describe : describe.skip;

describeLiveRehearsal("Sirius live no-broadcast release rehearsal", () => {
  jest.setTimeout(120000);

  beforeAll(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
    PoolRegistry.initializeFromConfig([], liveConfig.assets);
  });

  afterAll(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("constructs every protected mainnet operation path without broadcasting", async () => {
    const toolkit = new TezosToolkit(liveConfig.tezosServer);
    const tokenAddress = requireAssetAddress(pool.tokenB);
    const lqtAddress = requireAssetAddress(pool.lpToken);
    assertConfiguredChainId(await toolkit.rpc.getChainId(), liveConfig.chainId);
    assertRawStorageAddresses(
      await toolkit.rpc.getStorage(pool.address),
      tokenAddress,
      lqtAddress
    );

    const captured: BeaconRequest[] = [];
    const requestOperation = jest.fn(async (request: BeaconRequest) => {
      captured.push(request);
      return { transactionHash: "no-broadcast-rehearsal" };
    });
    const kit = {
      toolkit,
      client: { requestOperation } as unknown as DAppClient,
    } as ExecutionKit;
    const adapter = new SiriusAdapter(pool);

    const poolData = await adapter.getPoolData(toolkit, true);
    expect(poolData.tokenAPool.isPositive()).toBe(true);
    expect(poolData.tokenBPool.isPositive()).toBe(true);
    expect(poolData.lpTokenSupply.isPositive()).toBe(true);

    const xtzInput = new BigNumber(1000000);
    const xtzSwap = await adapter.estimateSwap(toolkit, Token.XTZ, xtzInput);
    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      Token.XTZ,
      xtzInput,
      xtzSwap.outputAmount,
      0.5
    );
    expect(entrypoints(captured[0])).toEqual(["xtzToToken"]);
    assertOperationDestinations(captured[0], [pool.address]);

    const tokenInput = new BigNumber(1000);
    const tokenSwap = await adapter.estimateSwap(
      toolkit,
      Token.TzBTC,
      tokenInput
    );
    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      Token.TzBTC,
      tokenInput,
      tokenSwap.outputAmount,
      0.5
    );
    expect(entrypoints(captured[1])).toEqual([
      "approve",
      "approve",
      "tokenToXtz",
      "approve",
    ]);
    assertOperationDestinations(captured[1], [
      tokenAddress,
      tokenAddress,
      pool.address,
      tokenAddress,
    ]);

    const liquidityXtz = new BigNumber(1000000);
    const liquidityToken = await adapter.calculateRequiredTokenForLiquidity(
      toolkit,
      Token.XTZ,
      liquidityXtz
    );
    const addQuote = await adapter.estimateAddLiquidity(
      toolkit,
      Token.XTZ,
      liquidityXtz,
      liquidityToken
    );
    await adapter.executeAddLiquidity(
      kit,
      USER_ADDRESS,
      liquidityXtz,
      liquidityToken,
      addQuote.lpTokenAmount,
      0.5
    );
    expect(entrypoints(captured[2])).toEqual([
      "approve",
      "approve",
      "addLiquidity",
      "approve",
    ]);
    assertOperationDestinations(captured[2], [
      tokenAddress,
      tokenAddress,
      pool.address,
      tokenAddress,
    ]);

    const liquidityBurn = new BigNumber(1);
    const removeQuote = await adapter.estimateRemoveLiquidity(
      toolkit,
      liquidityBurn
    );
    expect(removeQuote.tokenAAmount.isPositive()).toBe(true);
    expect(removeQuote.tokenBAmount.isPositive()).toBe(true);
    await adapter.executeRemoveLiquidity(kit, USER_ADDRESS, liquidityBurn, 0.5);
    expect(entrypoints(captured[3])).toEqual(["removeLiquidity"]);
    assertOperationDestinations(captured[3], [pool.address]);

    expect(requestOperation).toHaveBeenCalledTimes(4);
  });

  it("propagates wallet rejection without a second cleanup request", async () => {
    const toolkit = new TezosToolkit(liveConfig.tezosServer);
    const requestOperation = jest.fn(async () => {
      throw new Error("wallet rejected");
    });
    const kit = {
      toolkit,
      client: { requestOperation } as unknown as DAppClient,
    } as ExecutionKit;
    const adapter = new SiriusAdapter(pool);
    const tokenInput = new BigNumber(1000);
    const quote = await adapter.estimateSwap(toolkit, Token.TzBTC, tokenInput);

    await expect(
      adapter.executeSwap(
        kit,
        USER_ADDRESS,
        Token.TzBTC,
        tokenInput,
        quote.outputAmount,
        0.5
      )
    ).rejects.toThrow("wallet rejected");
    expect(requestOperation).toHaveBeenCalledTimes(1);
  });
});
