import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import { TokenPair } from "../../components/ui/elements/TokenIcon";
import { useNetwork } from "../../hooks/network";
import {
  AnalyticsMetric,
  AnalyticsModel,
  AnalyticsPoint,
  AnalyticsRange,
  formatAgo,
  formatCompactXtz,
  formatDelta,
  loadAnalytics,
  shortAddress,
} from "./api";
import "./style.css";

const METRICS: AnalyticsMetric[] = ["Volume", "TVL", "Fees"];
const RANGES: AnalyticsRange[] = ["24H", "7D", "30D", "90D"];
const CHART_WIDTH = 900;
const CHART_HEIGHT = 300;
const CHART_LEFT = 10;
const CHART_RIGHT = 10;
const CHART_TOP = 18;
const CHART_BOTTOM = 34;

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const metricValue = (metric: AnalyticsMetric, value: number) => {
  if (metric === "Fees") return formatCompactXtz(value);
  return formatCompactXtz(value);
};

const chartDate = (timestamp: number, range: AnalyticsRange) =>
  new Intl.DateTimeFormat(
    "en-US",
    range === "24H" ? { hour: "numeric" } : { month: "short", day: "numeric" }
  ).format(timestamp);

const deltaClass = (value: number | null) =>
  value === null ? "is-neutral" : value >= 0 ? "is-positive" : "is-negative";

interface StatProps {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel?: string;
}

const Stat: FC<StatProps> = ({ label, value, delta, deltaLabel = "24h" }) => (
  <div className="analytics-stat">
    <span className="analytics-stat__label">{label}</span>
    <strong className="analytics-stat__value">{value}</strong>
    <span className={`analytics-stat__delta ${deltaClass(delta)}`}>
      {formatDelta(delta)} {delta !== null && deltaLabel}
    </span>
  </div>
);

interface ChartProps {
  metric: AnalyticsMetric;
  range: AnalyticsRange;
  points: AnalyticsPoint[];
  loading: boolean;
}

