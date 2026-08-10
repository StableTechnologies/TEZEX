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

const mockWallet: {
  isWalletConnected: boolean;
  address: string | null;
} = {
  isWalletConnected: false,
  address: null,
};
let mockNetworkType = NetworkType.MAINNET;

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

const availableSnapshot: StezSnapshot = {
  ...disabledSnapshot,
  availability: "available",
  contractHash: "KT1StezNativeContract",
  totalSupplyUnits: BigInt(1_000_000),
  totalBackingMutez: BigInt(1_100_000),
  rateNumeratorMutez: BigInt(1_100_000),
  rateDenominatorTokenUnits: BigInt(1_000_000),
  walletXtzMutez: BigInt(5_000_000),
  walletStezUnits: BigInt(2_000_000),
  redeemedFrozenMutez: BigInt(250_000),
  redeemedFinalizableMutez: BigInt(100_000),
  detail: "sTEZ is active.",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockNetworkType = NetworkType.MAINNET;
  mockWallet.isWalletConnected = false;
  mockWallet.address = null;
  (loadStezSnapshot as jest.Mock).mockResolvedValue(disabledSnapshot);
});

test("uses the Mainnet preview copy without showing a testnet faucet", async () => {
  render(<Stez />);

  expect(screen.getByText("Loading sTEZ data")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByText("sTEZ is not active on Mainnet")
    ).toBeInTheDocument()
  );
  expect(
    screen.getByText(
      "This page is a read-only preview of the sTEZ staking flow. You can explore staking, redemption, and finalization, but Mainnet transactions are not enabled. Activation would require a future Tezos protocol upgrade."
    )
  ).toBeInTheDocument();
  expect(screen.getByText("Stake tez, stay liquid.")).toBeInTheDocument();
  expect(
    screen.getByText(
      "sTEZ is Tezos’s protocol-native liquid staking token. Stake XTZ to receive sTEZ, a token you can hold, transfer, or use in supported applications while its backing XTZ earns staking rewards. The protocol automatically assigns the pool’s staking power across participating bakers, so you do not need to choose one."
    )
  ).toBeInTheDocument();
  expect(screen.getByText("sTEZ Balance")).toBeInTheDocument();
  expect(screen.getByText("Wallet XTZ")).toBeInTheDocument();
  expect(screen.getByText("Pending Redemption")).toBeInTheDocument();
  expect(screen.getByText("Ready to Finalize")).toBeInTheDocument();
  expect(screen.getByText(/Staking XTZ mints sTEZ/)).toBeInTheDocument();
  expect(screen.getByText("Total sTEZ supply")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Stake" })).toBeInTheDocument();
  expect(
    screen.queryByRole("tab", { name: "Deposit" })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", {
      name: "Get Shadownet test XTZ from the official faucet",
    })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /check stez availability again/i })
  ).not.toBeInTheDocument();
  expect(screen.getAllByText(/block 14,286,000/i)).toHaveLength(2);

  fireEvent.click(screen.getByRole("tab", { name: "Redeem" }));
  expect(screen.getByText("YOU REDEEM")).toBeInTheDocument();
  expect(screen.getByText("XTZ ENTERING REDEMPTION")).toBeInTheDocument();
  expect(
    screen.getByText(
      "Redeeming burns sTEZ and begins a delayed withdrawal of the corresponding XTZ. The XTZ remains frozen and slashable until the redemption delay ends, then must be finalized before it returns to your wallet."
    )
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Finalize" }));
  expect(screen.getByText("READY TO FINALIZE")).toBeInTheDocument();
  expect(
    screen.getByText(
      "After the redemption delay has elapsed, finalization releases all matured XTZ to the original redeemer. Anyone may submit the operation, but the funds can only be sent to that redeemer."
    )
  ).toBeInTheDocument();
});

test("uses the inactive Mainnet action label after a wallet is connected", async () => {
  mockWallet.isWalletConnected = true;
  mockWallet.address = "tz1MainnetWallet";

  render(<Stez />);

  await screen.findByText("sTEZ is not active on Mainnet");
  expect(
    screen.getByRole("button", { name: "sTEZ NOT ACTIVE ON MAINNET" })
  ).toBeDisabled();
});

test("shows the Shadownet faucet only for an active Shadownet snapshot", async () => {
  mockNetworkType = NetworkType.SHADOWNET;
  (loadStezSnapshot as jest.Mock).mockResolvedValue(availableSnapshot);

  render(<Stez />);

  await screen.findByText("sTEZ is active on Shadownet");
  expect(
    screen.getByText(
      "Live sTEZ protocol data was read from block 14,286,000. Transaction signing is not yet enabled in this interface."
    )
  ).toBeInTheDocument();
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
    screen.getByText(
      "Rewards do not increase your sTEZ balance. Instead, they increase the amount of XTZ each sTEZ can redeem for. Baker fees reduce the rewards passed through, and slashing can lower the redemption rate."
    )
  ).toBeInTheDocument();
});

test.each([
  [
    "unsupported" as const,
    "sTEZ is not supported on Mainnet",
    "The selected network does not expose a compatible sTEZ implementation. No balances, rates, or transaction controls are shown.",
  ],
  [
    "unreachable" as const,
    "Unable to load sTEZ data",
    "TEZEX could not verify the sTEZ contract or read its current state from the selected network. No cached or estimated values have been substituted.",
  ],
])("renders exact %s state copy", async (availability, title, description) => {
  (loadStezSnapshot as jest.Mock).mockResolvedValue({
    ...disabledSnapshot,
    availability,
  });

  render(<Stez />);

  await screen.findByText(title);
  expect(screen.getByText(description)).toBeInTheDocument();
});

test("uses amount and signing-preview states on an active network", async () => {
  mockNetworkType = NetworkType.SHADOWNET;
  mockWallet.isWalletConnected = true;
  mockWallet.address = "tz1ShadownetWallet";
  (loadStezSnapshot as jest.Mock).mockResolvedValue(availableSnapshot);

  render(<Stez />);

  await screen.findByText("sTEZ is active on Shadownet");
  expect(
    screen.getByRole("button", { name: "ENTER AN AMOUNT" })
  ).toBeDisabled();

  fireEvent.change(screen.getByLabelText("YOU STAKE"), {
    target: { value: "1" },
  });

  expect(
    screen.getByRole("button", {
      name: "TRANSACTIONS NOT ENABLED IN THIS PREVIEW",
    })
  ).toBeDisabled();
});

test("uses the existing wallet connection flow", async () => {
  render(<Stez />);
  await screen.findByText("sTEZ is not active on Mainnet");

  fireEvent.click(screen.getByRole("button", { name: "CONNECT WALLET" }));

  expect(connectWallet).toHaveBeenCalledTimes(1);
});
