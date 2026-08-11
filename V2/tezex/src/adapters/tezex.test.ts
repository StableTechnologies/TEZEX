import { DAppClient } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import { ExecutionKit, Token, TokenType } from "../types/general";
import { PoolConfig, PoolType } from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";
import { TezexAdapter } from "./tezex";

jest.mock("../functions/util", () => {
  const actual = jest.requireActual("../functions/util");
  return {
    ...actual,
    makeEstimationToolkit: () => ({
      estimate: {
        batch: jest.fn().mockRejectedValue(new Error("estimation unavailable")),
        transfer: jest
          .fn()
          .mockRejectedValue(new Error("estimation unavailable")),
      },
    }),
  };
});

const POOL_ADDRESS = "KT1-pool";
const TOKEN_ADDRESS = "KT1-token";
const USER_ADDRESS = "tz1-user";
const ETHtz = "ETHtz" as Token;

type TransferOptions = { amount?: number; mutez?: boolean };

const makeInvocation = (
  destination: string,
  entrypoint: string,
  value: unknown
) => ({
  toTransferParams: jest.fn((options: TransferOptions = {}) => ({
    to: destination,
    amount: options.amount ?? 0,
    mutez: options.mutez ?? false,
    parameter: { entrypoint, value },
  })),
});

const makeHarness = () => {
  const poolMethods = {
    tokenToXtz: jest.fn((value) =>
      makeInvocation(POOL_ADDRESS, "tokenToXtz", value)
    ),
  };
  const tokenMethods = {
    approve: jest.fn((value) =>
      makeInvocation(TOKEN_ADDRESS, "approve", value)
    ),
    update_operators: jest.fn((value) =>
      makeInvocation(TOKEN_ADDRESS, "update_operators", value)
    ),
  };
  const poolContract = {
    methodsObject: poolMethods,
    storage: jest.fn().mockResolvedValue({
      xtzPool: "1000000000",
      tokenPool: "1000000000",
      lqtTotal: "1000000",
    }),
  };
  const tokenContract = { methodsObject: tokenMethods };
  const contractAt = jest.fn(async (address: string) =>
    address === POOL_ADDRESS ? poolContract : tokenContract
  );
  const requestOperation = jest
    .fn()
    .mockResolvedValue({ transactionHash: "operation-hash" });
  const toolkit = {
    contract: { at: contractAt },
  } as unknown as TezosToolkit;
  const client = { requestOperation } as unknown as DAppClient;

  return {
    kit: { toolkit, client } as ExecutionKit,
    requestOperation,
    poolMethods,
    tokenMethods,
  };
};

const makePool = (tokenB: Token): PoolConfig => ({
  id: `xtz-${tokenB}`,
  name: "TEZEX",
  type: PoolType.TEZEX,
  address: POOL_ADDRESS,
  tokenA: Token.XTZ,
  tokenB,
  lpToken: Token.LP_XTZUSDt,
});

