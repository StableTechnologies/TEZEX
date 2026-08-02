import { Token } from "../../types/general";
import { PoolConfig, PoolType } from "../../types/pools";
import {
  ANALYTICS_RANGES,
  buildSwapSeries,
  calculateRemoveLiquidityValueXtz,
  calculateSwapVolumeXtz,
  convertXtz,
  formatDenominatedXtz,
  RANGE_CONFIG,
  TzktTransaction,
  valueAt,
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

  it("builds every preset from the same in-memory transaction history", () => {
    const now = new Date("2026-07-29T00:00:00Z").getTime();

    ANALYTICS_RANGES.forEach((range) => {
      const series = buildSwapSeries(
        [],
        [siriusPool],
        range,
        now,
        new Map([[siriusPool.id, 0.001]])
      );

      expect(series.Volume).toHaveLength(RANGE_CONFIG[range].bucketCount);
      expect(series.Fees).toHaveLength(RANGE_CONFIG[range].bucketCount);
    });
  });

  it("does not invent a flat balance before a pool's first on-chain sample", () => {
    const history = [
      {
        timestamp: "2021-08-06T09:29:54Z",
        balance: 100,
      },
      {
        timestamp: "2021-08-07T09:29:54Z",
        balance: 2_500_100,
      },
    ];

    expect(valueAt(history, new Date("2020-08-06T09:29:54Z").getTime())).toBe(
      0
    );
    expect(valueAt(history, new Date("2021-08-06T12:00:00Z").getTime())).toBe(
      100
    );
  });

  it("derives removed liquidity value from the post-operation pool state", () => {
    const value = calculateRemoveLiquidityValueXtz(
      transaction({
        parameter: {
          entrypoint: "removeLiquidity",
          value: { lqtBurned: "1000" },
        },
        storage: {
          xtzPool: "900000000",
          lqtTotal: "9000",
        },
      })
    );

    expect(value).toBe(100);
  });

  it("converts XTZ values through the same verified quote", () => {
    const quote = {
      btcPerXtz: 0.000003,
      usdPerXtz: 0.2,
      timestamp: new Date("2026-07-29T00:00:00Z").getTime(),
    };

    expect(convertXtz(1000, "XTZ", quote)).toBe(1000);
    expect(convertXtz(1000, "BTC", quote)).toBeCloseTo(0.003);
    expect(convertXtz(1000, "USD", quote)).toBe(200);
    expect(formatDenominatedXtz(1000, "XTZ", quote)).toBe("1K XTZ");
    expect(formatDenominatedXtz(1000, "BTC", quote)).toBe("0.003 BTC");
    expect(formatDenominatedXtz(1000, "USD", quote)).toBe("$200.00");
  });
});
