import {
  AccountInfo,
  DAppClient,
  NetworkType,
  RequestOperationInput,
  TezosOperationType,
} from "@airgap/beacon-dapp";
import BigNumber from "bignumber.js";

import {
  Token,
  TokenType,
  Transaction,
  TransactionSubmissionContext,
  TransactionStatus,
  TransactingComponent,
} from "../types/general";
import { PoolType, StablePoolConfig } from "../types/pools";
import {
  accountMatchesConfiguredNetwork,
  ConfiguredNetworkIdentity,
  createConfiguredNetworkIdentity,
  createGuardedDAppClient,
  createOperationRequestPolicy,
  OperationRequestPolicy,
  WalletIdentityError,
  WalletSubmissionRuntime,
} from "./walletIdentity";
import { TRANSACTION_DEADLINE_MS } from "./transactionSafety";

const owner = "tz1-generic-owner";
const otherOwner = "tz1-other-owner";
const pool = "KT1-generic-pool";
const token = "KT1-generic-token";

const deadline = () =>
  new Date(Date.now() + TRANSACTION_DEADLINE_MS).toISOString();

const mainnet = createConfiguredNetworkIdentity({
  type: NetworkType.MAINNET,
  chainId: "NetX-mainnet",
  primaryRpcUrl: "https://rpc.example/",
  fallbackRpcUrls: ["https://fallback.example"],
});

const account = (
  overrides: Partial<AccountInfo> & {
    network?: AccountInfo["network"];
  } = {}
): AccountInfo =>
  ({
    address: owner,
    accountIdentifier: "account-id",
    senderId: "sender-id",
    origin: { type: "extension", id: "wallet" },
    network: { type: NetworkType.MAINNET },
    scopes: [],
    connectedAt: 1,
    walletType: "implicit",
    ...overrides,
  } as AccountInfo);

const submission: TransactionSubmissionContext = {
  owner,
  accountIdentifier: "account-id",
  recipient: pool,
  networkType: NetworkType.MAINNET,
  chainId: mainnet.chainId,
  rpcUrl: mainnet.primaryRpcUrl,
  connectionRevision: 3,
};

const runtime = (
  overrides: Partial<WalletSubmissionRuntime> = {}
): WalletSubmissionRuntime => ({
  address: owner,
  accountIdentifier: "account-id",
  connectionRevision: 3,
  network: mainnet,
  rpcUrl: "https://rpc.example",
  readChainId: async () => mainnet.chainId,
  ...overrides,
});

const validRequest = (): RequestOperationInput =>
  ({
    operationDetails: [
      {
        kind: TezosOperationType.TRANSACTION,
        destination: token,
        amount: "0",
        parameters: {
          entrypoint: "approve",
          value: { spender: pool, value: "10" },
        },
      },
      {
        kind: TezosOperationType.TRANSACTION,
        destination: pool,
        amount: "1",
        parameters: {
          entrypoint: "swap",
          value: { owner, minimum: "9", deadline: deadline() },
        },
      },
    ],
  } as unknown as RequestOperationInput);

const operationPolicy: OperationRequestPolicy = {
  recipient: pool,
  allowedDestinations: [pool, token],
  operations: [
    {
      destination: token,
      entrypoint: "approve",
      amount: "0",
      parameterValues: [pool, "10"],
    },
    {
      destination: pool,
      entrypoint: "swap",
      amount: "1",
      parameterValues: [owner, "9"],
      hasDeadline: true,
    },
  ],
};

const clientWithAccount = (activeAccount: AccountInfo | undefined) => {
  const requestOperation = jest
    .fn()
    .mockResolvedValue({ transactionHash: "operation-hash" });
  const getActiveAccount = jest.fn().mockResolvedValue(activeAccount);
  return {
    client: { requestOperation, getActiveAccount } as unknown as DAppClient,
    getActiveAccount,
    requestOperation,
  };
};

const guardedRequest = async (options?: {
  activeAccount?: AccountInfo;
  submission?: TransactionSubmissionContext;
  runtime?: WalletSubmissionRuntime;
  network?: NetworkType;
  request?: RequestOperationInput;
  operationPolicy?: OperationRequestPolicy;
}) => {
  const beacon = clientWithAccount(options?.activeAccount ?? account());
  const mismatch = jest.fn();
  const guardedClient = createGuardedDAppClient({
    client: beacon.client,
    submission: options?.submission ?? submission,
    transactionNetwork: options?.network ?? NetworkType.MAINNET,
    operationPolicy: options?.operationPolicy ?? operationPolicy,
    getRuntime: () => options?.runtime ?? runtime(),
    onMismatch: mismatch,
  });

  const result = guardedClient.requestOperation(
    options?.request ?? validRequest()
  );
  return { ...beacon, mismatch, result };
};

