import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { Stez, STEZ_REFRESH_INTERVAL_MS } from ".";
import { connectWalletToCustomNetwork } from "../../functions/beacon";
import { resolveSnet } from "./network";
import { loadStezSnapshot, StezSnapshot } from "./rpc";

jest.mock("../../functions/beacon", () => ({
  connectWalletToCustomNetwork: jest.fn(),
}));

const snet = {
  key: "snet" as const,
  name: "Snet" as const,
  rpcUrl: "https://rpc.snet.teztnets.com",
  faucetUrl: "https://faucet.snet.teztnets.com",
  faucetApiUrl: "https://faucet-api.example",
  chainId: "NetXVasgoZmPMLe",
  activatedOn: "2026-08-14",
  info: {
    tezosServer: "https://rpc.snet.teztnets.com",
    rpcFallbacks: [],
    chainId: "NetXVasgoZmPMLe",
    pools: [],
    assets: [],
  },
};

const mockClient = {
  getActiveAccount: jest.fn(),
  requestOperation: jest.fn(),
};

const mockWallet: {
  isWalletConnected: boolean;
  address: string | null;
  client: typeof mockClient | null;
} = {
  isWalletConnected: false,
  address: null,
  client: null,
};

jest.mock("../../hooks/wallet", () => ({
  useWallet: () => mockWallet,
}));
jest.mock("./network", () => {
  const actual = jest.requireActual("./network");
  return { ...actual, resolveSnet: jest.fn() };
});
jest.mock("./rpc", () => {
  const actual = jest.requireActual("./rpc");
  return { ...actual, loadStezSnapshot: jest.fn() };
});

const baseSnapshot: StezSnapshot = {
  availability: "available",
  endpoint: snet.rpcUrl,
  chainId: snet.chainId,
  protocolHash: "ProtoALphaALphaALphaALphaALphaALphaALphaALphaDdp3zK",
  blockHash: "BLockHash",
  blockLevel: BigInt(2_640),
  blockTimestamp: "2026-08-10T12:00:00Z",
  contractHash: "KT1WCsbJx996ebZfutAitHYsZ8FUZFsTdaD7",
  totalSupplyUnits: BigInt(1_000_000),
  totalBackingMutez: BigInt(1_100_000),
  rateNumeratorMutez: BigInt(1_100_000),
  rateDenominatorTokenUnits: BigInt(1_000_000),
  walletXtzMutez: null,
  walletStezUnits: null,
  redeemedFrozenMutez: null,
  redeemedFinalizableMutez: null,
  checkedAt: Date.now(),
  detail: "sTEZ is active.",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWallet.isWalletConnected = false;
  mockWallet.address = null;
  mockWallet.client = null;
  (resolveSnet as jest.Mock).mockResolvedValue(snet);
  (loadStezSnapshot as jest.Mock).mockResolvedValue(baseSnapshot);
});

afterEach(() => {
  jest.useRealTimers();
});

