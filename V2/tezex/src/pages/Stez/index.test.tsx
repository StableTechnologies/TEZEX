import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Stez } from ".";
import { connectWalletToCustomNetwork } from "../../functions/beacon";
import { resolveCurrentWeeklynet } from "./network";
import { loadStezSnapshot, StezSnapshot } from "./rpc";

jest.mock("../../functions/beacon", () => ({
  connectWalletToCustomNetwork: jest.fn(),
}));

const weeklynet = {
  key: "weeklynet-2026-08-05",
  name: "Weeklynet" as const,
  rpcUrl: "https://rpc.weeklynet-2026-08-05.teztnets.com",
  faucetUrl: "https://faucet.weeklynet-2026-08-05.teztnets.com",
  chainId: "NetXmT6tP86uFqw",
  activatedOn: "2026-08-05",
  info: {
    tezosServer: "https://rpc.weeklynet-2026-08-05.teztnets.com",
    rpcFallbacks: [],
    chainId: "NetXmT6tP86uFqw",
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
  return { ...actual, resolveCurrentWeeklynet: jest.fn() };
});
jest.mock("./rpc", () => {
  const actual = jest.requireActual("./rpc");
  return { ...actual, loadStezSnapshot: jest.fn() };
});

const baseSnapshot: StezSnapshot = {
  availability: "available",
  endpoint: weeklynet.rpcUrl,
  chainId: weeklynet.chainId,
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
  (resolveCurrentWeeklynet as jest.Mock).mockResolvedValue(weeklynet);
  (loadStezSnapshot as jest.Mock).mockResolvedValue(baseSnapshot);
});

test("loads live Weeklynet data and its matching faucet", async () => {
  render(<Stez />);

  expect(screen.getByText("Loading sTEZ data")).toBeInTheDocument();
  await screen.findByText("sTEZ is live on Weeklynet");

  expect(
    screen.getByText(/Weeklynet resets every Wednesday/)
  ).toBeInTheDocument();
  expect(screen.getByText("Stake tez, stay liquid.")).toBeInTheDocument();
  expect(screen.getByText("sTEZ Balance")).toBeInTheDocument();
  expect(screen.getByText("Total sTEZ supply")).toBeInTheDocument();

  const faucet = screen.getByRole("link", {
    name: "Get Weeklynet test XTZ from the official Teztnets faucet",
  });
  expect(faucet).toHaveAttribute("href", weeklynet.faucetUrl);
  expect(faucet.querySelector("svg")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Redeem" }));
  expect(screen.getByText("YOU REDEEM")).toBeInTheDocument();
  expect(screen.getByText("XTZ ENTERING REDEMPTION")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Finalize" }));
  expect(screen.getByText("READY TO FINALIZE")).toBeInTheDocument();
});

test("shows an exact inactive-network state without enabling controls", async () => {
  (loadStezSnapshot as jest.Mock).mockResolvedValue({
    ...baseSnapshot,
    availability: "disabled",
    contractHash: null,
  });

  render(<Stez />);

  await screen.findByText("sTEZ is not active on Weeklynet");
  expect(
    screen.getByText(
      "The selected network includes the sTEZ protocol code, but native sTEZ contracts are not enabled. No balances, rates, or transaction controls are shown."
    )
  ).toBeInTheDocument();
});

test("enables a stake request only for a wallet connected to current Weeklynet", async () => {
  mockWallet.isWalletConnected = true;
  mockWallet.address = "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";
  mockWallet.client = mockClient;
  mockClient.getActiveAccount.mockResolvedValue({
    address: mockWallet.address,
    network: { type: "custom", rpcUrl: weeklynet.rpcUrl },
  });
  (loadStezSnapshot as jest.Mock).mockResolvedValue({
    ...baseSnapshot,
    walletXtzMutez: BigInt(5_000_000),
    walletStezUnits: BigInt(2_000_000),
    redeemedFrozenMutez: BigInt(250_000),
    redeemedFinalizableMutez: BigInt(100_000),
  });

  render(<Stez />);

  await screen.findByText("sTEZ is live on Weeklynet");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "ENTER AN AMOUNT" })
    ).toBeDisabled()
  );

  fireEvent.change(screen.getByLabelText("YOU STAKE"), {
    target: { value: "1" },
  });
  expect(screen.getByRole("button", { name: "STAKE XTZ" })).toBeEnabled();
});

test("connects a disconnected wallet to the resolved Weeklynet RPC", async () => {
  render(<Stez />);
  await screen.findByText("sTEZ is live on Weeklynet");

  fireEvent.click(
    screen.getByRole("button", { name: "CONNECT WALLET TO WEEKLYNET" })
  );

  await waitFor(() =>
    expect(connectWalletToCustomNetwork).toHaveBeenCalledWith(mockWallet, {
      name: "Weeklynet",
      rpcUrl: weeklynet.rpcUrl,
    })
  );
});