describe("wallet submission identity", () => {
  it("treats custom networks as their canonical RPC rather than generic CUSTOM", () => {
    const preview: ConfiguredNetworkIdentity = createConfiguredNetworkIdentity({
      type: NetworkType.CUSTOM,
      chainId: "NetX-preview",
      primaryRpcUrl: "https://preview.example/rpc/",
    });

    expect(
      accountMatchesConfiguredNetwork(
        account({
          network: {
            type: NetworkType.CUSTOM,
            rpcUrl: "https://preview.example/rpc",
          },
        }),
        preview
      )
    ).toBe(true);
    expect(
      accountMatchesConfiguredNetwork(
        account({
          network: {
            type: NetworkType.CUSTOM,
            rpcUrl: "https://different.example/rpc",
          },
        }),
        preview
      )
    ).toBe(false);
  });

  it("submits only after the account, chain, RPC, owner, and recipient all match", async () => {
    const request = await guardedRequest();

    await expect(request.result).resolves.toEqual({
      transactionHash: "operation-hash",
    });
    expect(request.getActiveAccount).toHaveBeenCalledTimes(2);
    expect(request.requestOperation).toHaveBeenCalledTimes(1);
    expect(request.mismatch).not.toHaveBeenCalled();
  });

  it("re-reads the account after chain verification and catches a last-moment switch", async () => {
    let activeAccount = account();
    const requestOperation = jest
      .fn()
      .mockResolvedValue({ transactionHash: "operation-hash" });
    const client = {
      requestOperation,
      getActiveAccount: jest.fn(async () => activeAccount),
    } as unknown as DAppClient;
    const guardedClient = createGuardedDAppClient({
      client,
      submission,
      transactionNetwork: NetworkType.MAINNET,
      operationPolicy,
      getRuntime: () =>
        runtime({
          readChainId: async () => {
            activeAccount = account({
              address: otherOwner,
              accountIdentifier: "other-account-id",
            });
            return mainnet.chainId;
          },
        }),
    });

    await expect(
      guardedClient.requestOperation(validRequest())
    ).rejects.toBeInstanceOf(WalletIdentityError);
    expect(requestOperation).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "account switch",
      options: { activeAccount: account({ address: otherOwner }) },
    },
    {
      name: "network switch",
      options: {
        runtime: runtime({
          network: createConfiguredNetworkIdentity({
            type: NetworkType.SHADOWNET,
            chainId: "NetX-shadow",
            primaryRpcUrl: "https://shadow.example",
          }),
          rpcUrl: "https://shadow.example",
        }),
      },
    },
    {
      name: "reconnect",
      options: { runtime: runtime({ connectionRevision: 4 }) },
    },
    {
      name: "wrong RPC chain",
      options: {
        runtime: runtime({ readChainId: async () => "NetX-wrong" }),
      },
    },
  ])(
    "rejects a $name before Beacon receives the operation",
    async ({ options }) => {
      const request = await guardedRequest(options);

      await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
      expect(request.requestOperation).not.toHaveBeenCalled();
      expect(request.mismatch).toHaveBeenCalledTimes(1);
    }
  );

  it("rejects an unexpected contract recipient before the wallet request", async () => {
    const unexpectedRequest = validRequest();
    const secondOperation = unexpectedRequest.operationDetails[1];
    if (secondOperation.kind === TezosOperationType.TRANSACTION) {
      secondOperation.destination = "KT1-unexpected-recipient";
    }
    const request = await guardedRequest({ request: unexpectedRequest });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "attached XTZ amount",
      mutate: (request: RequestOperationInput) => {
        const operation = request.operationDetails[1];
        if (operation.kind === TezosOperationType.TRANSACTION) {
          operation.amount = "9000000";
        }
      },
    },
    {
      name: "entrypoint",
      mutate: (request: RequestOperationInput) => {
        const operation = request.operationDetails[1];
        if (
          operation.kind === TezosOperationType.TRANSACTION &&
          operation.parameters
        ) {
          operation.parameters.entrypoint = "removeLiquidity";
        }
      },
    },
    {
      name: "parameter amount",
      mutate: (request: RequestOperationInput) => {
        const operation = request.operationDetails[1];
        if (operation.kind === TezosOperationType.TRANSACTION) {
          operation.parameters = {
            entrypoint: "swap",
            value: {
              owner,
              minimum: "9000000",
              deadline: deadline(),
            } as never,
          };
        }
      },
    },
    {
      name: "recipient owner",
      mutate: (request: RequestOperationInput) => {
        const operation = request.operationDetails[1];
        if (operation.kind === TezosOperationType.TRANSACTION) {
          operation.parameters = {
            entrypoint: "swap",
            value: {
              owner: otherOwner,
              minimum: "9",
              deadline: deadline(),
            } as never,
          };
        }
      },
    },
  ])("rejects a changed $name", async ({ mutate }) => {
    const changedRequest = validRequest();
    mutate(changedRequest);
    const request = await guardedRequest({ request: changedRequest });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });

  it("rejects an additional same-contract operation", async () => {
    const extraOperationRequest = validRequest();
    extraOperationRequest.operationDetails.push({
      kind: TezosOperationType.TRANSACTION,
      destination: pool,
      amount: "9000000",
      parameters: {
        entrypoint: "swap",
        value: { owner, minimum: "9", deadline: deadline() } as never,
      },
    });
    const request = await guardedRequest({ request: extraOperationRequest });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });

  it("rejects reordered parameters even when every scalar is present", async () => {
    const reorderedRequest = validRequest();
    const operation = reorderedRequest.operationDetails[1];
    if (operation.kind === TezosOperationType.TRANSACTION) {
      operation.parameters = {
        entrypoint: "swap",
        value: {
          minimum: "9",
          owner,
          deadline: deadline(),
        } as never,
      };
    }

    const request = await guardedRequest({ request: reorderedRequest });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "FA1.2",
      tokenType: TokenType.FA12,
      expectedEntrypoints: ["approve", "approve", "tokenToXtz", "approve"],
      expectedActions: [undefined, undefined, undefined, undefined],
    },
    {
      name: "FA2",
      tokenType: TokenType.FA2,
      expectedEntrypoints: [
        "update_operators",
        "tokenToXtz",
        "update_operators",
      ],
      expectedActions: ["add_operator", undefined, "remove_operator"],
    },
  ])(
    "builds the complete $name token-to-XTZ batch policy",
    ({ tokenType, expectedEntrypoints, expectedActions }) => {
      const tokenAsset = {
        name: Token.USDt,
        label: "Token",
        logo: "",
        address: token,
        decimals: 6,
        type: tokenType,
        tokenId: tokenType === TokenType.FA2 ? 7 : undefined,
      };
      const xtzAsset = {
        name: Token.XTZ,
        label: "Tez",
        logo: "",
        address: "",
        decimals: 6,
        type: TokenType.XTZ,
      };
      const transaction = {
        id: "token-to-xtz",
        network: NetworkType.MAINNET,
        component: TransactingComponent.SWAP,
        poolId: "tezex",
        sendAsset: [tokenAsset],
        sendAmount: [{ mantissa: new BigNumber("10") }],
        sendAssetBalance: [{ mantissa: new BigNumber("100") }],
        receiveAsset: [xtzAsset],
        receiveAmount: [{ mantissa: new BigNumber("9") }],
        receiveAssetBalance: [{ mantissa: new BigNumber("0") }],
        slippage: 0,
        transactionStatus: TransactionStatus.PENDING,
        submissionContext: submission,
        lastModified: new Date(),
        locked: false,
      } as Transaction;
      const policy = createOperationRequestPolicy(transaction, {
        id: "tezex",
        name: "TEZEX",
        type: PoolType.TEZEX,
        address: pool,
        tokenA: Token.XTZ,
        tokenB: Token.USDt,
        lpToken: Token.LP_XTZUSDt,
      });

      expect(
        policy.operations.map((operation) => operation.entrypoint)
      ).toEqual(expectedEntrypoints);
      expect(
        policy.operations.map((operation) => operation.operatorAction)
      ).toEqual(expectedActions);
    }
  );

  it("matches Sirius add-liquidity slippage and approval cleanup", () => {
    const amount = (value: string) =>
      ({ mantissa: new BigNumber(value) } as never);
    const xtzAsset = {
      name: Token.XTZ,
      label: "Tez",
      logo: "",
      address: "",
      decimals: 6,
      type: TokenType.XTZ,
    };
    const tokenAsset = {
      name: Token.TzBTC,
      label: "tzBTC",
      logo: "",
      address: token,
      decimals: 8,
      type: TokenType.FA12,
    };
    const lpAsset = {
      name: Token.Sirs,
      label: "SIRS",
      logo: "",
      address: "KT1-sirs",
      decimals: 0,
      type: TokenType.FA12,
    };
    const transaction = {
      id: "sirius-add",
      network: NetworkType.MAINNET,
      component: TransactingComponent.ADD_LIQUIDITY,
      poolId: "sirius",
      sendAsset: [xtzAsset, tokenAsset],
      sendAmount: [amount("100"), amount("200")],
      sendAssetBalance: [amount("1000"), amount("1000")],
      receiveAsset: [lpAsset],
      receiveAmount: [amount("300")],
      receiveAssetBalance: [amount("0")],
      slippage: 1,
      transactionStatus: TransactionStatus.PENDING,
      submissionContext: submission,
      lastModified: new Date(),
      locked: false,
    } as Transaction;

    const policy = createOperationRequestPolicy(transaction, {
      id: "sirius",
      name: "Sirius",
      type: PoolType.SIRIUS,
      address: pool,
      tokenA: Token.XTZ,
      tokenB: Token.TzBTC,
      lpToken: Token.Sirs,
    });

    expect(policy.operations.map((operation) => operation.entrypoint)).toEqual([
      "approve",
      "approve",
      "addLiquidity",
      "approve",
    ]);
    expect(policy.operations[2]).toMatchObject({
      amount: "100",
      parameterValues: [owner, "297", "202"],
      hasDeadline: true,
    });
  });

  it("validates FA2 action and token ID", async () => {
    const fa2Policy: OperationRequestPolicy = {
      recipient: pool,
      allowedDestinations: [pool, token],
      operations: [
        {
          destination: token,
          entrypoint: "update_operators",
          amount: "0",
          parameterValues: [owner, pool, "7"],
          operatorAction: "add_operator",
        },
      ],
    };
    const wrongTokenId = {
      operationDetails: [
        {
          kind: TezosOperationType.TRANSACTION,
          destination: token,
          amount: "0",
          parameters: {
            entrypoint: "update_operators",
            value: [
              {
                add_operator: {
                  owner,
                  operator: pool,
                  token_id: 8,
                },
              },
            ],
          },
        },
      ],
    } as unknown as RequestOperationInput;
    const request = await guardedRequest({
      request: wrongTokenId,
      operationPolicy: fa2Policy,
    });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });

  it("allows a strictly matched stable divest without an embedded owner", async () => {
    const stablePool: StablePoolConfig = {
      id: "stable",
      name: "Stable",
      type: PoolType.STABLE,
      address: pool,
      tokenA: Token.USDtz,
      tokenB: Token.USDt,
      lpToken: Token.LP_USDtzUSDt,
      poolId: 3,
      tokenAIdx: 0,
      tokenBIdx: 1,
    };
    const amount = (value: string) =>
      ({ mantissa: new BigNumber(value) } as never);
    const stableTransaction = {
      id: "stable-remove",
      network: NetworkType.MAINNET,
      component: TransactingComponent.REMOVE_LIQUIDITY,
      poolId: stablePool.id,
      sendAsset: [
        {
          name: Token.LP_USDtzUSDt,
          label: "LP",
          logo: "",
          address: "KT1-lp",
          decimals: 18,
          type: TokenType.FA12,
        },
      ],
      sendAmount: [amount("100")],
      sendAssetBalance: [amount("100")],
      receiveAsset: [
        {
          name: Token.USDtz,
          label: "A",
          logo: "",
          address: "KT1-a",
          decimals: 6,
          type: TokenType.FA12,
        },
        {
          name: Token.USDt,
          label: "B",
          logo: "",
          address: "KT1-b",
          decimals: 6,
          type: TokenType.FA2,
          tokenId: 7,
        },
      ],
      receiveAmount: [amount("200"), amount("300")],
      receiveAssetBalance: [amount("0"), amount("0")],
      slippage: 1,
      transactionStatus: TransactionStatus.PENDING,
      submissionContext: submission,
      lastModified: new Date(),
      locked: false,
    } as Transaction;
    const stablePolicy = createOperationRequestPolicy(
      stableTransaction,
      stablePool
    );
    const request = await guardedRequest({
      operationPolicy: stablePolicy,
      request: {
        operationDetails: [
          {
            kind: TezosOperationType.TRANSACTION,
            destination: pool,
            amount: "0",
            parameters: {
              entrypoint: "divest",
              value: {
                pool_id: 3,
                shares: 100,
                min_amounts: new Map([
                  [0, 198],
                  [1, 297],
                ]),
                deadline: deadline(),
              },
            },
          },
        ],
      } as unknown as RequestOperationInput,
    });

    await expect(request.result).resolves.toEqual({
      transactionHash: "operation-hash",
    });
    expect(request.requestOperation).toHaveBeenCalledTimes(1);
  });
});