test("loads live Snet data and its matching faucet", async () => {
  render(<Stez />);

  expect(screen.getByText("Loading sTEZ data")).toBeInTheDocument();
  await screen.findByText("sTEZ is live on Snet");

  expect(
    screen.getByText("Get testnet XTZ to test sTEZ here:")
  ).toBeInTheDocument();
  expect(screen.getByText("Stake tez, stay liquid.")).toBeInTheDocument();
  expect(screen.getByText("sTEZ Balance")).toBeInTheDocument();
  expect(screen.getByText("Total sTEZ supply")).toBeInTheDocument();
  expect(screen.getByText("RUN A BAKER ON SNET")).toBeInTheDocument();
  fireEvent.click(screen.getByText("RUN A BAKER ON SNET"));
  expect(
    screen.getByRole("link", { name: /SNET SETUP GUIDE/ })
  ).toHaveAttribute("href", "https://teztnets.com/snet-about");
  expect(
    screen.getByRole("link", { name: /sTEZ BAKER DOCUMENTATION/ })
  ).toHaveAttribute("href", "https://octez.tezos.com/docs/u025/stez.html");
  expect(
    screen
      .getByText("PROTOCOL DETAILS")
      .compareDocumentPosition(screen.getByText("RUN A BAKER ON SNET")) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
  expect(
    screen
      .getByText("RATE HISTORY")
      .compareDocumentPosition(screen.getByText("RUN A BAKER ON SNET")) &
      Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();

  fireEvent.click(
    screen.getByRole("button", { name: "Get Snet test XTZ" })
  );
  const faucetDialog = screen.getByRole("dialog", {
    name: "Get test XTZ",
  });
  expect(
    within(faucetDialog).getByRole("slider", { name: "Faucet amount" })
  ).toHaveAttribute("max", "10000");
  fireEvent.click(
    within(faucetDialog).getByRole("button", { name: "Close faucet" })
  );

  fireEvent.click(screen.getByRole("button", { name: "SEND SNET XTZ" }));
  const transferDialog = screen.getByRole("dialog", {
    name: "Send test XTZ",
  });
  expect(transferDialog).toBeInTheDocument();
  expect(
    within(transferDialog).getByRole("button", {
      name: "CONNECT WALLET TO SNET",
    })
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close Snet transfer" }));

  fireEvent.click(screen.getByRole("tab", { name: "Redeem" }));
  expect(screen.getByText("AMOUNT TO REDEEM")).toBeInTheDocument();
  expect(screen.getByText("ESTIMATED XTZ")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Finalize" }));
  expect(screen.getByText("CLAIMABLE XTZ")).toBeInTheDocument();
});

test("shows an exact inactive-network state without enabling controls", async () => {
  (loadStezSnapshot as jest.Mock).mockResolvedValue({
    ...baseSnapshot,
    availability: "disabled",
    contractHash: null,
  });

  render(<Stez />);

  await screen.findByText("sTEZ is not active on Snet");
  expect(
    screen.getByText(
      "The selected network includes the sTEZ protocol code, but native sTEZ contracts are not enabled. No balances, rates, or transaction controls are shown."
    )
  ).toBeInTheDocument();
});

test("enables a stake request only for a wallet connected to Snet", async () => {
  mockWallet.isWalletConnected = true;
  mockWallet.address = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
  mockWallet.client = mockClient;
  mockClient.getActiveAccount.mockResolvedValue({
    address: mockWallet.address,
    network: { type: "custom", rpcUrl: snet.rpcUrl },
  });
  (loadStezSnapshot as jest.Mock).mockResolvedValue({
    ...baseSnapshot,
    walletXtzMutez: BigInt(5_000_000),
    walletStezUnits: BigInt(2_000_000),
    redeemedFrozenMutez: BigInt(250_000),
    redeemedFinalizableMutez: BigInt(100_000),
  });

  render(<Stez />);

  await screen.findByText("sTEZ is live on Snet");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "ENTER AN AMOUNT" })
    ).toBeDisabled()
  );
  expect(screen.getByText("5.0")).toBeInTheDocument();
  expect(screen.getByText("2.0")).toBeInTheDocument();
  expect(screen.getByText("2.2")).toBeInTheDocument();
  expect(screen.getByText("0.2")).toBeInTheDocument();
  expect(screen.getByText("7.55")).toBeInTheDocument();
  expect(screen.queryByText("Direct stake")).not.toBeInTheDocument();
  expect(screen.getByText("Current redemption value")).toBeInTheDocument();
  expect(screen.getByText("Net staking rewards")).toBeInTheDocument();
  expect(screen.getByText("Combined XTZ value")).toBeInTheDocument();
  expect(screen.getByText("Redemption in progress")).toBeInTheDocument();
  expect(screen.getByText("Claimable XTZ")).toBeInTheDocument();
  expect(
    screen.queryByText(
      "Final amount is determined when the operation is included on-chain"
    )
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Get testnet XTZ to test sTEZ here:")
  ).toBeInTheDocument();
  const faucetButton = screen.getByRole("button", {
    name: "Get more Snet test XTZ",
  });
  expect(faucetButton).toHaveTextContent("GET MORE SNET TEST XTZ");
  fireEvent.click(faucetButton);
  expect(screen.getByLabelText("DESTINATION ADDRESS")).toHaveValue(
    mockWallet.address
  );

  fireEvent.change(screen.getByLabelText("AMOUNT TO STAKE"), {
    target: { value: "1" },
  });
  expect(screen.getByRole("button", { name: "STAKE XTZ" })).toBeEnabled();
});

test("refreshes the live rate and position while the page remains open", async () => {
  jest.useFakeTimers();
  mockWallet.isWalletConnected = true;
  mockWallet.address = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
  mockWallet.client = mockClient;
  mockClient.getActiveAccount.mockResolvedValue({
    address: mockWallet.address,
    network: { type: "custom", rpcUrl: snet.rpcUrl },
  });
  (loadStezSnapshot as jest.Mock)
    .mockResolvedValueOnce({
      ...baseSnapshot,
      walletXtzMutez: BigInt(5_000_000),
      walletStezUnits: BigInt(2_000_000),
      redeemedFrozenMutez: BigInt(0),
      redeemedFinalizableMutez: BigInt(0),
    })
    .mockResolvedValue({
      ...baseSnapshot,
      blockLevel: BigInt(2_641),
      rateNumeratorMutez: BigInt(1_200_000),
      walletXtzMutez: BigInt(5_000_000),
      walletStezUnits: BigInt(2_000_000),
      redeemedFrozenMutez: BigInt(0),
      redeemedFinalizableMutez: BigInt(0),
    });

  render(<Stez />);
  await screen.findByText("2.2");

  await act(async () => {
    jest.advanceTimersByTime(STEZ_REFRESH_INTERVAL_MS);
    await Promise.resolve();
    await Promise.resolve();
  });

  await waitFor(() => expect(loadStezSnapshot).toHaveBeenCalledTimes(2));
  expect(screen.getByText("2.4")).toBeInTheDocument();
  expect(screen.getByText("0.4")).toBeInTheDocument();
  expect(screen.getByText("7.4")).toBeInTheDocument();
  expect(screen.getByText("Snet · block 2,641")).toBeInTheDocument();
});

test("connects a disconnected wallet to the Snet RPC", async () => {
  render(<Stez />);
  await screen.findByText("sTEZ is live on Snet");

  fireEvent.click(
    screen.getByRole("button", { name: "CONNECT WALLET TO SNET" })
  );

  await waitFor(() =>
    expect(connectWalletToCustomNetwork).toHaveBeenCalledWith(mockWallet, {
      name: "Snet",
      rpcUrl: snet.rpcUrl,
      chainId: snet.chainId,
    })
  );
});
