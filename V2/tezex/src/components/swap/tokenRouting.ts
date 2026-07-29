import { Asset, Token } from "../../types/general";
import { PoolConfig } from "../../types/pools";

export const findPoolForTokenPair = (
  pools: PoolConfig[],
  tokenA: Token,
  tokenB: Token
): PoolConfig | undefined =>
  pools.find(
    (pool) =>
      (pool.tokenA === tokenA && pool.tokenB === tokenB) ||
      (pool.tokenA === tokenB && pool.tokenB === tokenA)
  );

export const getCompatibleSwapAssets = (
  pools: PoolConfig[],
  counterpart: Token,
  getAsset: (token: Token) => Asset
): Asset[] => {
  const compatibleTokens: Token[] = [];

  pools.forEach((pool) => {
    const token =
      pool.tokenA === counterpart
        ? pool.tokenB
        : pool.tokenB === counterpart
        ? pool.tokenA
        : undefined;

    if (token && !compatibleTokens.includes(token))
      compatibleTokens.push(token);
  });

  return compatibleTokens.map(getAsset);
};
