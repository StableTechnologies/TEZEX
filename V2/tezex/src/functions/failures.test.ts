import { Errors, TransactingComponent } from "../types/general";
import {
  normalizeTransactionFailure,
  SubmittedOperationError,
} from "./failures";

describe("normalizeTransactionFailure", () => {
  it("turns a wallet cancellation into clear, safe copy", () => {
    expect(
      normalizeTransactionFailure(
        new Error("Beacon request aborted by the user"),
        TransactingComponent.SWAP
      )
    ).toEqual({
      reason: Errors.WALLET_REJECTED,
      detail: "Beacon request aborted by the user",
      component: TransactingComponent.SWAP,
      network: undefined,
      submitted: false,
      safeToRetry: true,
    });
  });

  it("recognizes network confirmation failures without exposing an object", () => {
    expect(
      normalizeTransactionFailure({
        errorData: { description: "RPC confirmation timed out" },
      })
    ).toEqual({
      reason: Errors.NETWORK_CONFIRMATION,
      detail: "RPC confirmation timed out",
      component: undefined,
      network: undefined,
      submitted: false,
      safeToRetry: true,
    });
  });

  it("preserves an existing public reason without duplicating details", () => {
    expect(normalizeTransactionFailure(Errors.SLIPPAGE)).toEqual({
      reason: Errors.SLIPPAGE,
      detail: undefined,
      component: undefined,
      network: undefined,
      submitted: false,
      safeToRetry: true,
    });
  });

  it("preserves a submitted hash and blocks retry when status is unknown", () => {
    expect(
      normalizeTransactionFailure(
        new SubmittedOperationError(
          "operation-hash",
          "unknown",
          new Error("RPC confirmation timed out")
        ),
        TransactingComponent.SWAP,
        "mainnet" as never
      )
    ).toMatchObject({
      reason: Errors.NETWORK_CONFIRMATION,
      detail: "RPC confirmation timed out",
      opHash: "operation-hash",
      submitted: true,
      safeToRetry: false,
    });
  });
});
