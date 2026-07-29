import { NetworkInfo } from "../../contexts/network";
import { Asset, Token } from "../../types/general";
import { PoolConfig, PoolType } from "../../types/pools";

export type AnalyticsRange = "24H" | "7D" | "30D" | "90D" | "6M" | "1Y";
export type AnalyticsMetric = "Volume" | "TVL" | "Fees";
export type AnalyticsCurrency = "XTZ" | "BTC" | "USD";

export const ANALYTICS_RANGES: AnalyticsRange[] = [
  "24H",
  "7D",
  "30D",
  "90D",
  "6M",
  "1Y",
];

export interface AnalyticsQuote {
  btcPerXtz: number;
  usdPerXtz: number;
  timestamp: number;
}

export interface AnalyticsPoint {
  timestamp: number;
  value: number;
}

export interface AnalyticsSummary {
  tvlXtz: number;
  tvlDelta: number | null;
  volume24hXtz: number;
  volumeDelta: number | null;
  fees24hXtz: number;
  feesDelta: number | null;
  swaps24h: number;
  swapsDelta: number | null;
}

export interface AnalyticsPool {
  id: string;
  name: string;
  address: string;
  tokenA: Asset;
  tokenB: Asset;
  tvlXtz: number;
  volume24hXtz: number;
  fees24hXtz: number;
  apr: number | null;
}

export interface AnalyticsActivity {
  id: number;
  action: "Swap" | "Add" | "Remove";
  poolName: string;
  tokenA: Asset;
  tokenB: Asset;
  direction: string;
  value: string;
  valueXtz: number;
  account: string;
  accountLabel?: string;
  timestamp: number;
  hash: string;
}

export interface AnalyticsModel {
  summary: AnalyticsSummary;
  chart: Record<AnalyticsRange, Record<AnalyticsMetric, AnalyticsPoint[]>>;
  pools: AnalyticsPool[];
  activity: AnalyticsActivity[];
  blockLevel: number;
  blockTimestamp: number;
  quote: AnalyticsQuote;
  loadedAt: number;
}

interface TzktAlias {
  alias?: string;
  address: string;
}

export interface TzktTransaction {
  id: number;
  timestamp: string;
  hash: string;
  counter: number;
  sender: TzktAlias;
  target: TzktAlias;
  amount: number;
  parameter?: {
    entrypoint: string;
    value?: Record<string, unknown>;
  };
  storage?: Record<string, unknown>;
}

interface TzktBalancePoint {
  level: number;
  timestamp: string;
  balance: number;
}

interface TzktHead {
  level: number;
  timestamp: string;
  synced: boolean;
}

interface TzktQuote {
  timestamp: string;
  btc: number;
  usd: number;
}

interface PoolSnapshot {
  config: PoolConfig;
  tokenA: Asset;
  tokenB: Asset;
  storage: Record<string, unknown>;
  balanceHistory: Record<AnalyticsRange, TzktBalancePoint[]>;
  feeRate: number;
  currentTvlXtz: number;
}

interface RangeConfig {
  windowMs: number;
  bucketCount: number;
  balanceStep: number;
}

const TZKT_API = "https://api.tzkt.io/v1";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const SWAP_ENTRYPOINTS = ["xtzToToken", "tokenToXtz"];
const ACTIVITY_ENTRYPOINTS = [
  ...SWAP_ENTRYPOINTS,
  "addLiquidity",
  "removeLiquidity",
];

export const RANGE_CONFIG: Record<AnalyticsRange, RangeConfig> = {
  "24H": { windowMs: DAY, bucketCount: 24, balanceStep: 600 },
  "7D": { windowMs: 7 * DAY, bucketCount: 7, balanceStep: 14_400 },
  "30D": { windowMs: 30 * DAY, bucketCount: 30, balanceStep: 14_400 },
  "90D": { windowMs: 90 * DAY, bucketCount: 30, balanceStep: 43_200 },
  "6M": { windowMs: 180 * DAY, bucketCount: 26, balanceStep: 57_600 },
  "1Y": { windowMs: 365 * DAY, bucketCount: 52, balanceStep: 57_600 },
};

const BALANCE_HISTORY_RANGES: AnalyticsRange[] = ["24H", "30D", "1Y"];

const balanceHistoryRangeFor = (range: AnalyticsRange): AnalyticsRange => {
  if (range === "24H") return "24H";
  if (range === "7D" || range === "30D") return "30D";
  return "1Y";
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const wait = (duration: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, duration);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Analytics request cancelled", "AbortError"));
      },
      { once: true }
    );
  });

