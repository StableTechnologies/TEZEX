import React, { useContext } from "react";
import { act, render, waitFor } from "@testing-library/react";
import {
  AccountInfo,
  BeaconEvent,
  DAppClient,
  NetworkType,
  TezosOperationType,
} from "@airgap/beacon-dapp";
import BigNumber from "bignumber.js";

import {
  Asset,
  Balance,
  Token,
  TokenType,
  TransactingComponent,
} from "../types/general";
import { IPoolAdapter, PoolType } from "../types/pools";
import { PoolRegistry } from "../adapters/poolRegistry";
import { WalletContext, WalletInfo, WalletProvider } from "./wallet";
import { TRANSACTION_DEADLINE_MS } from "../functions/transactionSafety";

const mockGetPoolAdapter = jest.fn();
const mockGetBalance = jest.fn();
let mockNetwork: ReturnType<typeof makeNetwork>;

jest.mock("uuid", () => ({ v4: () => "transaction-id" }));

jest.mock("../hooks/network", () => ({
  useNetwork: () => mockNetwork,
}));

jest.mock("../hooks/session", () => ({
  useSession: () => ({ setAlert: jest.fn() }),
}));

jest.mock("../functions/beacon", () => {
  const actual = jest.requireActual("../functions/beacon");
  return {
    ...actual,
    getBalance: (...args: unknown[]) => mockGetBalance(...args),
  };
});

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
  address: "KT1-generic-token",
  decimals: 6,
  type: TokenType.FA12,
};

function makeNetwork(network: NetworkType, chainId: string) {
  const rpcUrl = `https://${network}.rpc.example`;
  return {
    network,
    info: {
      tezosServer: rpcUrl,
      rpcFallbacks: [],
      chainId,
      pools: [],
      assets: [xtz, token],
    },
    toolkit: {
      rpc: {
        getRpcUrl: () => rpcUrl,
        getChainId: async () => chainId,
      },
    },
    selectedPool: null,
    setSelectedPool: jest.fn(),
    getAsset: jest.fn(),
    getPoolAdapter: mockGetPoolAdapter,
    getPoolsByTokenPair: jest.fn(),
    getAllPools: jest.fn().mockReturnValue([]),
    switchNetwork: jest.fn(),
  };
}

const account = (address: string, accountIdentifier: string): AccountInfo =>
  ({
    address,
    accountIdentifier,
    senderId: "sender-id",
    origin: { type: "extension", id: "wallet" },
    network: { type: mockNetwork.network },
    scopes: [],
    connectedAt: 1,
    walletType: "implicit",
  } as AccountInfo);

const balance = (value: string): Balance => {
  const number = new BigNumber(value);
  return {
    decimal: number,
    mantissa: number,
    string: number.toFixed(),
    greaterOrEqualTo: (other) => number.gte(other.mantissa),
  };
};

