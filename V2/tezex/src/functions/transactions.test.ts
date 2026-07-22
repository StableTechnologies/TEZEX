import BigNumber from "bignumber.js";

import { PoolRegistry } from "../adapters/poolRegistry";
import {
  Asset,
  Balance,
  ExecutionKit,
  Token,
  TokenType,
  Transaction,
  TransactionStatus,
  TransactingComponent,
} from "../types/general";
import { SubmittedOperationError } from "./failures";
import { processTransaction } from "./transactions";

jest.mock("../adapters/poolRegistry", () => ({
  PoolRegistry: { getAdapter: jest.fn() },
}));

const balance = (value: string): Balance => {
  const decimal = new BigNumber(value);
  return {
    decimal,
    mantissa: decimal.times(1_000_000),
    string: value,
    greaterOrEqualTo: (other) => decimal.gte(other.decimal),
  };
};

const xtz: Asset = {
  name: Token.XTZ,
  label: "Tez",
  logo: "",
  address: "",
  decimals: 6,
  type: TokenType.XTZ,
};

const tzbtc: Asset = {
  name: Token.TzBTC,
  label: "tzBTC",
  logo: "",
  address: "KT1-token",
  decimals: 8,
  type: TokenType.FA12,
};

const makeTransaction = (component: TransactingComponent): Transaction => ({
  id: "transaction-id",
  network: "mainnet" as Transaction["network"],
  component,
  poolId: "pool-id",
  sendAsset:
    component === TransactingComponent.ADD_LIQUIDITY ? [xtz, tzbtc] : [xtz],
  sendAmount:
    component === TransactingComponent.ADD_LIQUIDITY
      ? [balance("1"), balance("2")]
      : [balance("1")],
  sendAssetBalance:
    component === TransactingComponent.ADD_LIQUIDITY
      ? [balance("10"), balance("10")]
      : [balance("10")],
  receiveAsset: [tzbtc],
  receiveAmount: [balance("1")],
  receiveAssetBalance: [balance("0")],
  slippage: 0.5,
  transactionStatus: TransactionStatus.PENDING,
  lastModified: new Date(),
  locked: false,
});

const makeAdapter = () => ({
  poolConfig: { tokenA: Token.XTZ },
  executeSwap: jest.fn().mockResolvedValue("operation-hash"),
  executeAddLiquidity: jest.fn().mockResolvedValue("operation-hash"),
  executeRemoveLiquidity: jest.fn().mockResolvedValue("operation-hash"),
});

const makeKit = (
  confirmation: jest.Mock,
  operationResults: jest.Mock
): ExecutionKit =>
  ({
    toolkit: {
      operation: {
        createOperation: jest.fn().mockResolvedValue({
          confirmation,
          operationResults,
        }),
      },
    },
    client: {},
  } as unknown as ExecutionKit);

describe("processTransaction confirmation lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    TransactingComponent.SWAP,
    TransactingComponent.ADD_LIQUIDITY,
    TransactingComponent.REMOVE_LIQUIDITY,
  ])(
    "waits for an applied confirmation before completing %s",
    async (component) => {
      const adapter = makeAdapter();
      (PoolRegistry.getAdapter as jest.Mock).mockReturnValue(adapter);
      const confirmation = jest.fn().mockResolvedValue(undefined);
      const operationResults = jest
        .fn()
        .mockResolvedValue([
          { metadata: { operation_result: { status: "applied" } } },
        ]);
      const onSubmitted = jest.fn();

      const result = await processTransaction(
        makeTransaction(component),
        "tz1-user",
        makeKit(confirmation, operationResults),
        { onSubmitted }
      );

      expect(onSubmitted).toHaveBeenCalledWith("operation-hash");
      expect(confirmation).toHaveBeenCalledWith(1);
      expect(operationResults).toHaveBeenCalledTimes(1);
      expect(result.opHash).toBe("operation-hash");

      if (component === TransactingComponent.REMOVE_LIQUIDITY) {
        expect(adapter.executeRemoveLiquidity).toHaveBeenCalledWith(
          expect.anything(),
          "tz1-user",
          expect.any(BigNumber),
          0.5
        );
      }
    }
  );

  it("preserves the hash and blocks a blind retry when confirmation is unknown", async () => {
    (PoolRegistry.getAdapter as jest.Mock).mockReturnValue(makeAdapter());
    const confirmation = jest
      .fn()
      .mockRejectedValue(new Error("RPC confirmation timed out"));
    const operationResults = jest.fn().mockResolvedValue(undefined);

    await expect(
      processTransaction(
        makeTransaction(TransactingComponent.SWAP),
        "tz1-user",
        makeKit(confirmation, operationResults)
      )
    ).rejects.toMatchObject<Partial<SubmittedOperationError>>({
      opHash: "operation-hash",
      state: "unknown",
    });
  });

  it("marks an included non-applied operation as a safe-to-retry failure", async () => {
    (PoolRegistry.getAdapter as jest.Mock).mockReturnValue(makeAdapter());
    const confirmation = jest.fn().mockResolvedValue(undefined);
    const operationResults = jest
      .fn()
      .mockResolvedValue([
        { metadata: { operation_result: { status: "failed" } } },
      ]);

    await expect(
      processTransaction(
        makeTransaction(TransactingComponent.SWAP),
        "tz1-user",
        makeKit(confirmation, operationResults)
      )
    ).rejects.toMatchObject<Partial<SubmittedOperationError>>({
      opHash: "operation-hash",
      state: "failed",
    });
  });

  it("does not claim success when the applied status cannot be verified", async () => {
    (PoolRegistry.getAdapter as jest.Mock).mockReturnValue(makeAdapter());
    const confirmation = jest.fn().mockResolvedValue(undefined);
    const operationResults = jest.fn().mockResolvedValue([]);

    await expect(
      processTransaction(
        makeTransaction(TransactingComponent.SWAP),
        "tz1-user",
        makeKit(confirmation, operationResults)
      )
    ).rejects.toMatchObject<Partial<SubmittedOperationError>>({
      opHash: "operation-hash",
      state: "unknown",
    });
  });

  it("rejects an unsafe slippage value before asking the wallet", async () => {
    const adapter = makeAdapter();
    (PoolRegistry.getAdapter as jest.Mock).mockReturnValue(adapter);
    const transaction = makeTransaction(TransactingComponent.SWAP);
    transaction.slippage = 50;

    await expect(
      processTransaction(transaction, "tz1-user", makeKit(jest.fn(), jest.fn()))
    ).rejects.toThrow(/outside safe limits/i);
    expect(adapter.executeSwap).not.toHaveBeenCalled();
  });
});
