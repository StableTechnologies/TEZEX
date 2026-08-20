import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Alert } from "./Alerts";
import {
  CompletionRecord,
  CompletionState,
  Errors,
  TransactingComponent,
} from "../../../../types/general";

jest.mock("../../../../functions/util", () => ({
  formatWithSubscript: () => "",
  getExplorer: () => "https://tzkt.io/",
}));

jest.mock("../../../../hooks/styles", () => ({
  __esModule: true,
  default: (styleFactory: (theme: null, scale: number) => unknown) =>
    styleFactory(null, 1),
}));

describe("failure alert", () => {
  it("explains a failed swap and returns the user to review it", () => {
    const clear = jest.fn();
    const completionRecord: CompletionRecord = [
      CompletionState.FAILED,
      {
        reason: Errors.WALLET_REJECTED,
        detail: "Beacon request aborted by the user",
        component: TransactingComponent.SWAP,
      },
    ];

    render(<Alert completionRecord={completionRecord} clear={clear} />);

    expect(
      screen.getByRole("heading", { name: "Swap failed" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("The request was declined in your wallet.")
    ).toBeInTheDocument();
    expect(screen.getByText("Before you retry")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Technical details" }));
    expect(
      screen.getByText(/Beacon request aborted by the user/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Review swap" }));
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("blocks a blind retry and links the submitted operation when confirmation is unknown", () => {
    const completionRecord: CompletionRecord = [
      CompletionState.FAILED,
      {
        reason: Errors.NETWORK_CONFIRMATION,
        component: TransactingComponent.SWAP,
        opHash: "operation-hash",
        network: "mainnet" as never,
        submitted: true,
        safeToRetry: false,
      },
    ];

    render(<Alert completionRecord={completionRecord} clear={jest.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Confirmation not verified" })
    ).toBeInTheDocument();
    expect(screen.getByText("Do not retry yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View operation on TzKT" })
    ).toHaveAttribute("href", "https://tzkt.io/operation-hash");
    expect(
      screen.queryByRole("button", { name: /retry/i })
    ).not.toBeInTheDocument();
  });
});

describe("success alert", () => {
  it("shows the complete operation hash", () => {
    const opHash =
      "ooLsmXLFQfhr2ZptqbCgoRZnBsR1fohNvwKaKHdtFPaiCUkA9eYr";
    const completionRecord: CompletionRecord = [
      CompletionState.SUCCESS,
      {
        opHash,
        tx: {
          sendAsset: [],
          receiveAsset: [],
          sendAmount: [],
          receiveAmount: [],
          network: "mainnet",
        } as never,
      },
    ];

    render(<Alert completionRecord={completionRecord} clear={jest.fn()} />);

    expect(screen.getByText(opHash)).toBeInTheDocument();
    expect(screen.queryByText(/ooLsm.*….*A9eYr/)).not.toBeInTheDocument();
  });
});
