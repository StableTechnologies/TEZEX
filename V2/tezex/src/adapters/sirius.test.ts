import { DAppClient } from "@airgap/beacon-dapp";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import mainnet from "../config/network/mainnet.json";
import { ExecutionKit, Token, TokenType } from "../types/general";
import { PoolConfig, PoolType } from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";
import { SiriusAdapter } from "./sirius";

const POOL_ADDRESS = "KT1-sirius-pool";
const TOKEN_ADDRESS = "KT1-tzbtc-token";
const USER_ADDRESS = "tz1-user";

const poolConfig: PoolConfig = {
  id: "sirius-test",
  name: "Sirius",
  type: PoolType.SIRIUS,
  address: POOL_ADDRESS,
  tokenA: Token.XTZ,
  tokenB: Token.TzBTC,
  lpToken: Token.Sirs,
};

const auditedSnapshot = {
  xtzPool: "4210300907572",
  tokenPool: "1356293834",
  lqtTotal: "27188438",
};

const integerModel = {
  xtzToToken(input: string): string {
    const xtzIn = BigInt(input);
    const xtzPool = BigInt(auditedSnapshot.xtzPool);
    const tokenPool = BigInt(auditedSnapshot.tokenPool);
    const fee = BigInt(999);
    const scale = BigInt(1000);
    const amountNetBurn = (xtzIn * fee) / scale;
    return (
      (amountNetBurn * fee * tokenPool) /
      (xtzPool * scale + amountNetBurn * fee)
    ).toString();
  },
  tokenToXtz(input: string): string {
    const tokenIn = BigInt(input);
    const xtzPool = BigInt(auditedSnapshot.xtzPool);
    const tokenPool = BigInt(auditedSnapshot.tokenPool);
    const fee = BigInt(999);
    const scale = BigInt(1000);
    const grossXtz =
      (tokenIn * fee * xtzPool) / (tokenPool * scale + tokenIn * fee);
    return ((grossXtz * fee) / scale).toString();
  },
};

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
    xtzToToken: jest.fn((value) =>
      makeInvocation(POOL_ADDRESS, "xtzToToken", value)
    ),
    tokenToXtz: jest.fn((value) =>
      makeInvocation(POOL_ADDRESS, "tokenToXtz", value)
    ),
    addLiquidity: jest.fn((value) =>
      makeInvocation(POOL_ADDRESS, "addLiquidity", value)
    ),
    removeLiquidity: jest.fn((value) =>
      makeInvocation(POOL_ADDRESS, "removeLiquidity", value)
    ),
  };
  const tokenMethods = {
    approve: jest.fn((value) =>
      makeInvocation(TOKEN_ADDRESS, "approve", value)
    ),
  };
  const storage = jest.fn().mockResolvedValue(auditedSnapshot);
  const poolContract = { methodsObject: poolMethods, storage };
  const tokenContract = { methodsObject: tokenMethods };
  const contractAt = jest.fn(async (address: string) =>
    address === POOL_ADDRESS ? poolContract : tokenContract
  );
  const walletAt = jest.fn().mockResolvedValue(poolContract);
  const requestOperation = jest
    .fn()
    .mockResolvedValue({ transactionHash: "operation-hash" });
  const toolkit = {
    contract: { at: contractAt },
    wallet: { at: walletAt },
  } as unknown as TezosToolkit;
  const client = { requestOperation } as unknown as DAppClient;

  return {
    toolkit,
    kit: { toolkit, client } as ExecutionKit,
    contractAt,
    walletAt,
    requestOperation,
    poolMethods,
    tokenMethods,
    storage,
  };
};

