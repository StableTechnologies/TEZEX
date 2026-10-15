import React, { useContext } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BigNumber from "bignumber.js";
import { AccountInfo, DAppClient } from "@airgap/beacon-dapp";
import { balanceBuilder } from "../functions/util";
import { Swap } from "./swap";
import { AddLiquidity } from "./addLiquidity";
import { WalletContext, WalletInfo, WalletProvider } from "../contexts/wallet";
import { Token, TokenType, TransactingComponent } from "../types/general";
import { PoolType } from "../types/pools";

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
    name: Token.TzBTC,
    label: "tzBTC",
    decimals: 8,
    type: TokenType.FA12,
    address: "KT1-token",
    logo: "",
  },
  {
    name: Token.Sirs,
    label: "Sirs",
    decimals: 0,
    type: TokenType.FA12,
    address: "KT1-lp",
    logo: "",
  },
];
const mockPool = {
  id: "xtz-tzbtc-sirius",
  name: "Sirius",
  type: PoolType.SIRIUS,
  address: "KT1-pool",
  tokenA: Token.XTZ,
  tokenB: Token.TzBTC,
  lpToken: Token.Sirs,
};
const mockGetBalance = jest.fn();
const mockEstimateSwap = jest.fn();
const mockRequiredDeposit = jest.fn();
const mockEstimateAdd = jest.fn();
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
  getAsset: (name: Token) => mockAssets.find((a) => a.name === name),
  getAllPools: () => [mockPool],
  setSelectedPool: jest.fn(),
  getPoolAdapter: () => ({
    poolConfig: mockPool,
    estimateSwap: mockEstimateSwap,
    calculateRequiredTokenForLiquidity: mockRequiredDeposit,
    estimateAddLiquidity: mockEstimateAdd,
  }),
};
const mockSession = {
  activeComponent: TransactingComponent.SWAP,
  loadComponent: jest.fn(),
  setAlert: jest.fn(),
};
let mockId = 0;
jest.mock("uuid", () => ({ v4: () => `transaction-${++mockId}` }));
jest.mock("../hooks/network", () => ({ useNetwork: () => mockNetwork }));
jest.mock("../hooks/session", () => ({ useSession: () => mockSession }));
jest.mock("./nav/NavLiquidity", () => ({ NavLiquidity: () => null }));
jest.mock("./ui/elements/PoolSelector", () => ({ PoolSelector: () => null }));
jest.mock("../functions/beacon", () => ({
  ...jest.requireActual("../functions/beacon"),
  getBalance: (...args: unknown[]) => mockGetBalance(...args),
}));
let wallet: WalletInfo;
const Probe = () => {
  wallet = useContext(WalletContext);
  return null;
};
const mount = async (liquidity = false) => {
  const view = render(
    <MemoryRouter>
      <WalletProvider>
        <Probe />
      </WalletProvider>
    </MemoryRouter>
  );
  await act(async () => {
    await Promise.resolve();
  });
  view.rerender(
    <MemoryRouter>
      <WalletProvider>
        <Probe />
        {liquidity ? (
          <AddLiquidity orientation="portrait" />
        ) : (
          <Swap orientation="portrait" />
        )}
      </WalletProvider>
    </MemoryRouter>
  );
  const label = liquidity ? "You deposit amount" : "Swap from amount";
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: label })).not.toHaveAttribute(
      "readonly"
    )
  );
  return screen.getByRole("textbox", { name: label });
};
beforeEach(() => {
  jest.resetAllMocks();
  mockGetBalance.mockImplementation((_toolkit, _network, _owner, asset) =>
    Promise.resolve(balanceBuilder("100", asset, false))
  );
  mockEstimateSwap.mockResolvedValue({
    inputAmount: new BigNumber(1000000),
    outputAmount: new BigNumber(420),
  });
  mockRequiredDeposit.mockResolvedValue(new BigNumber(500));
  mockEstimateAdd.mockResolvedValue({ lpTokenAmount: new BigNumber(123) });
});
afterEach(() => jest.restoreAllMocks());
test("manual swap input populates the output and quote without Use Max", async () => {
  const input = await mount();
  fireEvent.change(input, { target: { value: "1" } });
  await waitFor(
    () =>
      expect(
        screen.getByRole("textbox", { name: "Swap to amount" })
      ).toHaveValue("0.0000042"),
    { timeout: 4000 }
  );
  expect(input).toHaveValue("1");
  expect(mockEstimateSwap).toHaveBeenCalledTimes(1);
});
test("a wallet reconnect clearing the transaction does not leave swap read-only", async () => {
  await mount();
  act(() => wallet.clearTransaction(TransactingComponent.SWAP));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Swap from amount" })
    ).not.toHaveAttribute("readonly")
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Swap from amount" }), {
    target: { value: "1" },
  });
  await waitFor(
    () =>
      expect(
        screen.getByRole("textbox", { name: "Swap to amount" })
      ).toHaveValue("0.0000042"),
    { timeout: 4000 }
  );
});
test("manual liquidity input populates the required second deposit", async () => {
  const input = await mount(true);
  fireEvent.change(input, { target: { value: "1" } });
  expect(input).toHaveValue("1");
  await waitFor(
    () =>
      expect(
        screen.getByRole("textbox", { name: "Required deposit amount" })
      ).toHaveValue("0.000005"),
    { timeout: 4000 }
  );
  expect(screen.getByText("123 Sirs")).toBeVisible();
  expect(mockRequiredDeposit).toHaveBeenCalledTimes(1);
});

