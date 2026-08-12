import React, { FC } from "react";
import CircularProgress from "@mui/material/CircularProgress";

import tezexIcon from "../../../../assets/tezexIcon.svg";
import "./style.css";

interface BrandedLoaderProps {
  label?: string;
  compact?: boolean;
}

export const BrandedLoader: FC<BrandedLoaderProps> = ({
  label = "Preparing exchange",
  compact = false,
}) => (
  <div
    className={`tezex-loader${compact ? " is-compact" : ""}`}
    role="status"
    aria-live="polite"
  >
    <span className="tezex-loader__mark" aria-hidden="true">
      <CircularProgress
        className="tezex-loader__orbit"
        size={compact ? 50 : 70}
        thickness={1.8}
      />
      <img src={tezexIcon} alt="" />
    </span>
    <span className="tezex-loader__label">{label}</span>
  </div>
);

const SkeletonLine: FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`tezex-skeleton ${className}`} aria-hidden="true" />
);

const AmountFieldSkeleton: FC = () => (
  <div className="tezex-loading-field" aria-hidden="true">
    <SkeletonLine className="tezex-loading-field__label" />
    <SkeletonLine className="tezex-loading-field__amount" />
    <span className="tezex-loading-field__token">
      <SkeletonLine className="tezex-loading-field__token-icon" />
      <SkeletonLine className="tezex-loading-field__token-name" />
    </span>
  </div>
);

interface TradingLoadingStateProps {
  variant?: "swap" | "liquidity";
}

export const TradingLoadingState: FC<TradingLoadingStateProps> = ({
  variant = "swap",
}) => (
  <div
    className={`tezex-trading-loading is-${variant}`}
    role="status"
    aria-live="polite"
    aria-label={
      variant === "swap" ? "Preparing swap" : "Preparing liquidity tools"
    }
  >
    <section className="tezex-trading-loading__card" aria-hidden="true">
      <header className="tezex-trading-loading__header">
        <span>
          <SkeletonLine className="tezex-trading-loading__eyebrow" />
          <SkeletonLine className="tezex-trading-loading__title" />
        </span>
        {variant === "liquidity" && (
          <SkeletonLine className="tezex-trading-loading__selector" />
        )}
      </header>
      <div className="tezex-trading-loading__body">
        <div className="tezex-trading-loading__fields">
          <AmountFieldSkeleton />
          <span className="tezex-trading-loading__join" />
          <AmountFieldSkeleton />
        </div>
        <div className="tezex-trading-loading__quote">
          <SkeletonLine className="tezex-trading-loading__quote-copy" />
          <SkeletonLine className="tezex-trading-loading__quote-status" />
        </div>
        <SkeletonLine className="tezex-trading-loading__action" />
      </div>
      <footer className="tezex-trading-loading__footer">
        <SkeletonLine className="tezex-trading-loading__footer-copy" />
        <SkeletonLine className="tezex-trading-loading__footer-control" />
      </footer>
    </section>

    {variant === "swap" && (
      <aside className="tezex-trading-loading__context" aria-hidden="true">
        <div className="tezex-trading-loading__context-panel">
          <SkeletonLine className="tezex-trading-loading__context-title" />
          {[0, 1, 2, 3].map((item) => (
            <span className="tezex-trading-loading__context-row" key={item}>
              <SkeletonLine />
              <SkeletonLine />
            </span>
          ))}
        </div>
        <div className="tezex-trading-loading__context-panel is-short">
          <BrandedLoader label="Preparing exchange" compact />
        </div>
      </aside>
    )}
  </div>
);

const AnalyticsRowSkeleton: FC = () => (
  <span className="tezex-analytics-loading__row" aria-hidden="true">
    <span className="tezex-analytics-loading__pair">
      <SkeletonLine className="tezex-analytics-loading__token" />
      <SkeletonLine className="tezex-analytics-loading__pair-name" />
    </span>
    <SkeletonLine />
    <SkeletonLine />
    <SkeletonLine />
  </span>
);

export const AnalyticsLoadingState: FC = () => (
  <div
    className="tezex-analytics-loading"
    role="status"
    aria-live="polite"
    aria-label="Loading on-chain analytics"
  >
    <section className="tezex-analytics-loading__stats" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <span key={item}>
          <SkeletonLine className="tezex-analytics-loading__stat-label" />
          <SkeletonLine className="tezex-analytics-loading__stat-value" />
          <SkeletonLine className="tezex-analytics-loading__stat-change" />
        </span>
      ))}
    </section>

    <section className="tezex-analytics-loading__panel" aria-hidden="true">
      <header>
        <SkeletonLine className="tezex-analytics-loading__panel-title" />
        <SkeletonLine className="tezex-analytics-loading__panel-meta" />
      </header>
      <div className="tezex-analytics-loading__chart">
        <span className="tezex-analytics-loading__scan" />
        <span />
        <span />
        <span />
      </div>
    </section>

    <section className="tezex-analytics-loading__panel" aria-hidden="true">
      <header>
        <SkeletonLine className="tezex-analytics-loading__panel-title" />
        <SkeletonLine className="tezex-analytics-loading__panel-meta" />
      </header>
      <AnalyticsRowSkeleton />
      <AnalyticsRowSkeleton />
      <AnalyticsRowSkeleton />
    </section>
  </div>
);
