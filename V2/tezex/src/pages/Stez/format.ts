const ZERO = BigInt(0);
const TOKEN_SCALE = BigInt(1_000_000);

export const formatUnits = (value: bigint | null, maximumDecimals = 6) => {
  if (value === null) return "—";
  const sign = value < ZERO ? "-" : "";
  const absolute = value < ZERO ? -value : value;
  const whole = absolute / TOKEN_SCALE;
  const fraction = (absolute % TOKEN_SCALE)
    .toString()
    .padStart(6, "0")
    .slice(0, maximumDecimals)
    .replace(/0+$/, "");
  return `${sign}${whole.toLocaleString("en-US")}${
    fraction ? `.${fraction}` : ".0"
  }`;
};

// Presentation only. Protocol quotes and transaction amounts retain full precision.
export const formatPositionXtz = (value: bigint | null) => {
  const exact = formatUnits(value);
  if (value === null) return { value: exact };
  const absolute = value < ZERO ? -value : value;
  const cent = BigInt(10_000);
  // Keep small balances visible rather than rounding them to zero.
  if (absolute < cent) return { value: exact };
  const roundedAbsolute = ((absolute + cent / BigInt(2)) / cent) * cent;
  const rounded = value < ZERO ? -roundedAbsolute : roundedAbsolute;
  if (rounded === value) return { value: exact };
  return {
    value: "≈" + formatUnits(rounded).replace(/\.0$/, ""),
    exactValue: exact + " XTZ",
  };
};
