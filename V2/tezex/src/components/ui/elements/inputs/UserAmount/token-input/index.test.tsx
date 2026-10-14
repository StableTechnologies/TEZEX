import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  Asset,
  Token,
  TokenType,
  TransactingComponent,
  TransferType,
} from "../../../../../../types/general";
import { TokenAmountInput } from ".";

const mockUpdateAmount = jest.fn().mockResolvedValue(undefined);

let mockTransactionOps: {
  getActiveTransaction: jest.Mock;
  loading: boolean;
  swapFields: jest.Mock;
  trackedAsset: {
    amount: { string: string };
    balance: { string: string };
  };
  updateAmount: jest.Mock;
};

jest.mock("../../../../../../hooks/transaction", () => ({
  useTransaction: () => mockTransactionOps,
}));

jest.mock("../../../../../session/WalletConnected", () => ({
  WalletConnected: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("../../../../../../hooks/styles", () => () => ({
  tezex: {
    root: {},
    header: {},
    label: {},
    validationMessage: {},
    balance: {},
    amountRow: {},
    textField: {},
    tokenPill: {},
    tokenLabel: {},
  },
}));

const tez: Asset = {
  name: Token.XTZ,
  label: "Tez",
  logo: "",
  address: "",
  decimals: 6,
  type: TokenType.XTZ,
};

const renderInput = (loading: boolean, readOnly = false) =>
  render(
    <TokenAmountInput
      component={TransactingComponent.ADD_LIQUIDITY}
      transferType={TransferType.SEND}
      asset={tez}
      label={readOnly ? "Required deposit" : "You deposit"}
      loading={loading}
      readOnly={readOnly}
      visualVariant="tezex"
    />
  );

beforeEach(() => {
  jest.useFakeTimers();
  mockUpdateAmount.mockClear();
  mockTransactionOps = {
    getActiveTransaction: jest.fn(() => ({ id: "transaction-1" })),
    loading: true,
    swapFields: jest.fn().mockResolvedValue(undefined),
    trackedAsset: {
      amount: { string: "0.00" },
      balance: { string: "10" },
    },
    updateAmount: mockUpdateAmount,
  };
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test("preserves an amount entered while the transaction model finishes loading", async () => {
  const view = renderInput(true);
  const input = screen.getByRole("textbox", { name: "You deposit amount" });

  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "1" } });

  expect(input).toHaveValue("1");
  expect(mockUpdateAmount).not.toHaveBeenCalled();

  mockTransactionOps.loading = false;
  view.rerender(
    <TokenAmountInput
      component={TransactingComponent.ADD_LIQUIDITY}
      transferType={TransferType.SEND}
      asset={tez}
      label="You deposit"
      loading={false}
      visualVariant="tezex"
    />
  );

  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  await act(async () => {
    jest.advanceTimersByTime(100);
  });

  expect(input).toHaveValue("1");
  expect(mockUpdateAmount).toHaveBeenCalledTimes(1);
  expect(mockUpdateAmount).toHaveBeenCalledWith("1", undefined, "tokenInput");
});

test("updates the read-only paired amount when a quote arrives", () => {
  mockTransactionOps.loading = false;
  const view = renderInput(false, true);
  const input = screen.getByRole("textbox", {
    name: "Required deposit amount",
  });

  expect(input).toHaveValue("0.00");

  mockTransactionOps.trackedAsset = {
    amount: { string: "0.317987" },
    balance: { string: "10" },
  };
  view.rerender(
    <TokenAmountInput
      component={TransactingComponent.ADD_LIQUIDITY}
      transferType={TransferType.SEND}
      asset={tez}
      label="Required deposit"
      loading={false}
      readOnly
      visualVariant="tezex"
    />
  );

  expect(input).toHaveValue("0.317987");
});
