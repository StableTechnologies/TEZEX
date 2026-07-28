import React from "react";
import { render, screen } from "@testing-library/react";

import {
  Asset,
  TransactingComponent,
  TransferType,
} from "../../../../../types/general";
import { UserAmountField } from ".";

jest.mock("./token-input", () => ({
  TokenAmountInput: ({
    asset,
    loading,
  }: {
    asset: Asset;
    loading?: boolean;
  }) => (
    <div data-testid="token-amount-input">
      {asset.label}:{loading ? "loading" : "ready"}
    </div>
  ),
}));

const tez = { label: "Tez" } as Asset;
const usdTz = { label: "USDtz" } as Asset;

describe("UserAmountField", () => {
  it("keeps the amount control mounted while a new pool initializes", () => {
    const { rerender } = render(
      <UserAmountField
        component={TransactingComponent.SWAP}
        transferType={TransferType.SEND}
        asset={tez}
        loading={false}
      />
    );
    const amountControl = screen.getByTestId("token-amount-input");

    rerender(
      <UserAmountField
        component={TransactingComponent.SWAP}
        transferType={TransferType.SEND}
        asset={usdTz}
        loading
      />
    );

    expect(screen.getByTestId("token-amount-input")).toBe(amountControl);
    expect(amountControl).toHaveTextContent("USDtz:loading");
  });
});
