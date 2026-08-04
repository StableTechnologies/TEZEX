import {
  AccountInfo,
  DAppClient,
  NetworkType,
  TezosOperationType,
} from "@airgap/beacon-sdk";
import BigNumber from "bignumber.js";

import {
  Asset,
  Balance,
  Token,
  TokenType,
  Transaction,
  TransactionStatus,
  TransactingComponent,
} from "../types/general";
import {
  applyQuoteResult,
  createQuoteGuardedDAppClient,
  createQuoteRequest,
  hasFreshTransactionQuote,
  QuoteContext,
  quoteRequestMatches,
  QuoteSubmissionContextError,
  transactionResultMatchesActive,
} from "./quoteSafety";

const balance = (mantissa: string): Balance => {
  const value = new BigNumber(mantissa);
  return {
    decimal: value,
    mantissa: value,
    string: value.toFixed(),
    greaterOrEqualTo: (other) => value.gte(other.mantissa),
  };
};

const xtz: Asset = {
  name: Token.XTZ,
  label: "XTZ",
  logo: "",
  address: "",
  decimals: 6,
  type: TokenType.XTZ,
};

const token: Asset = {
  name: Token.TzBTC,
  label: "Token",
  logo: "",
  address: "KT1-token",
  decimals: 6,
  type: TokenType.FA12,
};

const context: QuoteContext = {
  account: "tz1-user",
  network: NetworkType.MAINNET,
  chainId: "NetXdQprcVkpaWU",
};

