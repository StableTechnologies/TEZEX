import { Token } from "../../types/general";
import { PoolConfig, PoolType } from "../../types/pools";
import { NetworkInfo } from "../../contexts/network";
import mainnet from "../../config/network/mainnet.json";
import { ANALYTICS_HISTORY, ANALYTICS_HISTORY_CUTOFF } from "./history";
import {
  ANALYTICS_RANGES,
  buildAllTimeSwapSeries,
  buildSwapSeries,
  calculateRemoveLiquidityValueXtz,
  calculateSwapVolumeXtz,
  convertXtz,
  formatDenominatedXtz,
  loadAnalytics,
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

const tokenPool: PoolConfig = {
  id: "usdt-tzbtc-tezex",
  name: "TEZEX",
  type: PoolType.TEZEX_TOKEN,
  address: "KT1-token-pool",
  tokenA: Token.USDt,
  tokenB: Token.TzBTC,
  lpToken: Token.LP_USDtTzBTC,
};

const tokenPoolAssets = new Map(
  (mainnet as unknown as NetworkInfo).assets.map((asset) => [asset.name, asset])
);
const tokenPoolQuote = {
  btcPerXtz: 0.000002,
  usdPerXtz: 0.5,
  timestamp: new Date("2026-09-10T00:00:00Z").getTime(),
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
  it("keeps the verified historical archive complete through its cutoff", () => {
    const sumFor = (poolId: string) =>
      ANALYTICS_HISTORY.filter((point) => point.poolId === poolId).reduce(
        (sum, point) => sum + point.volumeXtz,
        0
      );

    expect(ANALYTICS_HISTORY_CUTOFF).toBe(
      new Date("2026-08-01T00:00:00Z").getTime()
    );
    expect(sumFor("xtz-tzbtc-sirius")).toBeCloseTo(341167267.387464, 5);
    expect(sumFor("xtz-usdtz-tezex")).toBeCloseTo(29.156105, 5);
  });

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

  it("values both directions of token-to-token swaps in XTZ", () => {
    const aToB = calculateSwapVolumeXtz(
      transaction({
        target: { address: tokenPool.address },
        parameter: {
          entrypoint: "swap",
          value: {
            direction: { a_to_b: {} },
            amount_in: "20000000",
          },
        },
      }),
      tokenPool,
      { assets: tokenPoolAssets, quote: tokenPoolQuote }
    );
    const bToA = calculateSwapVolumeXtz(
      transaction({
        target: { address: tokenPool.address },
        parameter: {
          entrypoint: "swap",
          value: {
            direction: { b_to_a: {} },
            amount_in: "100000",
          },
        },
      }),
      tokenPool,
      { assets: tokenPoolAssets, quote: tokenPoolQuote }
    );

    expect(aToB).toBe(40);
    expect(bToA).toBeCloseTo(500, 8);
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

  it("merges archived and live swaps into a complete all-time series", () => {
    const now = new Date("2026-08-15T00:00:00Z").getTime();
    const series = buildAllTimeSwapSeries(
      [
        transaction({
          amount: 4_000_000,
          timestamp: "2026-08-02T12:00:00Z",
          parameter: { entrypoint: "xtzToToken" },
        }),
      ],
      [siriusPool],
      now,
      new Map([[siriusPool.id, 0.001]]),
      new Date("2021-08-06T09:29:54Z").getTime(),
      [
        {
          month: "2021-08-01",
          poolId: siriusPool.id,
          volumeXtz: 12,
        },
        {
          month: "2021-08-01",
          poolId: "another-pool",
          volumeXtz: 100,
        },
      ]
    );

    expect(series.Volume).toHaveLength(61);
    expect(series.Volume.reduce((sum, point) => sum + point.value, 0)).toBe(16);
    expect(series.Fees.reduce((sum, point) => sum + point.value, 0)).toBe(
      0.016
    );
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

  it("values both assets returned by token-pair liquidity removal", () => {
    const value = calculateRemoveLiquidityValueXtz(
      transaction({
        target: { address: tokenPool.address },
        parameter: {
          entrypoint: "remove_liquidity",
          value: { lqt_burned: "100000" },
        },
        storage: {
          reserve_a: "90000000",
          reserve_b: "9000000",
          lqt_total: "900000",
        },
      }),
      tokenPool,
      { assets: tokenPoolAssets, quote: tokenPoolQuote }
    );

    expect(value).toBeCloseTo(5020, 8);
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

  it("exposes every configured mainnet pool across all analytics surfaces", async () => {
    const originalFetch = global.fetch;
    const response = (payload: unknown) =>
      ({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => payload,
      } as unknown as Response);

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/head")) {
        return response({
          level: 10_000,
          timestamp: "2026-08-28T12:00:00Z",
          synced: true,
        });
      }
      if (url.endsWith("/quotes/last")) {
        return response({
          timestamp: "2026-08-28T12:00:00Z",
          btc: 0.000003,
          usd: 0.2,
        });
      }
      if (url.includes("/storage")) {
        return response({
          xtzPool: "1000000",
          tokenPool: "1000000",
          lqtTotal: "1000000",
        });
      }
      if (url.includes("/balance_history")) {
        return response([
          {
            level: 1,
            timestamp: "2026-08-01T00:00:00Z",
            balance: 1_000_000,
          },
        ]);
      }
      if (url.includes("/operations/transactions")) return response([]);

      throw new Error(`Unexpected analytics request: ${url}`);
    }) as typeof fetch;

    try {
      const network = mainnet as unknown as NetworkInfo;
      const model = await loadAnalytics(network);
      const configuredPoolIds = network.pools.map((pool) => pool.id);

      expect(model.pools.map((pool) => pool.id)).toEqual(configuredPoolIds);
      expect(
        model.pools.find((pool) => pool.id === "xtz-usdt-tezex")?.tokenB.label
      ).toBe("USDt");
      expect(
        model.pools.find((pool) => pool.id === "usdt-tzbtc-tezex")?.tokenB.label
      ).toBe("tzBTC");

      configuredPoolIds.forEach((poolId) => {
        expect(model.summaryByPool).toHaveProperty(poolId);
        expect(model.chartByPool).toHaveProperty(poolId);
        expect(model.activityByPool).toHaveProperty(poolId);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("points the live pool registry at both current mainnet deployments", () => {
    const network = mainnet as unknown as NetworkInfo;
    expect(
      network.pools.find((pool) => pool.id === "xtz-usdt-tezex")?.address
    ).toBe("KT1C9RPUSsF4pYuMWBCUM7UReuCqdivWqsMM");
    expect(
      network.pools.find((pool) => pool.id === "usdt-tzbtc-tezex")?.address
    ).toBe("KT19FfCZgzcAuRxXxNRgAJ5i4pRtvBWFtGKH");
    expect(
      network.assets.find((asset) => asset.name === Token.LP_XTZUSDt)?.address
    ).toBe("KT1BgiqsjP8EJqZiUhYJyT1XF3AnxvJZAn82");
    expect(
      network.assets.find((asset) => asset.name === Token.LP_USDtTzBTC)?.address
    ).toBe("KT1CXhiJEGd7z1E5Pee5dfatVDV8Qst8D68X");
    expect(
      network.assets.find((asset) => asset.name === Token.LP_USDtTzBTC)
        ?.decimals
    ).toBe(7);
    expect(
      network.assets.find((asset) => asset.name === Token.LP_USDtTzBTC)?.label
    ).toBe("LP-USDttzBTC");
  });
});