describe("WalletProvider account and network lifecycle", () => {
  let wallet: WalletInfo;
  let activeAccount: AccountInfo;
  let walletRequest: jest.SpyInstance;
  let activeAccountHandler:
    | ((activeAccount: AccountInfo | undefined) => void)
    | undefined;

  const Probe = () => {
    wallet = useContext(WalletContext);
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetwork = makeNetwork(NetworkType.MAINNET, "NetX-mainnet");
    activeAccount = account("tz1-first-owner", "first-account");
    jest
      .spyOn(DAppClient.prototype, "getActiveAccount")
      .mockImplementation(async () => activeAccount);
    jest
      .spyOn(DAppClient.prototype, "subscribeToEvent")
      .mockImplementation(async (event, handler) => {
        if (event === BeaconEvent.ACTIVE_ACCOUNT_SET) {
          activeAccountHandler = handler;
        }
      });
    jest
      .spyOn(DAppClient.prototype, "clearActiveAccount")
      .mockResolvedValue(undefined);
    jest.spyOn(DAppClient.prototype, "destroy").mockResolvedValue(undefined);
    walletRequest = jest
      .spyOn(DAppClient.prototype, "requestOperation")
      .mockResolvedValue({ transactionHash: "operation-hash" } as never);

    mockGetBalance.mockResolvedValue(balance("100"));
    mockGetPoolAdapter.mockReturnValue({
      poolConfig: {
        id: "pool-id",
        name: "Pool",
        type: PoolType.TEZEX,
        address: "KT1-generic-pool",
        tokenA: Token.XTZ,
        tokenB: Token.TzBTC,
        lpToken: Token.Sirs,
      },
      estimateSwap: jest.fn().mockResolvedValue({
        inputAmount: new BigNumber(1),
        outputAmount: new BigNumber(2),
      }),
    } as unknown as IPoolAdapter);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const initialise = async () => {
    await wallet.initialiseTransaction(
      TransactingComponent.SWAP,
      [xtz],
      [token],
      "pool-id",
      [balance("1")],
      [balance("2")]
    );
  };

  it("clears transactions on account switch, reconnect, and canonical network switch", async () => {
    const view = render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );

    await waitFor(() => expect(wallet.address).toBe("tz1-first-owner"));
    await act(initialise);
    expect(
      wallet.getActiveTransaction(TransactingComponent.SWAP)
    ).toBeDefined();

    await act(async () => {
      activeAccountHandler?.(account("tz1-second-owner", "second-account"));
    });
    await waitFor(() => expect(wallet.address).toBe("tz1-second-owner"));
    expect(
      wallet.getActiveTransaction(TransactingComponent.SWAP)
    ).toBeUndefined();

    await act(initialise);
    await act(async () => {
      activeAccountHandler?.(account("tz1-second-owner", "second-account"));
    });
    expect(
      wallet.getActiveTransaction(TransactingComponent.SWAP)
    ).toBeUndefined();

    await act(initialise);
    mockNetwork = makeNetwork(NetworkType.SHADOWNET, "NetX-shadow");
    view.rerender(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );

    await waitFor(() => expect(wallet.address).toBeNull());
    expect(
      wallet.getActiveTransaction(TransactingComponent.SWAP)
    ).toBeUndefined();
  });

  it("re-reads Beacon and blocks a stale signing account before requestOperation", async () => {
    const adapter = {
      poolConfig: {
        id: "pool-id",
        name: "Pool",
        type: PoolType.TEZEX,
        address: "KT1-generic-pool",
        tokenA: Token.XTZ,
        tokenB: Token.TzBTC,
        lpToken: Token.Sirs,
      },
      estimateSwap: jest.fn().mockResolvedValue({
        inputAmount: new BigNumber(1),
        outputAmount: new BigNumber(2),
      }),
      executeSwap: jest.fn(async (kit) => {
        const response = await kit.client.requestOperation({
          operationDetails: [
            {
              kind: TezosOperationType.TRANSACTION,
              destination: "KT1-generic-pool",
              amount: "1",
              parameters: {
                entrypoint: "xtzToToken",
                value: {
                  owner: "tz1-first-owner",
                  minimum: "1",
                  deadline: new Date(
                    Date.now() + TRANSACTION_DEADLINE_MS
                  ).toISOString(),
                },
              },
            },
          ],
        });
        return response.transactionHash;
      }),
    } as unknown as IPoolAdapter;
    mockGetPoolAdapter.mockReturnValue(adapter);
    jest.spyOn(PoolRegistry, "getAdapter").mockReturnValue(adapter);

    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );
    await waitFor(() => expect(wallet.address).toBe("tz1-first-owner"));
    await act(initialise);

    // Simulate a wallet that changed accounts without delivering its event.
    activeAccount = account("tz1-second-owner", "second-account");
    await act(async () => {
      await expect(
        wallet.prepareTransactionForSubmission(TransactingComponent.SWAP)
      ).resolves.toBe(true);
    });

    await waitFor(() => expect(wallet.address).toBeNull());
    expect(walletRequest).not.toHaveBeenCalled();
    expect(
      wallet.getActiveTransaction(TransactingComponent.SWAP)
    ).toBeUndefined();
  });
});
