import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Wallet } from "./Wallet";
import { TransactionStatus, TransactingComponent } from "../../types/general";

let mockTransactionStatus = TransactionStatus.ZERO_AMOUNT;
const mockWalletOps = { getTransactionStatus: () => mockTransactionStatus };

const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockConnectOverride = jest.fn().mockResolvedValue(undefined);
const mockZeroAmount = jest.fn();
const mockWallet = {
  address: "tz1d4ExampleAccountAddressMuU7n",
  isWalletConnected: true,
  disconnect: mockDisconnect,
};

jest.mock("../../hooks/wallet", () => ({
  useWallet: () => mockWallet,
  useWalletConnected: () => true,
  useWalletOps: () => mockWalletOps,
}));

jest.mock("../../hooks/network", () => ({
  useNetwork: () => ({
    network: "mainnet",
    info: {},
  }),
}));

jest.mock("../../functions/beacon", () => ({
  __esModule: true,
  default: jest.fn(),
}));

beforeEach(() => {
  mockTransactionStatus = TransactionStatus.ZERO_AMOUNT;
  mockDisconnect.mockClear();
  mockConnectOverride.mockClear();
  mockZeroAmount.mockClear();
});

const renderWallet = () =>
  render(
    <MemoryRouter initialEntries={["/stez"]}>
      <Wallet
        variant="header"
        visualVariant="dark"
        accountPresentation="drawer"
        connectOverride={mockConnectOverride}
      />
    </MemoryRouter>
  );

test("opens account details without disconnecting the wallet", () => {
  renderWallet();

  fireEvent.click(
    screen.getByRole("button", { name: /Open wallet account menu/i })
  );

  expect(mockDisconnect).not.toHaveBeenCalled();
  expect(screen.getAllByText(mockWallet.address).length).toBeGreaterThan(0);
  const networkControl = screen.getByRole("button", {
    name: "Network: Snet, live",
  });
  expect(networkControl).toBeVisible();
  expect(screen.getByRole("button", { name: "Switch wallet" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Disconnect" })).toBeVisible();

  fireEvent.click(networkControl);
  expect(screen.getByText("Current network")).toBeInTheDocument();
  expect(screen.getByText("Public testnet")).toBeInTheDocument();
});

test("switch wallet disconnects deliberately before reconnecting", async () => {
  renderWallet();

  fireEvent.click(
    screen.getByRole("button", { name: /Open wallet account menu/i })
  );
  fireEvent.click(screen.getByRole("button", { name: "Switch wallet" }));

  await waitFor(() => expect(mockDisconnect).toHaveBeenCalledTimes(1));
  expect(mockConnectOverride).toHaveBeenCalledTimes(1);
});

test("disconnect is only called from the explicit action", async () => {
  renderWallet();

  fireEvent.click(
    screen.getByRole("button", { name: /Open wallet account menu/i })
  );
  fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

  await waitFor(() => expect(mockDisconnect).toHaveBeenCalledTimes(1));
  expect(mockConnectOverride).not.toHaveBeenCalled();
});

test("keeps the normal action available and delegates zero-amount validation", () => {
  render(
    <MemoryRouter>
      <Wallet visualVariant="dark" onZeroAmount={mockZeroAmount}>
        Swap
      </Wallet>
    </MemoryRouter>
  );

  const action = screen.getByRole("button", { name: "Swap" });
  expect(action).toBeEnabled();
  expect(screen.getByText("Swap")).toHaveStyle({
    fontFamily: "inherit",
    fontWeight: "inherit",
    fontSize: "inherit",
    lineHeight: "1",
    letterSpacing: "inherit",
    textTransform: "inherit",
  });

  fireEvent.click(action);

  expect(mockZeroAmount).toHaveBeenCalledTimes(1);
});

test.each<[TransactingComponent, string]>([
  [TransactingComponent.ADD_LIQUIDITY, "Add Liquidity"],
  [TransactingComponent.REMOVE_LIQUIDITY, "Remove Liquidity"],
  [TransactingComponent.SWAP, "Swap"],
])(
  "updates the %s action when a stable status getter returns a new status",
  (component, label) => {
    const submit = jest.fn();
    const action = () => (
      <MemoryRouter>
        <Wallet component={component} callback={submit} visualVariant="dark">
          {label}
        </Wallet>
      </MemoryRouter>
    );
    const { rerender } = render(action());
    expect(screen.getByRole("button", { name: "Enter Amount" })).toBeDisabled();

    mockTransactionStatus = TransactionStatus.MODIFIED;
    rerender(action());
    expect(
      screen.getByRole("button", { name: "Fetching quote" })
    ).toBeDisabled();

    mockTransactionStatus = TransactionStatus.SUFFICIENT_BALANCE;
    rerender(action());
    const readyButton = screen.getByRole("button", { name: label });
    expect(readyButton).toBeEnabled();
    fireEvent.click(readyButton);
    expect(submit).toHaveBeenCalledTimes(1);

    mockTransactionStatus = TransactionStatus.INSUFFICIENT_BALANCE;
    rerender(action());
    expect(
      screen.getByRole("button", {
        name: TransactionStatus.INSUFFICIENT_BALANCE,
      })
    ).toBeDisabled();

    mockTransactionStatus = TransactionStatus.PENDING;
    rerender(action());
    const pendingButton = screen.getByRole("button", {
      name: "Confirm in wallet",
    });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(submit).toHaveBeenCalledTimes(1);

    mockTransactionStatus = TransactionStatus.SUBMITTED;
    rerender(action());
    expect(
      screen.getByRole("button", { name: "Confirming on Tezos" })
    ).toBeDisabled();

    mockTransactionStatus = TransactionStatus.COMPLETED;
    rerender(action());
    expect(screen.getByRole("button", { name: "Confirmed" })).toBeDisabled();
  }
);
