import { Token } from "../../types/general";
import { PoolConfig, PoolType } from "../../types/pools";
import {
  buildSwapSeries,
  calculateSwapVolumeXtz,
  TzktTransaction,
} from "./api";

const siriusPool: PoolConfig = {
  id: "sirius",
  name: "Sirius",
  type: PoolType.SIRIUS,
  address: "KT1-sirius",
  tokenA: Token.XTZ,
  tokenB: Token.TzBTC,
  lpToken: Token.Sirs,
};

const transaction = (overrides: Partial<TzktTransaction>): TzktTransaction => ({
  id: 1,
  timestamp: "2026-07-28T12:00:00Z",
  hash: "oo-test",
  counter: 1,
  sender: { address: "tz1-user" },
  target: { address: siriusPool.address },
  amount: 0,
  ...overrides,
});

describe("analytics calculations", () => {
  it("uses the transferred tez amount for XTZ-to-token swaps", () => {
    const volume = calculateSwapVolumeXtz(
      transaction({
        amount: 2_500_000,
        parameter: { entrypoint: "xtzToToken" },
      }),
      siriusPool
    );

    expect(volume).toBe(2.5);
  });

  it("derives XTZ volume from the post-swap pool state for token-to-XTZ swaps", () => {
    const volume = calculateSwapVolumeXtz(
      transaction({
        parameter: {
          entrypoint: "tokenToXtz",
          value: { tokensSold: "1000000" },
        },
        storage: {
          tokenPool: "11000000",
          xtzPool: "1000000000",
        },
      }),
      siriusPool
    );

    expect(volume).toBeCloseTo(99.9, 5);
  });

  it("buckets swap volume and the configured liquidity-provider fee", () => {
    const now = new Date("2026-07-29T00:00:00Z").getTime();
    const swaps = [
      transaction({
        amount: 4_000_000,
        timestamp: "2026-07-28T23:30:00Z",
        parameter: { entrypoint: "xtzToToken" },
      }),
    ];
    const series = buildSwapSeries(
      swaps,
      [siriusPool],
      "24H",
      now,
      new Map([[siriusPool.id, 0.001]])
    );

    expect(series.Volume.reduce((sum, point) => sum + point.value, 0)).toBe(4);
    expect(series.Fees.reduce((sum, point) => sum + point.value, 0)).toBe(
      0.004
    );
  });
});