const connect = async () => {
  await act(async () => {
    wallet.syncActiveAccount(
      {} as DAppClient,
      {
        address: "tz1-owner",
        accountIdentifier: "wallet-1",
        network: { type: "mainnet" },
      } as AccountInfo
    );
  });
};
test("wallet reconnection restores an editable swap and publishes XTZ while another balance is pending", async () => {
  let finishToken!: (value: unknown) => void;
  mockGetBalance.mockImplementation((_kit, _network, _owner, asset) =>
    asset.name === Token.XTZ
      ? Promise.resolve(balanceBuilder("100", asset, false))
      : new Promise((resolve) => {
          if (asset.name === Token.TzBTC) finishToken = resolve;
        })
  );
  await mount();
  await connect();
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Swap from amount" })
    ).not.toHaveAttribute("readonly")
  );
  await waitFor(() => expect(screen.getByText("Balance 100")).toBeVisible());
  fireEvent.change(screen.getByRole("textbox", { name: "Swap from amount" }), {
    target: { value: "1" },
  });
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Swap to amount" })).toHaveValue(
      "0.0000042"
    )
  );
  expect(
    screen.getByRole("button", { name: "Swap", exact: true })
  ).toBeEnabled();
  await act(async () => {
    finishToken(balanceBuilder("0.001", mockAssets[1], false));
  });
});
test("a failed swap quote stays visible after balance refresh and a new edit recovers", async () => {
  let rejectQuote!: (reason: Error) => void;
  mockEstimateSwap.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectQuote = reject;
      })
  );
  const errorLog = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  await mount();
  await connect();
  const input = await screen.findByRole("textbox", {
    name: "Swap from amount",
  });
  await waitFor(() => expect(input).not.toHaveAttribute("readonly"));
  fireEvent.change(input, { target: { value: "1" } });
  await waitFor(() => expect(mockEstimateSwap).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Updating quote" })
    ).toBeDisabled()
  );
  expect(screen.getByText("Updating quote…")).toBeVisible();
  expect(input).not.toHaveAttribute("readonly");
  await act(async () => {
    rejectQuote(new Error("RPC unavailable"));
  });
  await act(async () => {
    await wallet.updateTransactionBalance(TransactingComponent.SWAP);
  });
  expect(
    screen.getByText("Quote unavailable. Edit the amount to try again.")
  ).toBeVisible();
  fireEvent.change(input, { target: { value: "2" } });
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "Swap to amount" })).toHaveValue(
      "0.0000042"
    )
  );
  expect(mockEstimateSwap).toHaveBeenCalledTimes(2);
  errorLog.mockRestore();
});

test.each([false, true])(
  "a fresh page initializes the %s form alongside its wallet provider",
  async (liquidity) => {
    render(
      <MemoryRouter>
        <WalletProvider>
          <Probe />
          {liquidity ? (
            <AddLiquidity orientation="portrait" />
          ) : (
            <Swap orientation="portrait" />
          )}
        </WalletProvider>
      </MemoryRouter>
    );
    const label = liquidity ? "You deposit amount" : "Swap from amount";
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: label })).not.toHaveAttribute(
        "readonly"
      )
    );
  }
);