const makeTransaction = (
  sendAmount = "1",
  receiveAmount = "0",
  revision = 1
): Transaction => ({
  id: "transaction-id",
  network: NetworkType.MAINNET,
  component: TransactingComponent.SWAP,
  poolId: "pool-one",
  sendAsset: [xtz],
  sendAmount: [balance(sendAmount)],
  sendAssetBalance: [balance("1000")],
  receiveAsset: [token],
  receiveAmount: [balance(receiveAmount)],
  receiveAssetBalance: [balance("0")],
  slippage: 0.5,
  transactionStatus: TransactionStatus.MODIFIED,
  quoteRevision: revision,
  lastModified: new Date("2026-07-30T00:00:00Z"),
  locked: false,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("quote revision safety", () => {
  it("accepts a response only while every request field still matches", () => {
    const transaction = makeTransaction();
    const request = createQuoteRequest(transaction, context, 1);

    expect(quoteRequestMatches(transaction, context, request)).toBe(true);

    const changedTransactions: Transaction[] = [
      { ...transaction, poolId: "pool-two" },
      { ...transaction, sendAsset: [token], receiveAsset: [xtz] },
      { ...transaction, sendAmount: [balance("2")] },
      { ...transaction, slippage: 1 },
      { ...transaction, network: NetworkType.SHADOWNET },
      { ...transaction, quoteRevision: 2 },
    ];

    changedTransactions.forEach((changed) => {
      expect(quoteRequestMatches(changed, context, request)).toBe(false);
    });

    expect(
      quoteRequestMatches(
        transaction,
        { ...context, account: "tz1-other" },
        request
      )
    ).toBe(false);
    expect(
      quoteRequestMatches(
        transaction,
        { ...context, network: NetworkType.SHADOWNET },
        request
      )
    ).toBe(false);
    expect(
      quoteRequestMatches(
        transaction,
        { ...context, chainId: "NetDifferent" },
        request
      )
    ).toBe(false);
  });

  it("discards an older RPC response that resolves after a newer quote", async () => {
    let activeTransaction = makeTransaction("1", "0", 1);
    const firstRequest = createQuoteRequest(activeTransaction, context, 1);
    const slowEstimate = deferred<Transaction>();

    const applySlowEstimate = slowEstimate.promise.then((estimate) => {
      const result = applyQuoteResult(
        activeTransaction,
        estimate,
        context,
        firstRequest,
        TransactionStatus.SUFFICIENT_BALANCE
      );
      if (result) activeTransaction = result;
    });

    activeTransaction = makeTransaction("2", "0", 2);
    const secondRequest = createQuoteRequest(activeTransaction, context, 2);
    const fastEstimate = makeTransaction("2", "200", 2);
    const latestResult = applyQuoteResult(
      activeTransaction,
      fastEstimate,
      context,
      secondRequest,
      TransactionStatus.SUFFICIENT_BALANCE
    );
    expect(latestResult).toBeDefined();
    activeTransaction = latestResult as Transaction;

    slowEstimate.resolve(makeTransaction("1", "100", 1));
    await applySlowEstimate;

    expect(activeTransaction.quoteRevision).toBe(2);
    expect(activeTransaction.sendAmount[0].mantissa.toFixed()).toBe("2");
    expect(activeTransaction.receiveAmount[0].mantissa.toFixed()).toBe("200");
    expect(activeTransaction.poolId).toBe("pool-one");
    expect(activeTransaction.sendAsset[0].name).toBe(Token.XTZ);
    expect(activeTransaction.transactionStatus).toBe(
      TransactionStatus.SUFFICIENT_BALANCE
    );
  });

  it("requires a fresh, untampered quote prepared specifically for submission", () => {
    const pendingTransaction = makeTransaction("2", "0", 3);
    const request = createQuoteRequest(pendingTransaction, context, 3);
    const estimate = makeTransaction("2", "200", 3);
    const displayedQuote = applyQuoteResult(
      pendingTransaction,
      estimate,
      context,
      request,
      TransactionStatus.SUFFICIENT_BALANCE
    ) as Transaction;

    expect(hasFreshTransactionQuote(displayedQuote, context)).toBe(true);
    expect(hasFreshTransactionQuote(displayedQuote, context, true)).toBe(false);

    const submissionQuote = applyQuoteResult(
      pendingTransaction,
      estimate,
      context,
      request,
      TransactionStatus.PENDING,
      true
    ) as Transaction;
    expect(hasFreshTransactionQuote(submissionQuote, context, true)).toBe(true);

    const changedMinimum = {
      ...submissionQuote,
      receiveAmount: [balance("199")] as Transaction["receiveAmount"],
    };
    expect(hasFreshTransactionQuote(changedMinimum, context, true)).toBe(false);
  });

  it("re-reads the account and chain immediately before the Beacon request", async () => {
    const pendingTransaction = makeTransaction("2", "0", 3);
    const request = createQuoteRequest(pendingTransaction, context, 3);
    const preparedTransaction = applyQuoteResult(
      pendingTransaction,
      makeTransaction("2", "200", 3),
      context,
      request,
      TransactionStatus.PENDING,
      true
    ) as Transaction;
    const requestOperation = jest
      .fn()
      .mockResolvedValue({ transactionHash: "operation-hash" });
    const getActiveAccount = jest.fn().mockResolvedValue({
      address: context.account,
      network: { type: context.network },
    } as AccountInfo);
    const client = {
      getActiveAccount,
      requestOperation,
    } as unknown as DAppClient;
    const guardedClient = createQuoteGuardedDAppClient({
      client,
      transaction: preparedTransaction,
      getRuntime: () => ({
        context,
        readChainId: async () => context.chainId,
      }),
    });

    await expect(
      guardedClient.requestOperation({
        operationDetails: [
          {
            kind: TezosOperationType.TRANSACTION,
            destination: "KT1-pool",
            amount: "1",
          },
        ],
      })
    ).resolves.toEqual({ transactionHash: "operation-hash" });
    expect(getActiveAccount).toHaveBeenCalledTimes(1);
    expect(requestOperation).toHaveBeenCalledTimes(1);
  });

  it("blocks a last-moment account switch before Beacon receives the operation", async () => {
    const pendingTransaction = makeTransaction("2", "0", 3);
    const request = createQuoteRequest(pendingTransaction, context, 3);
    const preparedTransaction = applyQuoteResult(
      pendingTransaction,
      makeTransaction("2", "200", 3),
      context,
      request,
      TransactionStatus.PENDING,
      true
    ) as Transaction;
    const requestOperation = jest.fn();
    const client = {
      getActiveAccount: jest.fn().mockResolvedValue({
        address: "tz1-other",
        network: { type: context.network },
      } as AccountInfo),
      requestOperation,
    } as unknown as DAppClient;
    const guardedClient = createQuoteGuardedDAppClient({
      client,
      transaction: preparedTransaction,
      getRuntime: () => ({
        context,
        readChainId: async () => context.chainId,
      }),
    });

    await expect(
      guardedClient.requestOperation({ operationDetails: [] })
    ).rejects.toBeInstanceOf(QuoteSubmissionContextError);
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it("blocks a network switch during request preparation", async () => {
    const pendingTransaction = makeTransaction("2", "0", 3);
    const request = createQuoteRequest(pendingTransaction, context, 3);
    const preparedTransaction = applyQuoteResult(
      pendingTransaction,
      makeTransaction("2", "200", 3),
      context,
      request,
      TransactionStatus.PENDING,
      true
    ) as Transaction;
    const requestOperation = jest.fn();
    const client = {
      getActiveAccount: jest.fn().mockResolvedValue({
        address: context.account,
        network: { type: context.network },
      } as AccountInfo),
      requestOperation,
    } as unknown as DAppClient;
    let activeContext = context;
    const guardedClient = createQuoteGuardedDAppClient({
      client,
      transaction: preparedTransaction,
      getRuntime: () => ({
        context: activeContext,
        readChainId: async () => {
          activeContext = { ...context, chainId: "NetDifferent" };
          return context.chainId;
        },
      }),
    });

    await expect(
      guardedClient.requestOperation({ operationDetails: [] })
    ).rejects.toBeInstanceOf(QuoteSubmissionContextError);
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it("does not apply an asynchronous result over a replacement transaction", () => {
    const completed = makeTransaction("1", "100", 2);
    const replacement = {
      ...makeTransaction("2", "200", 3),
      id: "replacement-transaction",
    };

    expect(transactionResultMatchesActive(completed, completed)).toBe(true);
    expect(transactionResultMatchesActive(replacement, completed)).toBe(false);
    expect(transactionResultMatchesActive(undefined, completed)).toBe(false);
  });
});