const fetchJson = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${TZKT_API}${path}`, {
      signal,
      headers: { Accept: "application/json" },
    });

    if (response.ok) return (await response.json()) as T;

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await wait(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1_000
          : 750 * 2 ** attempt,
        signal
      );
      continue;
    }

    throw new Error(`TzKT request failed (${response.status})`);
  }

  throw new Error("TzKT request failed");
};

const query = (values: Record<string, string | number>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) =>
    params.set(key, String(value))
  );
  return params.toString();
};

const poolFeeRate = (pool: PoolConfig, storage: Record<string, unknown>) => {
  if (pool.type === PoolType.SIRIUS) return 0.001;
  if (pool.type === PoolType.TEZEX) {
    return 0.003 + toNumber(storage.protocol_fee_bp) / 10_000;
  }
  return 0;
};

const poolAmmMultiplier = (pool: PoolConfig) =>
  pool.type === PoolType.SIRIUS ? 0.999 : 0.997;

const currentPoolTvlXtz = (
  pool: PoolConfig,
  storage: Record<string, unknown>
) => {
  if (pool.tokenA !== Token.XTZ && pool.tokenB !== Token.XTZ) return 0;
  return (toNumber(storage.xtzPool) * 2) / 1_000_000;
};

export const calculateSwapVolumeXtz = (
  transaction: Pick<TzktTransaction, "amount" | "parameter" | "storage">,
  pool: PoolConfig
) => {
  const entrypoint = transaction.parameter?.entrypoint;
  if (entrypoint === "xtzToToken") {
    return Math.max(0, transaction.amount / 1_000_000);
  }

  if (entrypoint !== "tokenToXtz") return 0;

  const params = getRecord(transaction.parameter?.value);
  const storage = getRecord(transaction.storage);
  const tokensSold = toNumber(params.tokensSold);
  const postTokenPool = toNumber(storage.tokenPool);
  const postXtzPool = toNumber(storage.xtzPool);
  const preTokenPool = postTokenPool - tokensSold;
  if (tokensSold <= 0 || postXtzPool <= 0 || preTokenPool <= 0) return 0;

  // The transaction storage is the state after the swap. For a constant-product
  // pool, the XTZ removed is postXtzPool * effectiveInput / preTokenPool.
  const effectiveInput = tokensSold * poolAmmMultiplier(pool);
  return (postXtzPool * effectiveInput) / preTokenPool / 1_000_000;
};

export const calculateRemoveLiquidityValueXtz = (
  transaction: Pick<TzktTransaction, "parameter" | "storage">
) => {
  const params = getRecord(transaction.parameter?.value);
  const storage = getRecord(transaction.storage);
  const lqtBurned = toNumber(params.lqtBurned);
  const postXtzPool = toNumber(storage.xtzPool);
  const postLqtTotal = toNumber(storage.lqtTotal);
  if (lqtBurned <= 0 || postXtzPool <= 0 || postLqtTotal <= 0) return 0;
  return (postXtzPool * lqtBurned) / postLqtTotal / 1_000_000;
};

const percentageDelta = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

const dateAt = (timestamp: number) => new Date(timestamp).toISOString();

const assetMap = (assets: Asset[]) =>
  new Map<Token, Asset>(assets.map((asset) => [asset.name, asset]));

const requireAsset = (assets: Map<Token, Asset>, token: Token) => {
  const asset = assets.get(token);
  if (!asset) throw new Error(`Missing analytics asset: ${token}`);
  return asset;
};

const formatAssetAmount = (raw: number, asset: Asset) => {
  const value = raw / 10 ** asset.decimals;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 1 : value >= 1 ? 3 : 6,
  }).format(value)} ${asset.label}`;
};

const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

const buildBuckets = (range: AnalyticsRange, now: number) => {
  const config = RANGE_CONFIG[range];
  const start = now - config.windowMs;
  const width = config.windowMs / config.bucketCount;
  return Array.from({ length: config.bucketCount }, (_, index) => ({
    start: start + index * width,
    end: start + (index + 1) * width,
    timestamp: start + (index + 1) * width,
  }));
};