describe("TezexAdapter estimateSwap fee models", () => {
  beforeEach(() => {
    PoolDataCache.clear();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeEstimateHarness = (
    storage: Record<string, unknown>,
    views?: {
      get_fee_bp?: () => { read: () => Promise<unknown> };
    }
  ) => {
    const toolkit = {
      contract: {
        at: jest.fn().mockResolvedValue({
          storage: jest.fn().mockResolvedValue(storage),
          views: views ?? {},
        }),
      },
    } as unknown as TezosToolkit;
    return { toolkit, adapter: new TezexAdapter(makePool(Token.USDt)) };
  };

  const pools = {
    xtzPool: "1000000000",
    tokenPool: "2000000000",
    lqtTotal: "1000000",
  };
  const input = new BigNumber("1000000");

  it("prices base pools on gross input (997/1000)", async () => {
    const { toolkit, adapter } = makeEstimateHarness(pools);
    const { outputAmount } = await adapter.estimateSwap(
      toolkit,
      Token.XTZ,
      input
    );
    // (1e6 * 997 * 2e9) / (1e9 * 1000 + 1e6 * 997)
    expect(outputAmount.toFixed()).toBe("1992013");
    const data = await adapter.getPoolData(toolkit);
    expect(data.feeModel).toBe("base");
    expect(data.totalFeeBp).toBe(30);
    expect(data.lpFeeBp).toBe(30);
    expect(data.protocolFeeBp).toBe(0);
    expect(data.feeSource).toBe("fallback");
  });

  it("caches get_fee_bp plain nat for base on success", async () => {
    const read = jest.fn().mockResolvedValue(30);
    const { toolkit, adapter } = makeEstimateHarness(pools, {
      get_fee_bp: () => ({ read }),
    });
    const data = await adapter.getPoolData(toolkit);
    expect(read).toHaveBeenCalled();
    expect(data.feeModel).toBe("base");
    expect(data.feeSource).toBe("view");
    expect(data.lpFeeBp).toBe(30);
    expect(data.protocolFeeBp).toBe(0);
    expect(data.totalFeeBp).toBe(30);
  });

  it("prices new-mod on gross input (does not deduct protocol fee)", async () => {
    const { toolkit, adapter } = makeEstimateHarness({
      ...pools,
      protocol_fee_recipient: "tz1LovVc1JH3taNFjemXWCEywqgxhWsjfvRW",
      accumulated_protocol_fee_xtz: "0",
      accumulated_protocol_fee_token: "0",
    });
    const { outputAmount } = await adapter.estimateSwap(
      toolkit,
      Token.XTZ,
      input
    );
    expect(outputAmount.toFixed()).toBe("1992013");
    const data = await adapter.getPoolData(toolkit);
    expect(data.feeModel).toBe("new-mod");
    expect(data.protocolFeeBp).toBe(5);
    expect(data.lpFeeBp).toBe(25);
    expect(data.totalFeeBp).toBe(30);
    expect(data.feeSource).toBe("fallback");
  });

  it("caches get_fee_bp view fees for new-mod on success", async () => {
    const read = jest.fn().mockResolvedValue({ 0: 25, 1: { 0: 5, 1: 30 } });
    const { toolkit, adapter } = makeEstimateHarness(
      {
        ...pools,
        protocol_fee_recipient: "tz1LovVc1JH3taNFjemXWCEywqgxhWsjfvRW",
        accumulated_protocol_fee_xtz: "0",
        accumulated_protocol_fee_token: "0",
      },
      { get_fee_bp: () => ({ read }) }
    );
    const data = await adapter.getPoolData(toolkit);
    expect(read).toHaveBeenCalled();
    expect(data.feeSource).toBe("view");
    expect(data.lpFeeBp).toBe(25);
    expect(data.protocolFeeBp).toBe(5);
    expect(data.totalFeeBp).toBe(30);
  });

  it("falls back when get_fee_bp view fails for new-mod", async () => {
    const { toolkit, adapter } = makeEstimateHarness(
      {
        ...pools,
        protocol_fee_recipient: "tz1LovVc1JH3taNFjemXWCEywqgxhWsjfvRW",
        accumulated_protocol_fee_xtz: "0",
        accumulated_protocol_fee_token: "0",
      },
      {
        get_fee_bp: () => ({
          read: async () => {
            throw new Error("rpc view failed");
          },
        }),
      }
    );
    const data = await adapter.getPoolData(toolkit);
    expect(data.feeSource).toBe("fallback");
    expect(data.lpFeeBp).toBe(25);
    expect(data.protocolFeeBp).toBe(5);
    expect(data.totalFeeBp).toBe(30);
  });

  it("deducts protocol fee before AMM for legacy-mod", async () => {
    const { toolkit, adapter } = makeEstimateHarness({
      ...pools,
      protocol_fee_bp: 5,
    });
    const { outputAmount } = await adapter.estimateSwap(
      toolkit,
      Token.XTZ,
      input
    );
    // protocol = floor(1e6 * 5 / 10000) = 500; net = 999500
    // (999500 * 997 * 2e9) / (1e9 * 1000 + 999500 * 997)
    expect(outputAmount.toFixed()).toBe("1991018");
    const data = await adapter.getPoolData(toolkit);
    expect(data.feeModel).toBe("legacy-mod");
    expect(data.protocolFeeBp).toBe(5);
    expect(data.lpFeeBp).toBe(30);
    expect(data.totalFeeBp).toBe(35);
    expect(data.feeSource).toBe("fallback");
  });
});

describe("TezexAdapter exact transaction construction", () => {
  beforeEach(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("removes an FA2 operator after an exact token-to-XTZ swap", async () => {
    PoolRegistry.initializeFromConfig(
      [],
      [
        {
          name: Token.USDt,
          label: "USDt",
          logo: "",
          address: TOKEN_ADDRESS,
          decimals: 6,
          type: TokenType.FA2,
          tokenId: 7,
        },
      ]
    );
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new TezexAdapter(makePool(Token.USDt));

    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      Token.USDt,
      new BigNumber("9007199254740993"),
      new BigNumber("1000000"),
      0.5
    );

    expect(poolMethods.tokenToXtz).toHaveBeenCalledWith(
      expect.objectContaining({
        tokensSold: "9007199254740993",
        minXtzBought: "995000",
      })
    );
    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (operation: { parameters: { entrypoint: string } }) =>
          operation.parameters.entrypoint
      )
    ).toEqual(["update_operators", "tokenToXtz", "update_operators"]);
    expect(operations[0].parameters.value).toEqual([
      {
        add_operator: {
          owner: USER_ADDRESS,
          operator: POOL_ADDRESS,
          token_id: 7,
        },
      },
    ]);
    expect(operations[2].parameters.value).toEqual([
      {
        remove_operator: {
          owner: USER_ADDRESS,
          operator: POOL_ADDRESS,
          token_id: 7,
        },
      },
    ]);
    expect(requestOperation).toHaveBeenCalledTimes(1);
  });

  it("preserves a configured 18-decimal FA1.2 amount", async () => {
    PoolRegistry.initializeFromConfig(
      [],
      [
        {
          name: ETHtz,
          label: "ETHtz",
          logo: "",
          address: TOKEN_ADDRESS,
          decimals: 18,
          type: TokenType.FA12,
        },
      ]
    );
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new TezexAdapter(makePool(ETHtz));

    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      ETHtz,
      new BigNumber("1000000000000000001"),
      new BigNumber("1000000"),
      0.5
    );

    expect(poolMethods.tokenToXtz).toHaveBeenCalledWith(
      expect.objectContaining({ tokensSold: "1000000000000000001" })
    );
    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (operation: { parameters: { entrypoint: string } }) =>
          operation.parameters.entrypoint
      )
    ).toEqual(["approve", "approve", "tokenToXtz", "approve"]);
    expect(operations[0].parameters.value.value).toBe("0");
    expect(operations[1].parameters.value.value).toBe("1000000000000000001");
    expect(operations[3].parameters.value.value).toBe("0");
  });
});
