export interface AnalyticsHistoryPoint {
  month: string;
  poolId: string;
  volumeXtz: number;
}

// 116,122 applied xtzToToken calls and 94,298 applied tokenToXtz calls from
// TzKT, aggregated by UTC month. The archive is exclusive of the cutoff;
// api.ts appends live swaps from the cutoff forward so the all-time chart stays
// current without loading 210,420 historical operations in every browser.
export const ANALYTICS_HISTORY_CUTOFF = Date.parse("2026-08-01T00:00:00Z");
export const ANALYTICS_HISTORY_SOURCE =
  "https://api.tzkt.io/v1/operations/transactions";

export const ANALYTICS_HISTORY: AnalyticsHistoryPoint[] = [
  {
    month: "2021-08-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3525531.763032419,
  },
  {
    month: "2021-09-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5893461.442612408,
  },
  {
    month: "2021-10-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3429040.019474523,
  },
  {
    month: "2021-11-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2680824.350215548,
  },
  {
    month: "2021-12-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3746128.459180974,
  },
  {
    month: "2022-01-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5429789.491608185,
  },
  {
    month: "2022-02-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6451666.088373792,
  },
  {
    month: "2022-03-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 4433391.924154716,
  },
  {
    month: "2022-04-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3942815.61222696,
  },
  {
    month: "2022-05-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 10844595.33845237,
  },
  {
    month: "2022-06-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 7970077.512216561,
  },
  {
    month: "2022-07-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5018650.224568701,
  },
  {
    month: "2022-08-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3952253.235316207,
  },
  {
    month: "2022-09-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3714568.301696358,
  },
  {
    month: "2022-10-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2031208.188853798,
  },
  {
    month: "2022-11-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2908758.821270261,
  },
  {
    month: "2022-12-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2306172.573268864,
  },
  {
    month: "2023-01-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5349488.479656861,
  },
  {
    month: "2023-02-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6721040.225822374,
  },
  {
    month: "2023-03-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6524996.814499776,
  },
  {
    month: "2023-04-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3095419.069013951,
  },
  {
    month: "2023-05-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 1742131.616698741,
  },
  {
    month: "2023-06-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 4652670.484690648,
  },
  {
    month: "2023-07-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3602848.898693647,
  },
  {
    month: "2023-08-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2675142.11084023,
  },
  {
    month: "2023-09-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 1145873.179870906,
  },
  {
    month: "2023-10-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3889640.116030978,
  },
  {
    month: "2023-11-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6978508.900590619,
  },
  {
    month: "2023-12-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 9778538.996537985,
  },
  {
    month: "2024-01-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 9822050.300826263,
  },
  {
    month: "2024-02-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2532115.740906646,
  },
  {
    month: "2024-03-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6155417.36603882,
  },
  {
    month: "2024-04-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2699725.823802232,
  },
  {
    month: "2024-05-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 1800759.053900888,
  },
  {
    month: "2024-06-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5706793.011186555,
  },
  {
    month: "2024-07-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5500459.112310678,
  },
  {
    month: "2024-08-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 10393559.674355503,
  },
  {
    month: "2024-09-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6901946.784122736,
  },
  {
    month: "2024-10-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 6644417.78157048,
  },
  {
    month: "2024-11-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 19451060.312659103,
  },
  {
    month: "2024-12-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 14504168.288412208,
  },
  {
    month: "2025-01-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5912735.398111312,
  },
  {
    month: "2025-02-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 7369777.112353798,
  },
  {
    month: "2025-03-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5502269.955461043,
  },
  {
    month: "2025-04-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 8053734.577320112,
  },
  {
    month: "2025-05-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5943452.390882131,
  },
  {
    month: "2025-06-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 4175964.199758627,
  },
  {
    month: "2025-07-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 15548085.543824919,
  },
  {
    month: "2025-08-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 7041545.0197137,
  },
  {
    month: "2025-09-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3572315.940336214,
  },
  {
    month: "2025-10-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 7111984.843406217,
  },
  {
    month: "2025-11-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 8961569.43838877,
  },
  {
    month: "2025-12-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 4574025.533273053,
  },
  { month: "2025-12-01", poolId: "xtz-usdtz-tezex", volumeXtz: 0.019938643 },
  {
    month: "2026-01-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5337445.155469196,
  },
  { month: "2026-01-01", poolId: "xtz-usdtz-tezex", volumeXtz: 29.03616633 },
  {
    month: "2026-02-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2528056.617904224,
  },
  { month: "2026-02-01", poolId: "xtz-usdtz-tezex", volumeXtz: 0.1 },
  {
    month: "2026-03-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 3393688.251811342,
  },
  {
    month: "2026-04-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 2420378.059213484,
  },
  {
    month: "2026-05-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 7448167.890257602,
  },
  {
    month: "2026-06-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 4336584.028553885,
  },
  {
    month: "2026-07-01",
    poolId: "xtz-tzbtc-sirius",
    volumeXtz: 5387781.941863233,
  },
];
