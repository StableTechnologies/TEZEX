import React, { useContext } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import BigNumber from "bignumber.js";
import { RemoveLiquidity } from ".";
import {
  WalletContext,
  WalletInfo,
  WalletProvider,
} from "../../contexts/wallet";
import {
  Token,
  TokenType,
  TransactingComponent,
  TransactionStatus,
} from "../../types/general";

const mockAssets = [
  {
    name: Token.XTZ,
    label: "Tez",
    decimals: 6,
    type: TokenType.XTZ,
    address: "",
    logo: "",
  },
  {
    name: Token.USDt,
    label: "USDt",
    decimals: 6,
    type: TokenType.FA2,
    address: "KT1-token",
    logo: "",
  },
  {
    name: Token.LP_XTZUSDt,
    label: "LP-XTZUSDt",
    decimals: 6,
    type: TokenType.FA12,
    address: "KT1-lp",
    logo: "",
  },
];
const mockPool = {
  id: "xtz-usdt",
  address: "KT1-pool",
  tokenA: Token.XTZ,
  tokenB: Token.USDt,
  lpToken: Token.LP_XTZUSDt,
};
const mockEstimateRemove = jest.fn();
const mockNetwork = {
  network: "mainnet",
  info: {
    tezosServer: "https://rpc.example",
    rpcFallbacks: [],
    chainId: "NetXdQprcVkpaWU",
    pools: [mockPool],
    assets: mockAssets,
  },
  toolkit: {},
  selectedPool: mockPool,
  getAsset: (name: Token) => mockAssets.find((asset) => asset.name === name),
  getAllPools: () => [],
  setSelectedPool: jest.fn(),
  getPoolAdapter: () => ({
    poolConfig: mockPool,
    getPoolData: jest.fn().mockResolvedValue({}),
    estimateRemoveLiquidity: mockEstimateRemove,
  }),
};
const mockSession = {
  activeComponent: TransactingComponent.REMOVE_LIQUIDITY,
  loadComponent: jest.fn(),
  setAlert: jest.fn(),
};

jest.mock("uuid", () => ({ v4: () => "transaction-1" }));
jest.mock("../../hooks/network", () => ({ useNetwork: () => mockNetwork }));
jest.mock("../../hooks/session", () => ({ useSession: () => mockSession }));
jest.mock("../../hooks/styles", () => () => ({ tezex: {} }));
jest.mock("../wallet", () => ({ Wallet: () => null }));
jest.mock("../nav/NavLiquidity", () => ({ NavLiquidity: () => null }));
jest.mock("../ui/elements/PoolSelector", () => ({ PoolSelector: () => null }));

let wallet: WalletInfo;
const Probe = () => {
  wallet = useContext(WalletContext);
  return null;
};
const mount = async () => {
  const view = render(
    <WalletProvider>
      <Probe />
    </WalletProvider>
  );
  await act(async () => {
    await Promise.resolve();
  });
  view.rerender(
    <WalletProvider>
      <Probe />
      <RemoveLiquidity orientation="portrait" />
    </WalletProvider>
  );
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "LP tokens to redeem amount" })
    ).not.toHaveAttribute("readonly")
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("manual LP entry shows a pending quote and then both returns without Use Max", async () => {
  let resolveQuote!: (value: unknown) => void;
  mockEstimateRemove.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveQuote = resolve;
      })
  );
  await mount();
  const input = screen.getByRole("textbox", {
    name: "LP tokens to redeem amount",
  });
  fireEvent.change(input, { target: { value: "0.056379" } });
  await waitFor(() => expect(mockEstimateRemove).toHaveBeenCalledTimes(1), {
    timeout: 3000,
  });
  expect(mockEstimateRemove.mock.calls[0][1].toFixed()).toBe("56379");
  await act(async () => {
    await wallet.updateTransactionBalance(
      TransactingComponent.REMOVE_LIQUIDITY
    );
  });
  expect(
    wallet.getActiveTransaction(TransactingComponent.REMOVE_LIQUIDITY)
      ?.transactionStatus
  ).toBe(TransactionStatus.MODIFIED);
  expect(screen.getByRole("status")).toHaveTextContent("Fetching quote");
  expect(screen.queryByText("0 Tez")).not.toBeInTheDocument();
  expect(screen.queryByText("0 USDt")).not.toBeInTheDocument();
  await act(async () => {
    resolveQuote({
      lpTokenAmount: new BigNumber(56379),
      tokenAAmount: new BigNumber(99998),
      tokenBAmount: new BigNumber(31798),
    });
  });
  await waitFor(() => expect(screen.getByText("0.099998 Tez")).toBeVisible());
  expect(screen.getByText("0.031798 USDt")).toBeVisible();
  expect(input).toHaveValue("0.056379");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(mockEstimateRemove).toHaveBeenCalledTimes(1);
});

test("a failed manual quote stays visible after a balance refresh and a new edit recovers", async () => {
  const errorLog = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  mockEstimateRemove.mockRejectedValueOnce(new Error("RPC unavailable"));
  await mount();
  const input = screen.getByRole("textbox", {
    name: "LP tokens to redeem amount",
  });
  fireEvent.change(input, { target: { value: "0.056379" } });
  await waitFor(() => expect(mockEstimateRemove).toHaveBeenCalledTimes(1), {
    timeout: 3000,
  });
  await act(async () => {
    await wallet.updateTransactionBalance(
      TransactingComponent.REMOVE_LIQUIDITY
    );
  });
  expect(
    wallet.getActiveTransaction(TransactingComponent.REMOVE_LIQUIDITY)
      ?.transactionStatus
  ).toBe(TransactionStatus.FAILED);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Quote unavailable. Try again."
  );
  expect(screen.queryByText("0 Tez")).not.toBeInTheDocument();
  mockEstimateRemove.mockResolvedValue({
    lpTokenAmount: new BigNumber(50000),
    tokenAAmount: new BigNumber(88686),
    tokenBAmount: new BigNumber(28200),
  });
  fireEvent.change(input, { target: { value: "0.05" } });
  await waitFor(() => expect(screen.getByText("0.088686 Tez")).toBeVisible(), {
    timeout: 3000,
  });
  expect(screen.getByText("0.0282 USDt")).toBeVisible();
  expect(mockEstimateRemove).toHaveBeenCalledTimes(2);
  errorLog.mockRestore();
});
