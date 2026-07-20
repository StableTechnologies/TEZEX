import BigNumber from "bignumber.js";

import {
  getSlippageValidationMessage,
  getSpendableXtz,
  isValidSlippage,
  MAX_SLIPPAGE_PERCENT,
  MIN_SLIPPAGE_PERCENT,
  XTZ_FEE_RESERVE_TEZ,
} from "./transactionSafety";

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

  it("reserves tez for fees when calculating a max amount", () => {
    expect(getSpendableXtz(new BigNumber(1)).toFixed()).toBe(
      new BigNumber(1).minus(XTZ_FEE_RESERVE_TEZ).toFixed()
    );
    expect(getSpendableXtz(new BigNumber("0.01")).toFixed()).toBe("0");
  });
});
