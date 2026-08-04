import { DAppClient } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import { ExecutionKit, Token, TokenType } from "../types/general";
import { PoolType, StablePoolConfig } from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";
import { StableSwapAdapter } from "./tezexStable";

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

const POOL_ADDRESS = "KT1-stable-pool";
const TOKEN_A_ADDRESS = "KT1-token-a";
const TOKEN_B_ADDRESS = "KT1-token-b";
const USER_ADDRESS = "tz1-user";

const poolConfig: StablePoolConfig = {
  id: "stable-test",
  name: "TEZEX",
  type: PoolType.STABLE,
  address: POOL_ADDRESS,
  tokenA: Token.USDtz,
  tokenB: Token.USDt,
  lpToken: Token.LP_USDtzUSDt,
  poolId: 3,
  tokenAIdx: 0,
  tokenBIdx: 1,
};

const makeInvocation = (
  destination: string,
  entrypoint: string,
  value: unknown
) => ({
  toTransferParams: () => ({
    to: destination,
    amount: 0,
    parameter: { entrypoint, value },
  }),
});

const makeHarness = () => {
  const poolMethods = {
    swap: jest.fn((value) => makeInvocation(POOL_ADDRESS, "swap", value)),
  };
  const tokenMethods = {
    approve: jest.fn((value) =>
      makeInvocation(TOKEN_A_ADDRESS, "approve", value)
    ),
    update_operators: jest.fn((value) =>
      makeInvocation(TOKEN_B_ADDRESS, "update_operators", value)
    ),
  };
  const poolContract = {
    methodsObject: poolMethods,
    storage: jest.fn().mockRejectedValue(new Error("refresh unavailable")),
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
    poolMethods,
    requestOperation,
  };
};

describe("StableSwapAdapter exact transaction construction", () => {
  beforeEach(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
    PoolRegistry.initializeFromConfig(
      [],
      [
        {
          name: Token.USDtz,
          label: "USDtz",
          logo: "",
          address: TOKEN_A_ADDRESS,
          decimals: 6,
          type: TokenType.FA12,
        },
        {
          name: Token.USDt,
          label: "USDt",
          logo: "",
          address: TOKEN_B_ADDRESS,
          decimals: 6,
          type: TokenType.FA2,
          tokenId: 9,
        },
      ]
    );
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("preserves a large FA2 amount and removes the operator atomically", async () => {
    const { kit, poolMethods, requestOperation } = makeHarness();
    const adapter = new StableSwapAdapter(poolConfig);

    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      Token.USDt,
      new BigNumber("9007199254740993"),
      new BigNumber("1000000"),
      0.5
    );

    expect(poolMethods.swap).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "9007199254740993",
        min_amount_out: "995000",
      })
    );
    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (operation: { parameters: { entrypoint: string } }) =>
          operation.parameters.entrypoint
      )
    ).toEqual(["update_operators", "swap", "update_operators"]);
    expect(operations[0].parameters.value[0]).toHaveProperty("add_operator");
    expect(operations[2].parameters.value[0]).toHaveProperty("remove_operator");
    expect(requestOperation).toHaveBeenCalledTimes(1);
  });
});
