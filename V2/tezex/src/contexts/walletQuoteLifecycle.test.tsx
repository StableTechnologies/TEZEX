import React, { useContext } from "react";
import { act, render, waitFor } from "@testing-library/react";
import BigNumber from "bignumber.js";

import {
  Asset,
  Balance,
  Token,
  TokenType,
  TransactingComponent,
} from "../types/general";
import { IPoolAdapter, PoolType } from "../types/pools";
import { WalletContext, WalletInfo, WalletProvider } from "./wallet";

const mockGetPoolAdapter = jest.fn();

jest.mock("uuid", () => ({ v4: () => "transaction-id" }));

jest.mock("../hooks/network", () => ({
  useNetwork: () => ({
    network: "mainnet",
    info: {
      tezosServer: "https://rpc.example",
      rpcFallbacks: [],
      chainId: "NetXdQprcVkpaWU",
      pools: [],
      assets: [
        {
          name: "XTZ",
          label: "XTZ",
          logo: "",
          address: "",
          decimals: 6,
          type: "XTZ",
        },
        {
          name: "TzBTC",
          label: "Token",
          logo: "",
          address: "KT1-token",
          decimals: 6,
          type: "FA1.2",
        },
      ],
    },
    toolkit: {},
    selectedPool: null,
    setSelectedPool: jest.fn(),
    getAsset: jest.fn(),
    getPoolAdapter: mockGetPoolAdapter,
    getPoolsByTokenPair: jest.fn(),
    getAllPools: jest.fn().mockReturnValue([]),
    switchNetwork: jest.fn(),
  }),
}));

jest.mock("../hooks/session", () => ({
  useSession: () => ({ setAlert: jest.fn() }),
}));

const balance = (value: string): Balance => {
  const number = new BigNumber(value);
  return {
    decimal: number,
    mantissa: number,
    string: number.toFixed(),
    greaterOrEqualTo: (other) => number.gte(other.mantissa),
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

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("WalletProvider quote lifecycle", () => {
  let wallet: WalletInfo;

  const Probe = () => {
    wallet = useContext(WalletContext);
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the newest amount when quote RPC responses resolve out of order", async () => {
    const slowEstimate = deferred<{
      inputAmount: BigNumber;
      outputAmount: BigNumber;
    }>();
    const fastEstimate = deferred<{
      inputAmount: BigNumber;
      outputAmount: BigNumber;
    }>();
    const estimateSwap = jest
      .fn()
      .mockResolvedValueOnce({
        inputAmount: new BigNumber(0),
        outputAmount: new BigNumber(0),
      })
      .mockImplementationOnce(() => slowEstimate.promise)
      .mockImplementationOnce(() => fastEstimate.promise);
    const adapter = {
      poolConfig: {
        id: "pool-id",
        name: "Pool",
        type: PoolType.TEZEX,
        address: "KT1-pool",
        tokenA: Token.XTZ,
        tokenB: Token.TzBTC,
        lpToken: Token.Sirs,
      },
      estimateSwap,
    } as unknown as IPoolAdapter;
    mockGetPoolAdapter.mockReturnValue(adapter);

    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );

    await act(async () => {
      await wallet.initialiseTransaction(
        TransactingComponent.SWAP,
        [xtz],
        [token],
        "pool-id",
        [balance("0")],
        [balance("0")]
      );
    });
    await waitFor(() =>
      expect(
        wallet.getActiveTransaction(TransactingComponent.SWAP)
      ).toBeDefined()
    );

    let firstRequest!: Promise<boolean>;
    await act(async () => {
      firstRequest = wallet.refreshTransactionQuote(TransactingComponent.SWAP, [
        balance("1"),
      ]);
      await Promise.resolve();
    });
    await waitFor(() => expect(estimateSwap).toHaveBeenCalledTimes(2));

    let secondRequest!: Promise<boolean>;
    await act(async () => {
      secondRequest = wallet.refreshTransactionQuote(
        TransactingComponent.SWAP,
        [balance("2")]
      );
      await Promise.resolve();
    });
    await waitFor(() => expect(estimateSwap).toHaveBeenCalledTimes(3));
    await waitFor(() => {
      const pendingTransaction = wallet.getActiveTransaction(
        TransactingComponent.SWAP
      );
      expect(pendingTransaction?.quoteRevision).toBe(3);
      expect(pendingTransaction?.sendAmount[0].mantissa.toFixed()).toBe("2");
    });

    fastEstimate.resolve({
      inputAmount: new BigNumber("2"),
      outputAmount: new BigNumber("200"),
    });
    await act(async () => {
      await expect(secondRequest).resolves.toBe(true);
    });

    slowEstimate.resolve({
      inputAmount: new BigNumber("1"),
      outputAmount: new BigNumber("100"),
    });
    await act(async () => {
      await expect(firstRequest).resolves.toBe(false);
    });

    const transaction = wallet.getActiveTransaction(TransactingComponent.SWAP);
    expect(transaction?.sendAmount[0].mantissa.toFixed()).toBe("2");
    expect(transaction?.receiveAmount[0].mantissa.toFixed()).toBe("200");
    expect(transaction?.quoteRevision).toBe(3);
  });
});
