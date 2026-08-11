import { Token } from "./types/general";
import { PoolConfig, supportsDirectSwap } from "./types/pools";

export const DEFAULT_SWAP_PATH = "/swap/xtz-to-tzbtc";
export const DEFAULT_LIQUIDITY_PATH = "/liquidity/xtz-tzbtc";
export const DEFAULT_REMOVE_LIQUIDITY_PATH = "/liquidity/xtz-tzbtc/remove";

export type LiquidityRouteMode = "add" | "remove";

export interface SwapRouteSelection {
  pool: PoolConfig;
  sendToken: Token;
  receiveToken: Token;
}

export const getTokenRouteSlug = (token: Token): string =>
  token.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getSwapPath = (sendToken: Token, receiveToken: Token): string =>
  `/swap/${getTokenRouteSlug(sendToken)}-to-${getTokenRouteSlug(receiveToken)}`;

export const getLiquidityPairSlug = (pool: PoolConfig): string =>
  `${getTokenRouteSlug(pool.tokenA)}-${getTokenRouteSlug(pool.tokenB)}`;

export const getLiquidityPath = (
  pool: PoolConfig,
  mode: LiquidityRouteMode = "add"
): string => {
  const basePath = `/liquidity/${getLiquidityPairSlug(pool)}`;
  return mode === "remove" ? `${basePath}/remove` : basePath;
};

export const resolveSwapPair = (
  pairSlug: string | undefined,
  pools: PoolConfig[]
): SwapRouteSelection | undefined => {
  if (!pairSlug) return undefined;

  const match = pairSlug
    .trim()
    .toLowerCase()
    .match(/^([a-z0-9]+)-to-([a-z0-9]+)$/);
  if (!match) return undefined;

  const [, sendSlug, receiveSlug] = match;

  for (const pool of pools) {
    const poolTokens = [pool.tokenA, pool.tokenB];
    const sendToken = poolTokens.find(
      (token) => getTokenRouteSlug(token) === sendSlug
    );
    const receiveToken = poolTokens.find(
      (token) => getTokenRouteSlug(token) === receiveSlug
    );

    if (
      sendToken &&
      receiveToken &&
      supportsDirectSwap(pool, sendToken, receiveToken)
    ) {
      return { pool, sendToken, receiveToken };
    }
  }

  return undefined;
};

export const resolveLiquidityPair = (
  pairSlug: string | undefined,
  pools: PoolConfig[]
): PoolConfig | undefined => {
  if (!pairSlug) return undefined;

  const normalizedPair = pairSlug.trim().toLowerCase();

  return pools.find((pool) => {
    const tokenA = getTokenRouteSlug(pool.tokenA);
    const tokenB = getTokenRouteSlug(pool.tokenB);
    return (
      normalizedPair === `${tokenA}-${tokenB}` ||
      normalizedPair === `${tokenB}-${tokenA}`
    );
  });
};
