import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Wallet } from "./Wallet";

const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockConnectOverride = jest.fn().mockResolvedValue(undefined);
const mockWallet = {
  address: "tz1d4ExampleAccountAddressMuU7n",
  isWalletConnected: true,
  disconnect: mockDisconnect,
};

jest.mock("../../hooks/wallet", () => ({
  useWallet: () => mockWallet,
  useWalletConnected: () => true,
  useWalletOps: jest.fn(),
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
  mockDisconnect.mockClear();
  mockConnectOverride.mockClear();
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
  expect(screen.getByText("Snet")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Switch wallet" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Disconnect" })).toBeVisible();
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
