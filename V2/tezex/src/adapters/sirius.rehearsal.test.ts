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

    const liquidityBurn = new BigNumber(1);
    const removeQuote = await adapter.estimateRemoveLiquidity(
      toolkit,
      liquidityBurn
    );
    expect(removeQuote.tokenAAmount.isPositive()).toBe(true);
    expect(removeQuote.tokenBAmount.isPositive()).toBe(true);
    await adapter.executeRemoveLiquidity(kit, USER_ADDRESS, liquidityBurn, 0.5);
    expect(entrypoints(captured[3])).toEqual(["removeLiquidity"]);

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