export const buildSwapSeries = (
  transactions: TzktTransaction[],
  pools: PoolConfig[],
  range: AnalyticsRange,
  now: number,
  feeRates: Map<string, number>
) => {
  const buckets = buildBuckets(range, now);
  const poolByAddress = new Map(pools.map((pool) => [pool.address, pool]));
  const volume = buckets.map((bucket) => ({
    timestamp: bucket.timestamp,
    value: 0,
  }));
  const fees = buckets.map((bucket) => ({
    timestamp: bucket.timestamp,
    value: 0,
  }));

  transactions.forEach((transaction) => {
    const pool = poolByAddress.get(transaction.target.address);
    if (!pool) return;
    const timestamp = new Date(transaction.timestamp).getTime();
    const index = buckets.findIndex(
      (bucket) => timestamp >= bucket.start && timestamp < bucket.end
    );
    if (index < 0) return;

    const transactionVolume = calculateSwapVolumeXtz(transaction, pool);
    volume[index].value += transactionVolume;
    fees[index].value += transactionVolume * (feeRates.get(pool.id) ?? 0);
  });

  return { Volume: volume, Fees: fees };
};

const valueAt = (history: TzktBalancePoint[], timestamp: number) => {
  let selected = history[0]?.balance ?? 0;
  for (const point of history) {
    if (new Date(point.timestamp).getTime() > timestamp) break;
    selected = point.balance;
  }
  return selected;
};

const buildTvlSeries = (
  snapshots: PoolSnapshot[],
  range: AnalyticsRange,
  now: number
) =>
  buildBuckets(range, now).map((bucket) => ({
    timestamp: bucket.timestamp,
    value: snapshots.reduce((total, pool) => {
      if (
        pool.config.tokenA !== Token.XTZ &&
        pool.config.tokenB !== Token.XTZ
      ) {
        return total;
      }
      return (
        total +
        (valueAt(pool.balanceHistory[range], bucket.end) * 2) / 1_000_000
      );
    }, 0),
  }));

const fetchTransactions = (
  addresses: string[],
  entrypoints: string[],
  options: {
    since?: number;
    limit: number;
    sort: "asc" | "desc";
    select?: string;
  },
  signal?: AbortSignal
) => {
  const params: Record<string, string | number> = {
    "target.in": addresses.join(","),
    "entrypoint.in": entrypoints.join(","),
    status: "applied",
    limit: options.limit,
    [`sort.${options.sort}`]: "id",
    select:
      options.select ??
      "id,timestamp,hash,counter,sender,target,amount,parameter,storage",
  };
  if (options.since) params["timestamp.ge"] = dateAt(options.since);
  return fetchJson<TzktTransaction[]>(
    `/operations/transactions?${query(params)}`,
    signal
  );
};

const fetchBalanceHistory = (
  pool: PoolConfig,
  range: AnalyticsRange,
  signal?: AbortSignal
) => {
  const config = RANGE_CONFIG[range];
  return fetchJson<TzktBalancePoint[]>(
    `/accounts/${pool.address}/balance_history?${query({
      step: config.balanceStep,
      limit: config.bucketCount + 3,
      "sort.desc": "level",
    })}`,
    signal
  );
};

const activityFromTransaction = (
  transaction: TzktTransaction,
  pool: PoolConfig,
  assets: Map<Token, Asset>
): AnalyticsActivity | null => {
  const entrypoint = transaction.parameter?.entrypoint;
  const params = getRecord(transaction.parameter?.value);
  const tokenA = requireAsset(assets, pool.tokenA);
  const tokenB = requireAsset(assets, pool.tokenB);
  const lpToken = requireAsset(assets, pool.lpToken);
  let action: AnalyticsActivity["action"];
  let direction: string;
  let value: string;
  let valueXtz: number;

  if (entrypoint === "xtzToToken") {
    action = "Swap";
    direction = `${tokenA.label} → ${tokenB.label}`;
    value = formatAssetAmount(transaction.amount, tokenA);
    valueXtz = transaction.amount / 1_000_000;
  } else if (entrypoint === "tokenToXtz") {
    action = "Swap";
    direction = `${tokenB.label} → ${tokenA.label}`;
    value = formatAssetAmount(toNumber(params.tokensSold), tokenB);
    valueXtz = calculateSwapVolumeXtz(transaction, pool);
  } else if (entrypoint === "addLiquidity") {
    action = "Add";
    direction = `${tokenA.label} + ${tokenB.label}`;
    value = formatAssetAmount(transaction.amount, tokenA);
    valueXtz = transaction.amount / 1_000_000;
  } else if (entrypoint === "removeLiquidity") {
    action = "Remove";
    direction = `${tokenA.label} + ${tokenB.label}`;
    const lqtBurned = toNumber(params.lqtBurned);
    value = formatAssetAmount(lqtBurned, lpToken);
    valueXtz = calculateRemoveLiquidityValueXtz(transaction);
  } else {
    return null;
  }

  return {
    id: transaction.id,
    action,
    poolName: pool.name,
    tokenA,
    tokenB,
    direction,
    value,
    valueXtz,
    account: transaction.sender.address,
    accountLabel: transaction.sender.alias,
    timestamp: new Date(transaction.timestamp).getTime(),
    hash: transaction.hash,
  };
};

