import { Token } from "./types/general";
import { PoolConfig, PoolType } from "./types/pools";
import {
  getLiquidityPath,
  getSwapPath,
  getTokenRouteSlug,
  resolveLiquidityPair,
  resolveSwapPair,
} from "./tradeRouting";

const sirius: PoolConfig = {
  id: "xtz-tzbtc-sirius",
  name: "Sirius",
  type: PoolType.SIRIUS,
  address: "KT1-sirius",
  tokenA: Token.XTZ,
  tokenB: Token.TzBTC,
  lpToken: Token.Sirs,
};

const tezex: PoolConfig = {
  id: "xtz-usdtz-tezex",
  name: "TEZEX",
  type: PoolType.TEZEX,
  address: "KT1-tezex",
  tokenA: Token.XTZ,
  tokenB: Token.USDtz,
  lpToken: Token.LP_XTZUSDtz,
};

const tokenPair: PoolConfig = {
  id: "usdt-tzbtc-tezex",
  name: "TEZEX",
  type: PoolType.TEZEX_TOKEN,
  address: "KT1-token-pool",
  tokenA: Token.USDt,
  tokenB: Token.TzBTC,
  lpToken: Token.LP_USDtTzBTC,
};

const pools = [sirius, tezex, tokenPair];

describe("canonical trading routes", () => {
  it("uses stable, human-readable token slugs", () => {
    expect(getTokenRouteSlug(Token.XTZ)).toBe("xtz");
    expect(getTokenRouteSlug(Token.TzBTC)).toBe("tzbtc");
    expect(getTokenRouteSlug(Token.USDtz)).toBe("usdtz");
  });

  it("encodes swap direction in the path", () => {
    expect(getSwapPath(Token.XTZ, Token.TzBTC)).toBe("/swap/xtz-to-tzbtc");
    expect(getSwapPath(Token.TzBTC, Token.XTZ)).toBe("/swap/tzbtc-to-xtz");

    expect(resolveSwapPair("tzbtc-to-xtz", pools)).toEqual({
      pool: sirius,
      sendToken: Token.TzBTC,
      receiveToken: Token.XTZ,
    });
  });

  it("resolves every supported swap pair and rejects invalid paths", () => {
    expect(resolveSwapPair("xtz-to-usdtz", pools)?.pool).toBe(tezex);
    expect(resolveSwapPair("usdt-to-tzbtc", pools)?.pool).toBe(tokenPair);
    expect(resolveSwapPair("tzbtc-to-usdt", pools)).toEqual({
      pool: tokenPair,
      sendToken: Token.TzBTC,
      receiveToken: Token.USDt,
    });
    expect(resolveSwapPair("tzbtc-to-usdtz", pools)).toBeUndefined();
    expect(resolveSwapPair("xtz-tzbtc", pools)).toBeUndefined();
  });

  it("uses one canonical liquidity pair for add and remove", () => {
    expect(getLiquidityPath(sirius)).toBe("/liquidity/xtz-tzbtc");
    expect(getLiquidityPath(sirius, "remove")).toBe(
      "/liquidity/xtz-tzbtc/remove"
    );
    expect(resolveLiquidityPair("tzbtc-xtz", pools)).toBe(sirius);
    expect(resolveLiquidityPair("xtz-usdtz", pools)).toBe(tezex);
    expect(resolveLiquidityPair("tzbtc-usdt", pools)).toBe(tokenPair);
  });
});
