import { formatPositionXtz } from "./format";

test.each([
  [BigInt(99_999_999), "≈100", "99.999999 XTZ"],
  [BigInt(999_999_999), "≈1,000", "999.999999 XTZ"],
  [BigInt(1_234_999), "≈1.23", "1.234999 XTZ"],
  [BigInt(1_235_000), "≈1.24", "1.235 XTZ"],
  [BigInt(-99_999_999), "≈-100", "-99.999999 XTZ"],
  [BigInt("9007199254999999"), "≈9,007,199,255", "9,007,199,254.999999 XTZ"],
])(
  "rounds %s for display while retaining the exact amount",
  (input, value, exactValue) => {
    expect(formatPositionXtz(input)).toEqual({ value, exactValue });
  }
);

test.each([
  [null, "—"],
  [BigInt(0), "0.0"],
  [BigInt(1), "0.000001"],
  [BigInt(-1), "-0.000001"],
  [BigInt(9_999), "0.009999"],
  [BigInt(10_000), "0.01"],
  [BigInt(2_200_000), "2.2"],
])("preserves exact and small values: %s", (input, value) => {
  expect(formatPositionXtz(input)).toEqual({ value });
});
