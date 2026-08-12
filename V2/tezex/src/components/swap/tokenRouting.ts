import { Asset, Token } from "../../types/general";
import { PoolConfig, supportsDirectSwap } from "../../types/pools";

export const getSwapDisplaySymbol = (asset: Asset): string =>
  asset.name === Token.XTZ ? "XTZ" : asset.label;

export const findPoolForTokenPair = (
  pools: PoolConfig[],
  tokenA: Token,
  tokenB: Token
): PoolConfig | undefined =>
  pools.find((pool) => supportsDirectSwap(pool, tokenA, tokenB));

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

    if (
      token &&
      supportsDirectSwap(pool, counterpart, token) &&
      !compatibleTokens.includes(token)
    )
      compatibleTokens.push(token);
  });

  return compatibleTokens.map(getAsset);
};