describe("SiriusAdapter", () => {
  beforeEach(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
    PoolRegistry.initializeFromConfig(
      [],
      [
        {
          name: Token.TzBTC,
          label: "tzBTC",
          logo: "",
          address: TOKEN_ADDRESS,
          decimals: 8,
          type: TokenType.FA12,
        },
      ]
    );
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [Token.XTZ, "3112", "1"],
    [Token.XTZ, "1000000", "321"],
    [Token.XTZ, "1000000000", "321416"],
    [Token.TzBTC, "1", "3097"],
    [Token.TzBTC, "100", "309805"],
    [Token.TzBTC, "1000000", "3095783319"],
  ])(
    "matches Michelson floor order for %s input %s",
    async (inputToken, input, expectedOutput) => {
      const { toolkit } = makeHarness();
      const adapter = new SiriusAdapter(poolConfig);

      const estimate = await adapter.estimateSwap(
        toolkit,
        inputToken,
        new BigNumber(input)
      );

      expect(estimate.outputAmount.toFixed()).toBe(expectedOutput);
    }
  );

  it("rejects a swap whose exact chain output rounds to zero", async () => {
    const { toolkit } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.estimateSwap(toolkit, Token.XTZ, new BigNumber(3111))
    ).rejects.toThrow(/swap output must be a positive integer/i);
  });

  it("matches a literal integer model across deterministic input sweeps", async () => {
    const { toolkit } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    for (let index = 0; index < 128; index += 1) {
      const xtzInput = (3112 + index * 7919).toString();
      const tokenInput = (1 + index * 6151).toString();
      const xtzEstimate = await adapter.estimateSwap(
        toolkit,
        Token.XTZ,
        new BigNumber(xtzInput)
      );
      const tokenEstimate = await adapter.estimateSwap(
        toolkit,
        Token.TzBTC,
        new BigNumber(tokenInput)
      );

      expect(xtzEstimate.outputAmount.toFixed()).toBe(
        integerModel.xtzToToken(xtzInput)
      );
      expect(tokenEstimate.outputAmount.toFixed()).toBe(
        integerModel.tokenToXtz(tokenInput)
      );
    }
  });

  it("rejects unsupported assets before reading pool state", async () => {
    const { toolkit, contractAt } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.estimateSwap(toolkit, Token.BTCtz, new BigNumber(1000))
    ).rejects.toThrow(/unsupported Sirius input token/i);
    expect(contractAt).not.toHaveBeenCalled();
  });

  it("matches liquidity mint, requirement, and withdrawal floors", async () => {
    const { toolkit } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    const requiredToken = await adapter.calculateRequiredTokenForLiquidity(
      toolkit,
      Token.XTZ,
      new BigNumber(1000000)
    );
    const requiredXtz = await adapter.calculateRequiredTokenForLiquidity(
      toolkit,
      Token.TzBTC,
      new BigNumber(323)
    );
    expect(requiredToken.toFixed()).toBe("323");
    expect(requiredXtz.toFixed()).toBe("1002678");

    const add = await adapter.estimateAddLiquidity(
      toolkit,
      Token.XTZ,
      new BigNumber(1000000),
      new BigNumber(323)
    );
    expect(add.lpTokenAmount.toFixed()).toBe("6");

    const remove = await adapter.estimateRemoveLiquidity(
      toolkit,
      new BigNumber(1000)
    );
    expect(remove.tokenAAmount.toFixed()).toBe("154856299");
    expect(remove.tokenBAmount.toFixed()).toBe("49884");
  });

  it("rejects a liquidity deposit that would mint zero SIRS", async () => {
    const { toolkit } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.estimateAddLiquidity(
        toolkit,
        Token.XTZ,
        new BigNumber(1),
        new BigNumber(1)
      )
    ).rejects.toThrow(/SIRS minted must be a positive integer/i);
  });

  it("caches storage reads but honors an explicit refresh", async () => {
    const { toolkit, storage } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await adapter.getPoolData(toolkit);
    await adapter.getPoolData(toolkit);
    expect(storage).toHaveBeenCalledTimes(1);

    await adapter.getPoolData(toolkit, true);
    expect(storage).toHaveBeenCalledTimes(2);
  });

  it("submits a protected direct XTZ-to-token swap", async () => {
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.executeSwap(
        kit,
        USER_ADDRESS,
        Token.XTZ,
        new BigNumber(1000000),
        new BigNumber(321),
        0.5
      )
    ).resolves.toBe("operation-hash");

    expect(poolMethods.xtzToToken).toHaveBeenCalledWith(
      expect.objectContaining({
        to: USER_ADDRESS,
        minTokensBought: 319,
      })
    );
    const operation = requestOperation.mock.calls[0][0].operationDetails[0];
    expect(operation.amount).toBe("1000000");
    expect(operation.parameters.entrypoint).toBe("xtzToToken");
  });

  it("keeps token approval reset, swap, and cleanup in one wallet batch", async () => {
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await adapter.executeSwap(
      kit,
      USER_ADDRESS,
      Token.TzBTC,
      new BigNumber(1),
      new BigNumber(3097),
      0.5
    );

    expect(poolMethods.tokenToXtz).toHaveBeenCalledWith(
      expect.objectContaining({
        to: USER_ADDRESS,
        tokensSold: 1,
        minXtzBought: 3081,
      })
    );
    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (op: { parameters: { entrypoint: string } }) => op.parameters.entrypoint
      )
    ).toEqual(["approve", "approve", "tokenToXtz", "approve"]);
    expect(operations[0].parameters.value.value).toBe(0);
    expect(operations[1].parameters.value.value).toBe(1);
    expect(operations[3].parameters.value.value).toBe(0);
  });

  it("applies slippage to both maximum tzBTC and minimum SIRS", async () => {
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await adapter.executeAddLiquidity(
      kit,
      USER_ADDRESS,
      new BigNumber(1000000),
      new BigNumber(500),
      new BigNumber(1000),
      0.5
    );

    expect(poolMethods.addLiquidity).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: USER_ADDRESS,
        minLqtMinted: 995,
        maxTokensDeposited: 502,
      })
    );
    const operations = requestOperation.mock.calls[0][0].operationDetails;
    expect(
      operations.map(
        (op: { parameters: { entrypoint: string } }) => op.parameters.entrypoint
      )
    ).toEqual(["approve", "approve", "addLiquidity", "approve"]);
    expect(operations[2].amount).toBe("1000000");
  });

  it("rejects add-liquidity when slippage would reduce minimum SIRS to zero", async () => {
    const { kit, requestOperation, contractAt } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.executeAddLiquidity(
        kit,
        USER_ADDRESS,
        new BigNumber(1000000),
        new BigNumber(500),
        new BigNumber(1),
        0.1
      )
    ).rejects.toThrow(/minimum SIRS minted must be a positive integer/i);
    expect(contractAt).not.toHaveBeenCalled();
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it("floors both remove-liquidity outputs before applying slippage", async () => {
    const { kit, requestOperation, poolMethods } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await adapter.executeRemoveLiquidity(
      kit,
      USER_ADDRESS,
      new BigNumber(1000),
      0.5
    );

    expect(poolMethods.removeLiquidity).toHaveBeenCalledWith(
      expect.objectContaining({
        to: USER_ADDRESS,
        lqtBurned: 1000,
        minXtzWithdrawn: 154082017,
        minTokensWithdrawn: 49634,
      })
    );
    expect(requestOperation).toHaveBeenCalledTimes(1);
  });

  it("propagates a rejected atomic batch without attempting cleanup separately", async () => {
    const { kit, requestOperation } = makeHarness();
    requestOperation.mockRejectedValueOnce(new Error("wallet rejected"));
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.executeAddLiquidity(
        kit,
        USER_ADDRESS,
        new BigNumber(1000000),
        new BigNumber(500),
        new BigNumber(1000),
        0.5
      )
    ).rejects.toThrow("wallet rejected");

    expect(requestOperation).toHaveBeenCalledTimes(1);
    expect(requestOperation.mock.calls[0][0].operationDetails).toHaveLength(4);
  });

  it("rejects a zero minimum after slippage before asking the wallet", async () => {
    const { kit, requestOperation, contractAt } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.executeSwap(
        kit,
        USER_ADDRESS,
        Token.XTZ,
        new BigNumber(3112),
        new BigNumber(1),
        0.1
      )
    ).rejects.toThrow(/minimum swap output must be a positive integer/i);
    expect(contractAt).not.toHaveBeenCalled();
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it("rejects unsafe slippage and inexact JavaScript contract parameters", async () => {
    const { kit, requestOperation } = makeHarness();
    const adapter = new SiriusAdapter(poolConfig);

    await expect(
      adapter.executeSwap(
        kit,
        USER_ADDRESS,
        Token.XTZ,
        new BigNumber(1000000),
        new BigNumber(321),
        10
      )
    ).rejects.toThrow(/slippage tolerance is outside safe limits/i);
    await expect(
      adapter.executeSwap(
        kit,
        USER_ADDRESS,
        Token.XTZ,
        new BigNumber("9007199254740992"),
        new BigNumber(321),
        0.5
      )
    ).rejects.toThrow(/exceeds the exact JavaScript integer range/i);
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it("pins the canonical mainnet pool and asset configuration", () => {
    const sirius = mainnet.pools.find((pool) => pool.id === "xtz-tzbtc-sirius");
    const token = mainnet.assets.find((asset) => asset.name === "TzBTC");
    const lpToken = mainnet.assets.find((asset) => asset.name === "Sirs");

    expect(sirius).toMatchObject({
      type: PoolType.SIRIUS,
      address: "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5",
      tokenA: Token.XTZ,
      tokenB: Token.TzBTC,
      lpToken: Token.Sirs,
    });
    expect(token).toMatchObject({
      address: "KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn",
      decimals: 8,
      type: TokenType.FA12,
    });
    expect(lpToken).toMatchObject({
      address: "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo",
      decimals: 0,
      type: TokenType.FA12,
    });
  });

  it("rejects a Sirius adapter configured for token-to-token routing", () => {
    expect(
      () =>
        new SiriusAdapter({
          ...poolConfig,
          tokenA: Token.BTCtz,
          tokenB: Token.TzBTC,
        })
    ).toThrow(/only the direct XTZ\/tzBTC pool/i);
  });
});
