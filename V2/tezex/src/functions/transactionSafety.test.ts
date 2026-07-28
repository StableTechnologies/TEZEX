import BigNumber from "bignumber.js";

import {
  getStatusAfterBalanceCheck,
  getSlippageValidationMessage,
  getSpendableXtz,
  isValidSlippage,
  MAX_SLIPPAGE_PERCENT,
  MIN_SLIPPAGE_PERCENT,
  shouldApplySlippageUpdate,
  shouldApplyTransactionStatus,
  XTZ_FEE_RESERVE_TEZ,
} from "./transactionSafety";
import { TransactionStatus } from "../types/general";

describe("transaction safety limits", () => {
  it("accepts the supported slippage range and rejects unsafe values", () => {
    expect(isValidSlippage(MIN_SLIPPAGE_PERCENT)).toBe(true);
    expect(isValidSlippage(MAX_SLIPPAGE_PERCENT)).toBe(true);
    expect(isValidSlippage(0)).toBe(false);
    expect(isValidSlippage(100)).toBe(false);
    expect(isValidSlippage(Number.NaN)).toBe(false);
  });

  it("returns useful validation copy for custom slippage", () => {
    expect(getSlippageValidationMessage("0.01")).toMatch(/at least/i);
    expect(getSlippageValidationMessage("50")).toMatch(/capped/i);
    expect(getSlippageValidationMessage("0.5")).toBeUndefined();
  });

  it("restores transaction state when invalid slippage is corrected", () => {
    expect(
      shouldApplySlippageUpdate(0.5, 0.5, TransactionStatus.INVALID_SLIPPAGE)
    ).toBe(true);
    expect(
      shouldApplySlippageUpdate(0.5, 1, TransactionStatus.INVALID_SLIPPAGE)
    ).toBe(true);
    expect(
      shouldApplySlippageUpdate(0.5, 0.5, TransactionStatus.SUFFICIENT_BALANCE)
    ).toBe(false);
  });

  it("does not reapply an unchanged invalid transaction status", () => {
    expect(
      shouldApplyTransactionStatus(
        TransactionStatus.INVALID_SLIPPAGE,
        TransactionStatus.INVALID_SLIPPAGE
      )
    ).toBe(false);
    expect(
      shouldApplySlippageUpdate(
        0.5,
        MAX_SLIPPAGE_PERCENT + 1,
        TransactionStatus.INVALID_SLIPPAGE
      )
    ).toBe(false);
    expect(
      shouldApplyTransactionStatus(
        TransactionStatus.SUFFICIENT_BALANCE,
        TransactionStatus.INVALID_SLIPPAGE
      )
    ).toBe(true);
  });

  it("keeps invalid slippage authoritative during balance refreshes", () => {
    expect(
      getStatusAfterBalanceCheck(
        TransactionStatus.INVALID_SLIPPAGE,
        TransactionStatus.SUFFICIENT_BALANCE
      )
    ).toBe(TransactionStatus.INVALID_SLIPPAGE);
    expect(
      getStatusAfterBalanceCheck(
        TransactionStatus.INVALID_SLIPPAGE,
        TransactionStatus.INSUFFICIENT_BALANCE
      )
    ).toBe(TransactionStatus.INVALID_SLIPPAGE);
    expect(
      getStatusAfterBalanceCheck(
        TransactionStatus.MODIFIED,
        TransactionStatus.SUFFICIENT_BALANCE
      )
    ).toBe(TransactionStatus.SUFFICIENT_BALANCE);
  });

  it("reserves tez for fees when calculating a max amount", () => {
    expect(getSpendableXtz(new BigNumber(1)).toFixed()).toBe(
      new BigNumber(1).minus(XTZ_FEE_RESERVE_TEZ).toFixed()
    );
    expect(getSpendableXtz(new BigNumber("0.01")).toFixed()).toBe("0");
  });
});
