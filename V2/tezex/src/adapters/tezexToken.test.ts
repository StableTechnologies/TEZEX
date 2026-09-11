import { DAppClient } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import { ExecutionKit, Token, TokenType } from "../types/general";
import { PoolConfig, PoolType } from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";
import { TezexTokenAdapter } from "./tezexToken";

jest.mock("../functions/util", () => {
  const actual = jest.requireActual("../functions/util");
  return {
    ...actual,
    makeEstimationToolkit: () => ({
      estimate: {
        batch: jest.fn().mockRejectedValue(new Error("estimation unavailable")),
      },
    }),
  };
});

const POOL = "KT1-token-pool";
const USDt = "KT1-usdt";
const TZBTC = "KT1-tzbtc";
const USER = "tz1-user";

const poolConfig: PoolConfig = {
  id: "usdt-tzbtc-tezex",
  name: "TEZEX",
  type: PoolType.TEZEX_TOKEN,
  address: POOL,
  tokenA: Token.USDt,
  tokenB: Token.TzBTC,
  lpToken: Token.LP_USDtTzBTC,
};

const invocation = (to: string, entrypoint: string, value: unknown) => ({
  toTransferParams: jest.fn(() => ({
    to,
    amount: 0,
    parameter: { entrypoint, value },
  })),
});

const makeHarness = () => {
  const poolMethods = {
    swap: jest.fn((value) => invocation(POOL, "swap", value)),
    add_liquidity: jest.fn((value) => invocation(POOL, "add_liquidity", value)),
    remove_liquidity: jest.fn((value) =>
      invocation(POOL, "remove_liquidity", value)
    ),
  };
  const fa2Methods = {
    update_operators: jest.fn((value) =>
      invocation(USDt, "update_operators", value)
    ),
  };
  const fa12Methods = {
    approve: jest.fn((value) => invocation(TZBTC, "approve", value)),
  };
  const poolContract = {
    methodsObject: poolMethods,
    storage: jest.fn().mockResolvedValue({
      reserve_a: "99999500",
      reserve_b: "128000",
      lqt_total: "3577699",
    }),
  };
  const contractAt = jest.fn(async (address: string) => {
    if (address === POOL) return poolContract;
    if (address === USDt) return { methodsObject: fa2Methods };
    return { methodsObject: fa12Methods };
  });
  const requestOperation = jest
    .fn()
    .mockResolvedValue({ transactionHash: "operation-hash" });
  const toolkit = { contract: { at: contractAt } } as unknown as TezosToolkit;
  const client = { requestOperation } as unknown as DAppClient;

  return {
    adapter: new TezexTokenAdapter(poolConfig),
    kit: { toolkit, client } as ExecutionKit,
    toolkit,
    requestOperation,
    poolMethods,
  };
};

