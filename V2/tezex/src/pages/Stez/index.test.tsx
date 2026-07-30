import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NetworkType } from "@airgap/beacon-sdk";

import { Stez } from ".";
import connectWallet from "../../functions/beacon";
import { loadStezSnapshot, StezSnapshot, USHUAIA_PROTOCOL } from "./rpc";

jest.mock("../../functions/beacon", () => jest.fn());

const mockNetworkInfo = {
  tezosServer: "https://rpc.example",
  rpcFallbacks: [],
  chainId: "NetXdQprcVkpaWU",
  pools: [],
  assets: [],
};

const mockWallet = {
  isWalletConnected: false,
  address: null,
};
const mockNetworkType = NetworkType.MAINNET;

jest.mock("../../hooks/network", () => ({
  useNetwork: () => ({
    network: mockNetworkType,
    info: mockNetworkInfo,
  }),
}));
jest.mock("../../hooks/wallet", () => ({
  useWallet: () => mockWallet,
}));
jest.mock("./rpc", () => {
  const actual = jest.requireActual("./rpc");
  return { ...actual, loadStezSnapshot: jest.fn() };
});

const disabledSnapshot: StezSnapshot = {
  availability: "disabled",
  endpoint: "https://rpc.example",
  chainId: "NetXdQprcVkpaWU",
  protocolHash: USHUAIA_PROTOCOL,
  blockHash: "BLockHash",
  blockLevel: BigInt(14_286_000),
  blockTimestamp: "2026-07-30T12:00:00Z",
  contractHash: null,
  totalSupplyUnits: null,
  totalBackingMutez: null,
  rateNumeratorMutez: null,
  rateDenominatorTokenUnits: null,
  walletXtzMutez: null,
  walletStezUnits: null,
  redeemedFrozenMutez: null,
  redeemedFinalizableMutez: null,
  checkedAt: Date.now(),
  detail: "The sTEZ feature is not active.",
};

beforeEach(() => {
  jest.clearAllMocks();
  (loadStezSnapshot as jest.Mock).mockResolvedValue(disabledSnapshot);
});

test("renders the real capability gate and keeps action states interactive", async () => {
  render(<Stez />);

  expect(screen.getByText("Checking sTEZ availability")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByText("Preview sTEZ before Mainnet")).toBeInTheDocument()
  );
  expect(screen.getByText(/sTEZ is testnet-only for now/i)).toBeInTheDocument();
  expect(screen.getByText(/Mainnet support will follow/i)).toBeInTheDocument();
  expect(screen.getByText("Liquid sTEZ")).toBeInTheDocument();
  expect(screen.getByText(/Depositing XTZ mints sTEZ/)).toBeInTheDocument();
  expect(screen.getByText("Total sTEZ supply")).toBeInTheDocument();
  const faucetLink = screen.getByRole("link", {
    name: "Get Shadownet test XTZ from the official faucet",
  });
  expect(faucetLink).toHaveAttribute(
    "href",
    "https://faucet.shadownet.teztnets.com"
  );
  expect(faucetLink.querySelector("svg")).toBeInTheDocument();
  expect(faucetLink).not.toHaveTextContent("↗");
  expect(
    screen.queryByRole("button", { name: /check stez availability again/i })
  ).not.toBeInTheDocument();
  expect(screen.getByText(/block 14,286,000/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Redeem" }));
  expect(screen.getByText("YOU REDEEM")).toBeInTheDocument();
  expect(screen.getByText("REDEMPTION VALUE")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Finalize" }));
  expect(screen.getByText("READY TO FINALIZE")).toBeInTheDocument();
});

test("uses the existing wallet connection flow", async () => {
  render(<Stez />);
  await screen.findByText("Preview sTEZ before Mainnet");

  fireEvent.click(screen.getByRole("button", { name: "CONNECT WALLET" }));

  expect(connectWallet).toHaveBeenCalledTimes(1);
});
