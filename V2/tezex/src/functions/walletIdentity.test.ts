import {
  AccountInfo,
  DAppClient,
  NetworkType,
  RequestOperationInput,
  TezosOperationType,
} from "@airgap/beacon-dapp";

import type { TransactionSubmissionContext } from "../types/general";
import {
  accountMatchesConfiguredNetwork,
  ConfiguredNetworkIdentity,
  createConfiguredNetworkIdentity,
  createGuardedDAppClient,
  WalletIdentityError,
  WalletSubmissionRuntime,
} from "./walletIdentity";

const owner = "tz1-generic-owner";
const otherOwner = "tz1-other-owner";
const pool = "KT1-generic-pool";
const token = "KT1-generic-token";

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
          value: { string: pool },
        },
      },
      {
        kind: TezosOperationType.TRANSACTION,
        destination: pool,
        amount: "1",
        parameters: {
          entrypoint: "swap",
          value: { string: owner },
        },
      },
    ],
  } as RequestOperationInput);

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
  allowedDestinations?: string[];
}) => {
  const beacon = clientWithAccount(options?.activeAccount ?? account());
  const mismatch = jest.fn();
  const guardedClient = createGuardedDAppClient({
    client: beacon.client,
    submission: options?.submission ?? submission,
    transactionNetwork: options?.network ?? NetworkType.MAINNET,
    allowedDestinations: options?.allowedDestinations ?? [pool, token],
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
      allowedDestinations: [pool, token],
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

  it("rejects a stale recipient or approval owner before the wallet request", async () => {
    const staleOwnerRequest = validRequest();
    const secondOperation = staleOwnerRequest.operationDetails[1];
    if (secondOperation.kind === TezosOperationType.TRANSACTION) {
      secondOperation.parameters = {
        entrypoint: "swap",
        value: { string: otherOwner },
      };
    }
    const request = await guardedRequest({ request: staleOwnerRequest });

    await expect(request.result).rejects.toBeInstanceOf(WalletIdentityError);
    expect(request.requestOperation).not.toHaveBeenCalled();
  });
});