describe("TezexTokenAdapter", () => {
  beforeEach(() => {
    PoolRegistry.clear();
    PoolDataCache.clear();
    PoolRegistry.initializeFromConfig(
      [poolConfig],
      [
        {
          name: Token.USDt,
          label: "USDt",
          logo: "",
          address: USDt,
          decimals: 6,
          type: TokenType.FA2,
          tokenId: 0,
        },
        {
          name: Token.TzBTC,
          label: "tzBTC",
          logo: "",
          address: TZBTC,
          decimals: 8,
          type: TokenType.FA12,
        },
        {
          name: Token.LP_USDtTzBTC,
          label: "LP",
          logo: "",
          address: "KT1-lp",
          decimals: 7,
          type: TokenType.FA12,
        },
      ]
    );
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("quotes both directions with the contract's immutable 30 bp fee", async () => {
    const { adapter, toolkit } = makeHarness();
    const aToB = await adapter.estimateSwap(
      toolkit,
      Token.USDt,
      new BigNumber("1000000")
    );
    const bToA = await adapter.estimateSwap(
      toolkit,
      Token.TzBTC,
      new BigNumber("1000")
    );

    expect(aToB.outputAmount.toFixed()).toBe("1263");
    expect(bToA.outputAmount.toFixed()).toBe("772882");
    await expect(adapter.getPoolData(toolkit)).resolves.toMatchObject({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
    });
  });

  it("calculates proportional deposits, minted LQT, and withdrawals", async () => {
    const { adapter, toolkit } = makeHarness();
    const amountA = new BigNumber("10000000");
    const amountB = await adapter.calculateRequiredTokenForLiquidity(
      toolkit,
      Token.USDt,
      amountA
    );
    const add = await adapter.estimateAddLiquidity(
      toolkit,
      Token.USDt,
      amountA,
      amountB
    );
    const remove = await adapter.estimateRemoveLiquidity(
      toolkit,
      new BigNumber("100000")
    );

    expect(amountB.toFixed()).toBe("12801");
    expect(add.lpTokenAmount.toFixed()).toBe("357771");
    expect(remove.tokenAAmount.toFixed()).toBe("2795078");
    expect(remove.tokenBAmount.toFixed()).toBe("3577");

    const reversed = await adapter.estimateAddLiquidity(
      toolkit,
      Token.TzBTC,
      amountB,
      amountA
    );
    expect(reversed.lpTokenAmount.toFixed()).toBe(add.lpTokenAmount.toFixed());
    expect(reversed.tokenAAmount.toFixed()).toBe(amountA.toFixed());
    expect(reversed.tokenBAmount.toFixed()).toBe(amountB.toFixed());
  });

  it("installs and removes the FA2 operator around an A-to-B swap", async () => {
    const { adapter, kit, requestOperation, poolMethods } = makeHarness();
    await adapter.executeSwap(
      kit,
      USER,
      Token.USDt,
      new BigNumber("1000000"),
      new BigNumber("1200"),
      0.5
    );

    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (op: { parameters: { entrypoint: string } }) => op.parameters.entrypoint
      )
    ).toEqual(["update_operators", "swap", "update_operators"]);
    expect(poolMethods.swap).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: { a_to_b: undefined },
        amount_in: "1000000",
        min_amount_out: "1194",
        receiver: USER,
      })
    );
  });

  it("uses strict FA1.2 reset/approve/reset boundaries for B-to-A swaps", async () => {
    const { adapter, kit, requestOperation, poolMethods } = makeHarness();
    await adapter.executeSwap(
      kit,
      USER,
      Token.TzBTC,
      new BigNumber("1000"),
      new BigNumber("700000"),
      1
    );

    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (op: { parameters: { entrypoint: string } }) => op.parameters.entrypoint
      )
    ).toEqual(["approve", "approve", "swap", "approve"]);
    expect(poolMethods.swap).toHaveBeenCalledWith(
      expect.objectContaining({ direction: { b_to_a: undefined } })
    );
  });

  it("bounds both deposits and cleans up both token permissions", async () => {
    const { adapter, kit, requestOperation, poolMethods } = makeHarness();
    await adapter.executeAddLiquidity(
      kit,
      USER,
      new BigNumber("10000000"),
      new BigNumber("12801"),
      new BigNumber("357769"),
      0.5
    );

    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (op: { parameters: { entrypoint: string } }) => op.parameters.entrypoint
      )
    ).toEqual([
      "approve",
      "update_operators",
      "approve",
      "add_liquidity",
      "update_operators",
      "approve",
    ]);
    expect(poolMethods.add_liquidity).toHaveBeenCalledWith(
      expect.objectContaining({
        max_amount_a: "10000000",
        max_amount_b: "12801",
        min_lqt_minted: "355980",
        receiver: USER,
      })
    );
  });

  it("submits bounded token-pair liquidity removal", async () => {
    const { adapter, kit, requestOperation, poolMethods } = makeHarness();
    await adapter.executeRemoveLiquidity(
      kit,
      USER,
      new BigNumber("100000"),
      1,
      new BigNumber("2795084"),
      new BigNumber("3577")
    );

    expect(requestOperation.mock.calls[0][0].operationDetails).toHaveLength(1);
    expect(poolMethods.remove_liquidity).toHaveBeenCalledWith(
      expect.objectContaining({
        lqt_burned: "100000",
        min_amount_a: "2767133",
        min_amount_b: "3541",
        receiver: USER,
      })
    );
  });
});
