import React, { CSSProperties, FC } from "react";

import { Asset, Token } from "../../../types/general";

export interface TokenIconProps {
  asset: Asset;
  size?: number;
  overlapSurface?: string;
  decorative?: boolean;
  style?: CSSProperties;
}

const isLightBodiedToken = (asset: Asset) =>
  asset.name === Token.TzBTC || /tzbtc/i.test(asset.logo);

export const TokenIcon: FC<TokenIconProps> = ({
  asset,
  size = 26,
  overlapSurface,
  decorative = false,
  style,
}) => {
  const supportsCutout = Boolean(overlapSurface) && size >= 24;
  const supportsHairline = isLightBodiedToken(asset) && size >= 20;
  const cutoutWidth = supportsCutout ? Math.max(2, size * 0.08) : 0;

  return (
    <span
      className="tezex-token-icon"
      data-token={asset.name}
      data-treatment={[
        supportsHairline ? "hairline" : null,
        supportsCutout ? "cutout" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        boxSizing: "border-box",
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: "50%",
        border: supportsCutout
          ? `${cutoutWidth}px solid ${overlapSurface}`
          : "none",
        backgroundColor: isLightBodiedToken(asset)
          ? "var(--tezex-token-light-body)"
          : "transparent",
        boxShadow: supportsHairline
          ? "inset 0 0 0 1px var(--tezex-token-hairline)"
          : "none",
        ...style,
      }}
    >
      <img
        src={process.env.PUBLIC_URL + asset.logo}
        alt={decorative ? "" : asset.label}
        aria-hidden={decorative || undefined}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </span>
  );
};

export interface TokenPairProps {
  tokenA: Asset;
  tokenB: Asset;
  size?: number;
  surface: string;
  decorative?: boolean;
}

export const TokenPair: FC<TokenPairProps> = ({
  tokenA,
  tokenB,
  size = 28,
  surface,
  decorative = false,
}) => {
  const overlap = size >= 24 ? size * -0.28 : 0;

  return (
    <span
      className="tezex-token-pair"
      aria-label={decorative ? undefined : `${tokenA.label} / ${tokenB.label}`}
      aria-hidden={decorative || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <TokenIcon asset={tokenA} size={size} decorative style={{ zIndex: 1 }} />
      <TokenIcon
        asset={tokenB}
        size={size}
        overlapSurface={surface}
        decorative
        style={{ marginLeft: overlap, zIndex: 2 }}
      />
    </span>
  );
};
