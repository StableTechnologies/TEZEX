const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;

export const MINIMUM_LQT = 1000n;
export const LP_FEE_BP = 25n;
export const PROTOCOL_FEE_BP = 5n;
export const TOTAL_FEE_BP = 30n;
export const FEE_DENOMINATOR = 10_000n;
export const SWAP_FEE_NUMERATOR = FEE_DENOMINATOR - TOTAL_FEE_BP;

export function parseNat(value: string, label: string): bigint {
  if (!NAT_PATTERN.test(value)) throw new Error(`${label} must be a natural number`);
  return BigInt(value);
}

export function integerSquareRoot(value: bigint): bigint {
  if (value < 0n) throw new Error("Cannot calculate a negative square root");
  if (value < 2n) return value;
  let estimate = value / 2n + 1n;
  while (true) {
    const next = (estimate + value / estimate) / 2n;
    if (next >= estimate) return estimate;
    estimate = next;
  }
}

export function calculateInitialLqt(amountA: string, amountB: string): string {
  const product = parseNat(amountA, "amount A") * parseNat(amountB, "amount B");
  return integerSquareRoot(product).toString();
}

export function quoteOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountWithFee = amountIn * SWAP_FEE_NUMERATOR;
  return (amountWithFee * reserveOut) /
    (reserveIn * FEE_DENOMINATOR + amountWithFee);
}

export function protocolFee(amountIn: bigint): bigint {
  return (amountIn * PROTOCOL_FEE_BP) / FEE_DENOMINATOR;
}