const AnalyticsChart: FC<ChartProps> = ({ metric, range, points, loading }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => setHoverIndex(null), [metric, range]);

  const geometry = useMemo(() => {
    const values = points.map((point) => point.value);
    const maximum = Math.max(...values, 1);
    const minimum = metric === "TVL" ? Math.min(...values, maximum) : 0;
    const floor = metric === "TVL" ? Math.max(0, minimum * 0.985) : 0;
    const ceiling = Math.max(maximum * 1.025, floor + 1);
    const chartHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
    const width =
      (CHART_WIDTH - CHART_LEFT - CHART_RIGHT) / Math.max(points.length, 1);
    const y = (value: number) =>
      CHART_TOP + (1 - (value - floor) / (ceiling - floor)) * chartHeight;
    const line = points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${(CHART_LEFT + width * (index + 0.5)).toFixed(
            1
          )},${y(point.value).toFixed(1)}`
      )
      .join(" ");
    const area = points.length
      ? `${line} L${(CHART_LEFT + width * (points.length - 0.5)).toFixed(1)},${
          CHART_HEIGHT - CHART_BOTTOM
        } L${(CHART_LEFT + width * 0.5).toFixed(1)},${
          CHART_HEIGHT - CHART_BOTTOM
        } Z`
      : "";
    return { width, y, line, area };
  }, [metric, points]);

  const activeIndex = hoverIndex ?? Math.max(0, points.length - 1);
  const activePoint = points[activeIndex];

  const indexAt = (clientX: number, element: SVGSVGElement) => {
    const bounds = element.getBoundingClientRect();
    const relative = ((clientX - bounds.left) / bounds.width) * CHART_WIDTH;
    return Math.max(
      0,
      Math.min(
        points.length - 1,
        Math.floor((relative - CHART_LEFT) / geometry.width)
      )
    );
  };

  const labelIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  ).filter((index) => index >= 0);

  return (
    <div className={`analytics-chart-shell ${loading ? "is-loading" : ""}`}>
      <div className="analytics-chart-readout" aria-live="polite">
        <strong>
          {activePoint ? metricValue(metric, activePoint.value) : "—"}
        </strong>
        <span>
          {activePoint
            ? chartDate(activePoint.timestamp, range)
            : "No activity"}
        </span>
      </div>
      <div className="analytics-chart-frame">
        <svg
          className="analytics-chart"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          role="img"
          tabIndex={0}
          aria-label={`${metric} over ${range}`}
          onPointerMove={(event) =>
            points.length &&
            setHoverIndex(indexAt(event.clientX, event.currentTarget))
          }
          onPointerLeave={() => setHoverIndex(null)}
          onBlur={() => setHoverIndex(null)}
          onKeyDown={(event) => {
            if (!points.length) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              setHoverIndex((current) =>
                Math.max(
                  0,
                  Math.min(
                    points.length - 1,
                    (current ?? points.length - 1) + direction
                  )
                )
              );
            }
            if (event.key === "Escape") setHoverIndex(null);
          }}
        >
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1={CHART_LEFT}
              y1={
                CHART_TOP + fraction * (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM)
              }
              x2={CHART_WIDTH - CHART_RIGHT}
              y2={
                CHART_TOP + fraction * (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM)
              }
              className="analytics-chart__grid"
            />
          ))}
          <line
            x1={CHART_LEFT}
            y1={CHART_HEIGHT - CHART_BOTTOM}
            x2={CHART_WIDTH - CHART_RIGHT}
            y2={CHART_HEIGHT - CHART_BOTTOM}
            className="analytics-chart__baseline"
          />

          {metric === "TVL" ? (
            <>
              <path d={geometry.area} className="analytics-chart__area" />
              <path d={geometry.line} className="analytics-chart__line" />
            </>
          ) : (
            points.map((point, index) => {
              const y = geometry.y(point.value);
              const dense = geometry.width < 12;
              return (
                <rect
                  key={point.timestamp}
                  x={
                    CHART_LEFT +
                    geometry.width * index +
                    geometry.width * (dense ? 0.12 : 0.18)
                  }
                  y={y}
                  width={geometry.width * (dense ? 0.76 : 0.64)}
                  height={Math.max(1, CHART_HEIGHT - CHART_BOTTOM - y)}
                  rx={dense ? 1.5 : Math.min(4, geometry.width * 0.2)}
                  className={
                    hoverIndex === index
                      ? "analytics-chart__bar is-active"
                      : "analytics-chart__bar"
                  }
                />
              );
            })
          )}

          {hoverIndex !== null && points[hoverIndex] && (
            <>
              <line
                x1={CHART_LEFT + geometry.width * (hoverIndex + 0.5)}
                y1={CHART_TOP}
                x2={CHART_LEFT + geometry.width * (hoverIndex + 0.5)}
                y2={CHART_HEIGHT - CHART_BOTTOM}
                className="analytics-chart__crosshair"
              />
              <circle
                cx={CHART_LEFT + geometry.width * (hoverIndex + 0.5)}
                cy={geometry.y(points[hoverIndex].value)}
                r="5"
                className="analytics-chart__point"
              />
            </>
          )}

          {labelIndexes.map((index) => (
            <text
              key={points[index]?.timestamp ?? index}
              x={CHART_LEFT + geometry.width * (index + 0.5)}
              y={CHART_HEIGHT - 10}
              textAnchor={
                index === 0
                  ? "start"
                  : index === points.length - 1
                  ? "end"
                  : "middle"
              }
              className="analytics-chart__label"
            >
              {points[index] ? chartDate(points[index].timestamp, range) : ""}
            </text>
          ))}
        </svg>
        {loading && (
          <span className="analytics-chart-loading">Updating data</span>
        )}
      </div>
    </div>
  );
};

export const Analytics: FC = () => {
  const network = useNetwork();
  const [metric, setMetric] = useState<AnalyticsMetric>("Volume");
  const [range, setRange] = useState<AnalyticsRange>("7D");
  const [model, setModel] = useState<AnalyticsModel>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const cache = useRef(new Map<string, AnalyticsModel>());
  const refreshTarget = useRef<string>();

  const isMainnet = network.network === NetworkType.MAINNET;
  const cacheKey = `${network.info.chainId}:${range}`;

  useEffect(() => {
    if (!isMainnet) return;
    const cached = cache.current.get(cacheKey);
    const forceRefresh = refreshTarget.current === cacheKey;
    if (cached && !forceRefresh) {
      setModel(cached);
      setError(undefined);
      setLoading(false);
      return;
    }

    refreshTarget.current = undefined;
    let active = true;
    setLoading(true);
    setError(undefined);
    void loadAnalytics(network.info, range)
      .then((nextModel) => {
        if (!active) return;
        cache.current.set(cacheKey, nextModel);
        setModel(nextModel);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Analytics data is temporarily unavailable"
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cacheKey, isMainnet, network.info, range, refreshKey]);

  const refresh = useCallback(() => {
    cache.current.delete(cacheKey);
    refreshTarget.current = cacheKey;
    setRefreshKey((key) => key + 1);
  }, [cacheKey]);

  if (!isMainnet) {
    return (
      <main className="analytics-page">
        <section className="analytics-unavailable">
          <span className="analytics-eyebrow">ANALYTICS</span>
          <h1>Mainnet data only</h1>
          <p>
            On-chain TEZEX analytics will appear here when this network has
            active, verified pools.
          </p>
          <button onClick={() => network.switchNetwork(NetworkType.MAINNET)}>
            View Mainnet analytics
          </button>
        </section>
      </main>
    );
  }

  if (!model && loading) {
    return (
      <main className="analytics-page" aria-busy="true">
        <div className="analytics-intro">
          <div>
            <span className="analytics-eyebrow">ANALYTICS</span>
            <h1>On-chain activity</h1>
          </div>
        </div>
        <div className="analytics-skeleton" aria-label="Loading analytics">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="analytics-page">
        <section className="analytics-unavailable" role="alert">
          <span className="analytics-eyebrow">ANALYTICS</span>
          <h1>Data is temporarily unavailable</h1>
          <p>{error ?? "TzKT did not return analytics data."}</p>
          <button onClick={refresh}>Try again</button>
        </section>
      </main>
    );
  }

  const { summary } = model;
  const updated = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(model.loadedAt);

  return (
    <main className="analytics-page">
      <div className="analytics-intro">
        <div>
          <span className="analytics-eyebrow">ANALYTICS</span>
          <h1>On-chain activity</h1>
          <p>Verified activity and liquidity across TEZEX Mainnet pools.</p>
        </div>
        <div className="analytics-freshness">
          <span>
            <i /> Updated {updated}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh analytics"
          >
            <RefreshRoundedIcon />
          </button>
        </div>
      </div>

      {error && (
        <div className="analytics-inline-error" role="status">
          Showing the last successful update. {error}
        </div>
      )}

      <section className="analytics-stats" aria-label="Market summary">
        <Stat
          label="Total liquidity"
          value={formatCompactXtz(summary.tvlXtz)}
          delta={summary.tvlDelta}
        />
        <Stat
          label="Volume 24h"
          value={formatCompactXtz(summary.volume24hXtz)}
          delta={summary.volumeDelta}
        />
        <Stat
          label="Pool fees 24h"
          value={formatCompactXtz(summary.fees24hXtz)}
          delta={summary.feesDelta}
        />
        <Stat
          label="Swaps 24h"
          value={formatNumber(summary.swaps24h, 0)}
          delta={summary.swapsDelta}
        />
      </section>

      <section
        className="analytics-panel analytics-market"
        aria-labelledby="market-chart-title"
      >
        <div className="analytics-panel__head">
          <h2 id="market-chart-title">MARKET HISTORY</h2>
          <div className="analytics-controls">
            <div
              className="analytics-segments"
              role="group"
              aria-label="Chart metric"
            >
              {METRICS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={metric === item ? "is-active" : ""}
                  aria-pressed={metric === item}
                  onClick={() => setMetric(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div
              className="analytics-segments"
              role="group"
              aria-label="Chart range"
            >
              {RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? "is-active" : ""}
                  aria-pressed={range === item}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AnalyticsChart
          metric={metric}
          range={range}
          points={model.chart[metric]}
          loading={loading}
        />
      </section>

      <section className="analytics-panel" aria-labelledby="pools-title">
        <div className="analytics-panel__head">
          <h2 id="pools-title">POOLS</h2>
          <span className="analytics-panel__meta">
            Current reserves · 24h activity
          </span>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table analytics-pools-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th>Liquidity</th>
                <th>Volume 24h</th>
                <th className="analytics-optional">Pool fees 24h</th>
                <th>Est. APR</th>
              </tr>
            </thead>
            <tbody>
              {model.pools.map((pool) => (
                <tr key={pool.id}>
                  <td>
                    <a
                      className="analytics-pair"
                      href={`https://tzkt.io/${pool.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TokenPair
                        tokenA={pool.tokenA}
                        tokenB={pool.tokenB}
                        size={24}
                        surface="var(--analytics-row-surface)"
                      />
                      <span>
                        <strong>
                          {pool.tokenA.label} / {pool.tokenB.label}
                        </strong>
                        <small>{pool.name}</small>
                      </span>
                    </a>
                  </td>
                  <td>{formatCompactXtz(pool.tvlXtz)}</td>
                  <td>{formatCompactXtz(pool.volume24hXtz)}</td>
                  <td className="analytics-optional">
                    {formatCompactXtz(pool.fees24hXtz)}
                  </td>
                  <td>{pool.apr === null ? "—" : `${pool.apr.toFixed(2)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="analytics-panel" aria-labelledby="activity-title">
        <div className="analytics-panel__head">
          <h2 id="activity-title">RECENT ACTIVITY</h2>
          <span className="analytics-panel__meta">Confirmed on Tezos</span>
        </div>
        <div className="analytics-table-wrap">
          <table className="analytics-table analytics-activity-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Pair</th>
                <th>Value</th>
                <th className="analytics-optional">Account</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {model.activity.length ? (
                model.activity.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <span className="analytics-badge">{activity.action}</span>
                    </td>
                    <td>
                      <span className="analytics-pair analytics-pair--plain">
                        <TokenPair
                          tokenA={activity.tokenA}
                          tokenB={activity.tokenB}
                          size={20}
                          surface="var(--analytics-row-surface)"
                        />
                        <span>
                          <strong>{activity.direction}</strong>
                          <small>{activity.poolName}</small>
                        </span>
                      </span>
                    </td>
                    <td>{activity.value}</td>
                    <td
                      className="analytics-optional analytics-muted"
                      title={activity.account}
                    >
                      {activity.accountLabel ?? shortAddress(activity.account)}
                    </td>
                    <td>
                      <a
                        className="analytics-operation"
                        href={`https://tzkt.io/${activity.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {formatAgo(activity.timestamp, model.loadedAt)}
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="analytics-empty">
                    No recent pool activity
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="analytics-statusline">
        <span>
          <i /> TzKT synced
        </span>
        <span>Block {model.blockLevel.toLocaleString()}</span>
        <span>Tezos Mainnet</span>
      </div>
    </main>
  );
};

export default Analytics;
