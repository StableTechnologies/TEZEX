import React, { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { DEFAULT_SWAP_PATH } from "../../tradeRouting";

import "./style.css";

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const STARS: Star[] = (() => {
  let seed = 20260730;
  const stars: Star[] = [];
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let index = 0; index < 90; index += 1) {
    const depth = random();
    stars.push({
      x: Number((random() * 100).toFixed(2)),
      y: Number((random() * 100).toFixed(2)),
      radius: Number(((0.4 + depth * 1.5) * 0.09).toFixed(3)),
      opacity: Number((0.18 + depth * 0.55).toFixed(2)),
    });
  }

  return stars;
})();

const SurveyReticle: FC = () => (
  <svg
    className="not-found__scope"
    viewBox="0 0 240 240"
    fill="none"
    role="img"
    aria-label="Survey reticle centred on empty sky"
  >
    <path
      className="not-found__scope-frame"
      strokeWidth="1.6"
      strokeLinecap="round"
      d="M22 62V22h40 M178 22h40v40 M218 178v40h-40 M62 218H22v-40"
    />
    <circle
      className="not-found__scope-ring"
      cx="120"
      cy="120"
      r="66"
      strokeWidth="1"
      strokeDasharray="1 7"
    />
    <g
      className="not-found__scope-ticks"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <line x1="120" y1="40" x2="120" y2="54" />
      <line x1="120" y1="186" x2="120" y2="200" />
      <line x1="40" y1="120" x2="54" y2="120" />
      <line x1="186" y1="120" x2="200" y2="120" />
    </g>
    <g
      className="not-found__scope-hairs"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <line x1="120" y1="86" x2="120" y2="110" />
      <line x1="120" y1="130" x2="120" y2="154" />
      <line x1="86" y1="120" x2="110" y2="120" />
      <line x1="130" y1="120" x2="154" y2="120" />
    </g>
    <g className="not-found__scope-sweep">
      <line
        x1="120"
        y1="120"
        x2="120"
        y2="56"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity=".55"
      />
    </g>
  </svg>
);

export const NotFound: FC = () => {
  const location = useLocation();

  return (
    <main className="not-found" aria-labelledby="not-found-title">
      <svg
        className="not-found__sky"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {STARS.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="currentColor"
            opacity={star.opacity}
          />
        ))}
      </svg>

      <div className="not-found__content">
        <SurveyReticle />

        <p className="not-found__status">NO OBJECT AT THIS COORDINATE</p>
        <h1 id="not-found-title">Empty sector.</h1>
        <p className="not-found__description">
          The survey came back clean. There&apos;s no page at this address — it
          may have moved to another orbit, or it was never charted.
        </p>

        <div className="not-found__telemetry" aria-label="Request telemetry">
          <div className="not-found__telemetry-row">
            <span>REQUESTED</span>
            <strong>{location.pathname}</strong>
          </div>
          <div className="not-found__telemetry-row">
            <span>RESPONSE</span>
            <strong>404 — NOT FOUND</strong>
          </div>
          <div className="not-found__telemetry-row">
            <span>SURVEY</span>
            <strong>complete · 0 results</strong>
          </div>
        </div>

        <div className="not-found__actions">
          <Link className="not-found__button is-primary" to={DEFAULT_SWAP_PATH}>
            BACK TO SWAP
          </Link>
          <Link className="not-found__button is-secondary" to="/analytics">
            VIEW ANALYTICS
          </Link>
        </div>
      </div>

      <p className="not-found__footer">TEZEX · DEEP FIELD SURVEY</p>
    </main>
  );
};
