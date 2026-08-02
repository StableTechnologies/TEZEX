import React, {
  CSSProperties,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";

import { TokenPair } from "../../components/ui/elements/TokenIcon";
import { useNetwork } from "../../hooks/network";
import {
  ANALYTICS_RANGES,
  AnalyticsCurrency,
  AnalyticsMetric,
  AnalyticsModel,
  AnalyticsPoint,
  AnalyticsQuote,
  AnalyticsRange,
  formatAgo,
  formatDenominatedXtz,
  formatDelta,
  loadAnalytics,
  shortAddress,
} from "./api";
import "./style.css";

const METRICS: AnalyticsMetric[] = ["Volume", "TVL", "Fees"];
const CURRENCIES: AnalyticsCurrency[] = ["XTZ", "USD", "BTC"];
type AnalyticsChartType = "area" | "bars";
const CHART_WIDTH = 900;
const CHART_HEIGHT = 300;
const CHART_LEFT = 10;
const CHART_RIGHT = 10;
const CHART_TOP = 18;
const CHART_BOTTOM = 34;
const rangeLabel = (range: AnalyticsRange) => (range === "MAX" ? "ALL" : range);

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const chartDate = (timestamp: number, range: AnalyticsRange) =>
  new Intl.DateTimeFormat(
    "en-US",
    range === "24H"
      ? { hour: "numeric" }
      : range === "MAX"
      ? { month: "short", year: "numeric", timeZone: "UTC" }
      : { month: "short", day: "numeric" }
  ).format(timestamp);

const rangeBoundaryDate = (timestamp: number, range: AnalyticsRange) =>
  new Intl.DateTimeFormat(
    "en-US",
    range === "24H"
      ? { month: "short", day: "numeric", hour: "numeric" }
      : range === "MAX"
      ? { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
      : range === "1Y"
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" }
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
  chartType: AnalyticsChartType;
  onChartTypeChange: (chartType: AnalyticsChartType) => void;
  range: AnalyticsRange;
  points: AnalyticsPoint[];
  currency: AnalyticsCurrency;
  quote: AnalyticsQuote;
  loading: boolean;
}

interface RangeWindow {
  start: number;
  end: number;
}

interface RangeScrubberProps {
  points: AnalyticsPoint[];
  range: AnalyticsRange;
  window: RangeWindow;
  onChange: (window: RangeWindow) => void;
}

const RangeScrubber: FC<RangeScrubberProps> = ({
  points,
  range,
  window,
  onChange,
}) => {
  const maximumIndex = Math.max(0, points.length - 1);
  const start = Math.min(window.start, Math.max(0, maximumIndex - 1));
  const end = Math.max(start + 1, Math.min(window.end, maximumIndex));
  const divisor = Math.max(1, maximumIndex);
  const maximumValue = Math.max(...points.map((point) => point.value), 1);
  const fullRange = start === 0 && end === maximumIndex;
  const style = {
    "--range-start": `${(start / divisor) * 100}%`,
    "--range-end": `${(end / divisor) * 100}%`,
  } as CSSProperties;

  if (points.length < 2) return null;

  return (
    <div className="analytics-range-scrubber">
      <div className="analytics-range-scrubber__meta">
        <span>VISIBLE RANGE</span>
        <strong>
          {rangeBoundaryDate(points[start].timestamp, range)} —{" "}
          {rangeBoundaryDate(points[end].timestamp, range)}
        </strong>
        {!fullRange && (
          <button
            type="button"
            onClick={() => onChange({ start: 0, end: maximumIndex })}
          >
            Reset
          </button>
        )}
      </div>
      <div className="analytics-range-scrubber__track" style={style}>
        <div className="analytics-range-scrubber__overview" aria-hidden="true">
          {points.map((point) => (
            <span
              key={point.timestamp}
              style={
                {
                  "--overview-height": `${Math.max(
                    8,
                    (point.value / maximumValue) * 100
                  )}%`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <span className="analytics-range-scrubber__selection" />
        <input
          type="range"
          min={0}
          max={maximumIndex}
          value={start}
          aria-label="Visible range start"
          onChange={(event) =>
            onChange({
              start: Math.min(Number(event.target.value), end - 1),
              end,
            })
          }
          onInput={(event) =>
            onChange({
              start: Math.min(Number(event.currentTarget.value), end - 1),
              end,
            })
          }
        />
        <input
          type="range"
          min={0}
          max={maximumIndex}
          value={end}
          aria-label="Visible range end"
          onChange={(event) =>
            onChange({
              start,
              end: Math.max(Number(event.target.value), start + 1),
            })
          }
          onInput={(event) =>
            onChange({
              start,
              end: Math.max(Number(event.currentTarget.value), start + 1),
            })
          }
        />
      </div>
    </div>
  );
};

const AnalyticsChart: FC<ChartProps> = ({
  metric,
  chartType,
  onChartTypeChange,
  range,
  points,
  currency,
  quote,
  loading,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => setHoverIndex(null), [chartType, metric, points, range]);

  const geometry = useMemo(() => {
    const values = points.map((point) => point.value);
    const maximum = Math.max(...values, 1);
    const canUseFocusedScale = metric === "TVL" && chartType === "area";
    const minimum = canUseFocusedScale ? Math.min(...values, maximum) : 0;
    const floor = canUseFocusedScale ? Math.max(0, minimum * 0.985) : 0;
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
  }, [chartType, metric, points]);

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
      <div
        className="analytics-chart-types"
        role="group"
        aria-label="Chart style"
      >
        <button
          type="button"
          className={chartType === "area" ? "is-active" : ""}
          aria-label="Show area chart"
          aria-pressed={chartType === "area"}
          title="Area chart"
          onClick={() => onChartTypeChange("area")}
        >
          <ShowChartRoundedIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          className={chartType === "bars" ? "is-active" : ""}
          aria-label="Show bar chart"
          aria-pressed={chartType === "bars"}
          title="Bar chart"
          onClick={() => onChartTypeChange("bars")}
        >
          <BarChartRoundedIcon aria-hidden="true" />
        </button>
      </div>
      <div className="analytics-chart-readout" aria-live="polite">
        <strong>
          {activePoint
            ? formatDenominatedXtz(activePoint.value, currency, quote)
            : "—"}
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
          aria-label={`${metric} over ${rangeLabel(range)}, ${chartType} chart`}
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

          {chartType === "area" ? (
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
  const [chartType, setChartType] = useState<AnalyticsChartType>(() => {
    const saved = window.localStorage.getItem("tezex-analytics-chart-type");
    return saved === "bars" ? "bars" : "area";
  });
  const [range, setRange] = useState<AnalyticsRange>("7D");
  const [rangeWindow, setRangeWindow] = useState<RangeWindow>({
    start: 0,
    end: 6,
  });
  const [currency, setCurrency] = useState<AnalyticsCurrency>(() => {
    const saved = window.localStorage.getItem("tezex-analytics-currency");
    return CURRENCIES.includes(saved as AnalyticsCurrency)
      ? (saved as AnalyticsCurrency)
      : "XTZ";
  });
  const [scope, setScope] = useState(
    () => window.localStorage.getItem("tezex-analytics-scope") ?? "all"
  );
  const [model, setModel] = useState<AnalyticsModel>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const cache = useRef(new Map<string, AnalyticsModel>());
  const refreshTarget = useRef<string>();

  const isMainnet = network.network === NetworkType.MAINNET;
  const cacheKey = network.info.chainId;

  useEffect(() => {
    window.localStorage.setItem("tezex-analytics-currency", currency);
  }, [currency]);

  useEffect(() => {
    window.localStorage.setItem("tezex-analytics-chart-type", chartType);
  }, [chartType]);

  useEffect(() => {
    window.localStorage.setItem("tezex-analytics-scope", scope);
  }, [scope]);

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
    void loadAnalytics(network.info)
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
  }, [cacheKey, isMainnet, network.info, refreshKey]);

  useEffect(() => {
    if (!model) return;
    const scopedChart =
      scope === "all" ? model.chart : model.chartByPool[scope] ?? model.chart;
    setRangeWindow({
      start: 0,
      end: Math.max(0, scopedChart[range][metric].length - 1),
    });
  }, [metric, model, range, scope]);

  useEffect(() => {
    if (!model || scope === "all") return;
    if (!model.summaryByPool[scope]) setScope("all");
  }, [model, scope]);

  const refresh = useCallback(() => {
    cache.current.delete(cacheKey);
    refreshTarget.current = cacheKey;
    setRefreshKey((key) => key + 1);
  }, [cacheKey]);

  const selectRange = useCallback(
    (nextRange: AnalyticsRange) => {
      setRange(nextRange);
      if (!model) return;
      setRangeWindow({
        start: 0,
        end: Math.max(
          0,
          (scope === "all"
            ? model.chart
            : model.chartByPool[scope] ?? model.chart)[nextRange][metric]
            .length - 1
        ),
      });
    },
    [metric, model, scope]
  );

  const selectMetric = useCallback(
    (nextMetric: AnalyticsMetric) => setMetric(nextMetric),
    []
  );

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

  const selectedPool =
    scope === "all" ? undefined : model.pools.find((pool) => pool.id === scope);
  const summary =
    scope === "all"
      ? model.summary
      : model.summaryByPool[scope] ?? model.summary;
  const scopedChart =
    scope === "all" ? model.chart : model.chartByPool[scope] ?? model.chart;
  const selectedSeries = scopedChart[range][metric];
  const scopedPools = selectedPool ? [selectedPool] : model.pools;
  const scopedActivity =
    scope === "all"
      ? model.activity
      : model.activityByPool[scope] ?? model.activity;
  const visiblePoints = selectedSeries.slice(
    Math.min(rangeWindow.start, Math.max(0, selectedSeries.length - 1)),
    Math.min(rangeWindow.end + 1, selectedSeries.length)
  );
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
          <p>
            {selectedPool
              ? `Verified activity and liquidity for ${selectedPool.name}.`
              : "Verified activity and liquidity across TEZEX Mainnet pools."}
          </p>
        </div>
        <div className="analytics-intro__tools">
          <label className="analytics-scope-picker">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              aria-label="Analytics pool scope"
            >
              <option value="all">All pools</option>
              {model.pools.map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.name} · {pool.tokenA.label}/{pool.tokenB.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className={`analytics-segments analytics-denomination__segments is-${currency.toLowerCase()}`}
            role="group"
            aria-label="Display currency"
            title="Conversions use the latest TzKT XTZ market quote"
          >
            {CURRENCIES.map((item) => (
              <button
                key={item}
                type="button"
                className={currency === item ? "is-active" : ""}
                aria-pressed={currency === item}
                onClick={() => setCurrency(item)}
              >
                {item}
              </button>
            ))}
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
      </div>

      {error && (
        <div className="analytics-inline-error" role="status">
          Showing the last successful update. {error}
        </div>
      )}

      <section className="analytics-stats" aria-label="Market summary">
        <Stat
          label={selectedPool ? "Pool liquidity" : "Total liquidity"}
          value={formatDenominatedXtz(summary.tvlXtz, currency, model.quote)}
          delta={summary.tvlDelta}
        />
        <Stat
          label="Volume 24h"
          value={formatDenominatedXtz(
            summary.volume24hXtz,
            currency,
            model.quote
          )}
          delta={summary.volumeDelta}
        />
        <Stat
          label="Pool fees 24h"
          value={formatDenominatedXtz(
            summary.fees24hXtz,
            currency,
            model.quote
          )}
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
                  onClick={() => selectMetric(item)}
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
              {ANALYTICS_RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={range === item ? "is-active" : ""}
                  aria-pressed={range === item}
                  onClick={() => selectRange(item)}
                >
                  {rangeLabel(item)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AnalyticsChart
          metric={metric}
          chartType={chartType}
          onChartTypeChange={setChartType}
          range={range}
          points={visiblePoints}
          currency={currency}
          quote={model.quote}
          loading={loading}
        />
        <RangeScrubber
          points={selectedSeries}
          range={range}
          window={rangeWindow}
          onChange={setRangeWindow}
        />
      </section>

      <section className="analytics-panel" aria-labelledby="pools-title">
        <div className="analytics-panel__head">
          <h2 id="pools-title">POOLS</h2>
          <span className="analytics-panel__meta">
            {selectedPool
              ? `${selectedPool.name} · Current reserves · 24h activity`
              : "Current reserves · 24h activity"}
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
              {scopedPools.map((pool) => (
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
                  <td>
                    {formatDenominatedXtz(pool.tvlXtz, currency, model.quote)}
                  </td>
                  <td>
                    {formatDenominatedXtz(
                      pool.volume24hXtz,
                      currency,
                      model.quote
                    )}
                  </td>
                  <td className="analytics-optional">
                    {formatDenominatedXtz(
                      pool.fees24hXtz,
                      currency,
                      model.quote
                    )}
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
          <span className="analytics-panel__meta">
            {selectedPool
              ? `${selectedPool.name} · Confirmed on Tezos`
              : "Confirmed on Tezos"}
          </span>
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
              {scopedActivity.length ? (
                scopedActivity.map((activity) => {
                  const displayValue = formatDenominatedXtz(
                    activity.valueXtz,
                    currency,
                    model.quote
                  );
                  return (
                    <tr key={activity.id}>
                      <td>
                        <span className="analytics-badge">
                          {activity.action}
                        </span>
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
                            <small>
                              {activity.poolName}
                              <span className="analytics-mobile-value">
                                {" · "}
                                {displayValue}
                              </span>
                            </small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="analytics-activity-value">
                          <strong>{displayValue}</strong>
                          <small>{activity.value}</small>
                        </span>
                      </td>
                      <td
                        className="analytics-optional analytics-muted"
                        title={activity.account}
                      >
                        {activity.accountLabel ??
                          shortAddress(activity.account)}
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
                  );
                })
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
        <span>Rates {formatAgo(model.quote.timestamp, model.loadedAt)}</span>
        <span>Tezos Mainnet</span>
      </div>
    </main>
  );
};

export default Analytics;
