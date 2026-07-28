import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AddLiquidity } from ".";
import {
  Asset,
  Balance,
  Token,
  TokenType,
  Transaction,
  TransactionStatus,
  TransactingComponent,
} from "../../types/general";

const mockTez: Asset = {
  name: Token.XTZ,
  label: "Tez",
  logo: "",
  address: "",
  decimals: 6,
  type: TokenType.XTZ,
};

const mockTzbtc: Asset = {
  name: Token.TzBTC,
  label: "tzBTC",
  logo: "",
  address: "KT1-token",
  decimals: 8,
  type: TokenType.FA12,
};

const mockSirs: Asset = {
  name: Token.Sirs,
  label: "Sirs",
  logo: "",
  address: "KT1-lp",
  decimals: 6,
  type: TokenType.FA12,
};

const balance = (value: string): Balance => {
  const decimal = new BigNumber(value);
  return {
    decimal,
    mantissa: decimal.times(1_000_000),
    string: value,
    greaterOrEqualTo: (other) => decimal.gte(other.decimal),
  };
};

const makeTransaction = (
  sendAsset: [Asset, Asset],
  id = "transaction-1"
): Transaction => ({
  id,
  network: "mainnet" as Transaction["network"],
  component: TransactingComponent.ADD_LIQUIDITY,
  poolId: "sirius",
  sendAsset,
  sendAmount: [balance("1"), balance("2")],
  sendAssetBalance: [balance("10"), balance("10")],
  receiveAsset: [mockSirs],
  receiveAmount: [balance("1")],
  receiveAssetBalance: [balance("0")],
  slippage: 0.5,
  transactionStatus: TransactionStatus.SUFFICIENT_BALANCE,
  lastModified: new Date(),
  locked: false,
});

let mockActiveTransaction = makeTransaction([mockTez, mockTzbtc]);
const mockSwapFields = jest.fn();

const mockTransactionOps = {
  initialize: jest.fn().mockResolvedValue(true),
  swapFields: mockSwapFields,
  getActiveTransaction: jest.fn(),
};

jest.mock("../../hooks/styles", () => () => ({}));
jest.mock("../../hooks/network", () => ({
  useNetwork: () => ({
    selectedPool: {
      id: "sirius",
      tokenA: mockTez.name,
      tokenB: mockTzbtc.name,
      lpToken: mockSirs.name,
    },
    getAsset: (token: Token) =>
      token === mockTez.name
        ? mockTez
        : token === mockTzbtc.name
        ? mockTzbtc
        : mockSirs,
    getAllPools: () => [],
    setSelectedPool: jest.fn(),
    toolkit: undefined,
    network: "mainnet",
  }),
}));
jest.mock("../../hooks/session", () => ({
  useSession: () => ({
    activeComponent: mockActiveTransaction.component,
    loadComponent: jest.fn(),
  }),
}));
jest.mock("../../hooks/wallet", () => ({
  useWallet: () => ({ address: undefined, clearTransaction: jest.fn() }),
  useWalletOps: () => ({
    getActiveTransaction: () => mockActiveTransaction,
    sendTransaction: jest.fn(),
  }),
}));
jest.mock("../../hooks/transaction", () => ({
  useTransaction: () => mockTransactionOps,
}));
jest.mock("../../components/ui/elements/inputs", () => ({
  UserAmountField: ({
    asset,
    label,
    readOnly,
  }: {
    asset: Asset;
    label: string;
    readOnly: boolean;
  }) => (
    <div
      data-testid={label}
      data-asset={asset.label}
      data-readonly={String(readOnly)}
    />
  ),
  Slippage: () => <div />,
}));
jest.mock("../wallet", () => ({
  Wallet: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));
jest.mock("../nav/NavLiquidity", () => ({ NavLiquidity: () => <div /> }));
jest.mock("../ui/elements/PoolSelector", () => ({
  PoolSelector: () => <div />,
}));

beforeEach(() => {
  mockActiveTransaction = makeTransaction([mockTez, mockTzbtc]);
  mockTransactionOps.getActiveTransaction.mockImplementation(
    () => mockActiveTransaction
  );
  mockSwapFields.mockImplementation(async () => {
    mockActiveTransaction = makeTransaction(
      [mockTzbtc, mockTez],
      "transaction-2"
    );
  });
});

test("switches which pool token is the editable deposit", async () => {
  render(<AddLiquidity orientation="portrait" />);

  await waitFor(() =>
    expect(mockTransactionOps.getActiveTransaction).toHaveBeenCalled()
  );

  const switchButton = await screen.findByRole("button", {
    name: "Switch deposit token order",
  });

  await waitFor(() => expect(switchButton).toBeEnabled());
  expect(screen.getByTestId("You deposit")).toHaveAttribute(
    "data-asset",
    "Tez"
  );
  expect(screen.getByTestId("You deposit")).toHaveAttribute(
    "data-readonly",
    "false"
  );
  expect(screen.getByTestId("Required deposit")).toHaveAttribute(
    "data-asset",
    "tzBTC"
  );

  fireEvent.click(switchButton);

  expect(screen.getByTestId("You deposit")).toHaveAttribute(
    "data-asset",
    "tzBTC"
  );
  await waitFor(() => expect(mockSwapFields).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("Required deposit")).toHaveAttribute(
    "data-asset",
    "Tez"
  );
  expect(screen.getByTestId("Required deposit")).toHaveAttribute(
    "data-readonly",
    "true"
  );
});
