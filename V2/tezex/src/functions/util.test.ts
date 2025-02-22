import BigNumber from "bignumber.js";
import { formatWithSubscript } from "./util";

describe("formatWithSubscript", () => {
  it("should format regular decimal values correctly", () => {
    expect(formatWithSubscript(new BigNumber("1.23"), 2)).toBe("1.23");
    expect(formatWithSubscript(new BigNumber("0.1"), 2)).toBe("0.10");
  });

  it("should handle zero correctly", () => {
    expect(formatWithSubscript(new BigNumber("0"), 2)).toBe("0");
  });

  it("should format values with multiple leading zeros correctly", () => {
    expect(formatWithSubscript(new BigNumber("0.0001"), 2)).toBe("0.0₃1");
    expect(formatWithSubscript(new BigNumber("0.000123"), 2)).toBe("0.0₃12");
    expect(
      formatWithSubscript(new BigNumber("0.000000000000000000001"), 2)
    ).toBe("0.0₂₀1");
  });

  it("should handle values with single leading zero without subscript", () => {
    expect(formatWithSubscript(new BigNumber("0.01"), 2)).toBe("0.01");
    expect(formatWithSubscript(new BigNumber("0.05"), 2)).toBe("0.05");
  });

  it("should remove trailing zeros from significant digits", () => {
    expect(formatWithSubscript(new BigNumber("0.000100"), 2)).toBe("0.0₃1");
    expect(formatWithSubscript(new BigNumber("0.000400"), 3)).toBe("0.0₃4");
  });

  it("should format integer values correctly", () => {
    expect(formatWithSubscript(new BigNumber("123"), 2)).toBe("123");
    expect(formatWithSubscript(new BigNumber("1000"), 2)).toBe("1000");
    expect(formatWithSubscript(new BigNumber("1"), 2)).toBe("1");
  });
});
