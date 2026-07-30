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