export const loadAnalytics = async (
  network: NetworkInfo,
  signal?: AbortSignal
): Promise<AnalyticsModel> => {
  const pools = network.pools.filter(
    (pool) => pool.tokenA === Token.XTZ || pool.tokenB === Token.XTZ
  );
  if (!pools.length) throw new Error("No XTZ pools are configured");

  const assets = assetMap(network.assets);
  const addresses = pools.map((pool) => pool.address);
  const headPromise = fetchJson<TzktHead>("/head", signal);
  const quotePromise = fetchJson<TzktQuote>("/quotes/last", signal);
  const storagePromises = pools.map((pool) =>
    fetchJson<Record<string, unknown>>(
      `/contracts/${pool.address}/storage`,
      signal
    )
  );
  const preliminaryHead = await headPromise;
  const now = new Date(preliminaryHead.timestamp).getTime();
  const requestedSince = now - RANGE_CONFIG["1Y"].windowMs;
  const balanceHistoriesPromise = async () => {
    const histories: TzktBalancePoint[][][] = [];
    for (const range of BALANCE_HISTORY_RANGES) {
      histories.push(
        await Promise.all(
          pools.map((pool) => fetchBalanceHistory(pool, range, signal))
        )
      );
    }
    return histories;
  };

  const [quote, storages, balanceHistories, swaps, recentTransactions] =
    await Promise.all([
      quotePromise,
      Promise.all(storagePromises),
      balanceHistoriesPromise(),
      fetchTransactions(
        addresses,
        SWAP_ENTRYPOINTS,
        {
          since: requestedSince,
          limit: 10_000,
          sort: "desc",
          select: "id,timestamp,target,amount,parameter,storage",
        },
        signal
      ),
      fetchTransactions(
        addresses,
        ACTIVITY_ENTRYPOINTS,
        { limit: 16, sort: "desc" },
        signal
      ),
    ]);

  const snapshots: PoolSnapshot[] = pools.map((pool, index) => {
    const storage = storages[index];
    const currentBalance = toNumber(storage.xtzPool);
    const history = Object.fromEntries(
      ANALYTICS_RANGES.map((range) => [
        range,
        [
          ...balanceHistories[
            BALANCE_HISTORY_RANGES.indexOf(balanceHistoryRangeFor(range))
          ][index],
        ]
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          .concat({
            level: preliminaryHead.level,
            timestamp: preliminaryHead.timestamp,
            balance: currentBalance,
          }),
      ])
    ) as Record<AnalyticsRange, TzktBalancePoint[]>;
    return {
      config: pool,
      tokenA: requireAsset(assets, pool.tokenA),
      tokenB: requireAsset(assets, pool.tokenB),
      storage,
      balanceHistory: history,
      feeRate: poolFeeRate(pool, storage),
      currentTvlXtz: currentPoolTvlXtz(pool, storage),
    };
  });

  const poolByAddress = new Map(pools.map((pool) => [pool.address, pool]));
  const feeRates = new Map(
    snapshots.map((snapshot) => [snapshot.config.id, snapshot.feeRate])
  );
  const chart = Object.fromEntries(
    ANALYTICS_RANGES.map((range) => {
      const series = buildSwapSeries(swaps, pools, range, now, feeRates);
      return [
        range,
        {
          Volume: series.Volume,
          TVL: buildTvlSeries(snapshots, range, now),
          Fees: series.Fees,
        },
      ];
    })
  ) as Record<AnalyticsRange, Record<AnalyticsMetric, AnalyticsPoint[]>>;
  const currentStart = now - DAY;
  const previousStart = now - 2 * DAY;
  const currentSwaps = swaps.filter(
    (transaction) => new Date(transaction.timestamp).getTime() >= currentStart
  );
  const previousSwaps = swaps.filter((transaction) => {
    const timestamp = new Date(transaction.timestamp).getTime();
    return timestamp >= previousStart && timestamp < currentStart;
  });

  const sumVolume = (transactions: TzktTransaction[]) =>
    transactions.reduce((total, transaction) => {
      const pool = poolByAddress.get(transaction.target.address);
      return pool ? total + calculateSwapVolumeXtz(transaction, pool) : total;
    }, 0);

  const sumFees = (transactions: TzktTransaction[]) =>
    transactions.reduce((total, transaction) => {
      const pool = poolByAddress.get(transaction.target.address);
      if (!pool) return total;
      return (
        total +
        calculateSwapVolumeXtz(transaction, pool) * (feeRates.get(pool.id) ?? 0)
      );
    }, 0);

  const volume24hXtz = sumVolume(currentSwaps);
  const previousVolume = sumVolume(previousSwaps);
  const fees24hXtz = sumFees(currentSwaps);
  const previousFees = sumFees(previousSwaps);
  const tvlXtz = snapshots.reduce(
    (total, snapshot) => total + snapshot.currentTvlXtz,
    0
  );
  const previousTvl = snapshots.reduce(
    (total, snapshot) =>
      total +
      (valueAt(snapshot.balanceHistory["24H"], currentStart) * 2) / 1_000_000,
    0
  );

  const poolRows = snapshots.map((snapshot) => {
    const poolSwaps = currentSwaps.filter(
      (transaction) => transaction.target.address === snapshot.config.address
    );
    const volume = sumVolume(poolSwaps);
    const fees = volume * snapshot.feeRate;
    return {
      id: snapshot.config.id,
      name: snapshot.config.name,
      address: snapshot.config.address,
      tokenA: snapshot.tokenA,
      tokenB: snapshot.tokenB,
      tvlXtz: snapshot.currentTvlXtz,
      volume24hXtz: volume,
      fees24hXtz: fees,
      apr:
        snapshot.currentTvlXtz > 0
          ? (fees * 365 * 100) / snapshot.currentTvlXtz
          : null,
    };
  });

  const activity = recentTransactions
    .map((transaction) => {
      const pool = poolByAddress.get(transaction.target.address);
      return pool ? activityFromTransaction(transaction, pool, assets) : null;
    })
    .filter((item): item is AnalyticsActivity => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return {
    summary: {
      tvlXtz,
      tvlDelta: percentageDelta(tvlXtz, previousTvl),
      volume24hXtz,
      volumeDelta: percentageDelta(volume24hXtz, previousVolume),
      fees24hXtz,
      feesDelta: percentageDelta(fees24hXtz, previousFees),
      swaps24h: currentSwaps.length,
      swapsDelta: percentageDelta(currentSwaps.length, previousSwaps.length),
    },
    chart,
    pools: poolRows,
    activity,
    blockLevel: preliminaryHead.level,
    blockTimestamp: now,
    quote: {
      btcPerXtz: quote.btc,
      usdPerXtz: quote.usd,
      timestamp: new Date(quote.timestamp).getTime(),
    },
    loadedAt: Date.now(),
  };
};

export const formatCompactXtz = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 100 ? 1 : 2,
  }).format(value)} XTZ`;

export const convertXtz = (
  valueXtz: number,
  currency: AnalyticsCurrency,
  quote: AnalyticsQuote
) => {
  if (currency === "BTC") return valueXtz * quote.btcPerXtz;
  if (currency === "USD") return valueXtz * quote.usdPerXtz;
  return valueXtz;
};

export const formatDenominatedXtz = (
  valueXtz: number,
  currency: AnalyticsCurrency,
  quote: AnalyticsQuote
) => {
  if (currency === "XTZ") return formatCompactXtz(valueXtz);

  const value = convertXtz(valueXtz, currency, quote);
  if (!Number.isFinite(value)) return "—";

  if (currency === "USD") {
    if (value > 0 && value < 0.01) return "<$0.01";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: value >= 1_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 1_000 ? 1 : 2,
    }).format(value);
  }

  if (value > 0 && value < 0.000001) return "<0.000001 BTC";
  return `${new Intl.NumberFormat("en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits:
      value >= 100 ? 1 : value >= 1 ? 3 : value >= 0.01 ? 4 : 6,
  }).format(value)} BTC`;
};

export const formatDelta = (value: number | null) =>
  value === null
    ? "No prior activity"
    : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export const formatAgo = (timestamp: number, now = Date.now()) => {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
};

export { shortAddress };
