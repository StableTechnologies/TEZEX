import { Token, TokenType } from "../../types/general";
import { PoolConfig, PoolType } from "../../types/pools";
import { PoolRegistry } from "../../adapters/poolRegistry";
import {
  findPoolForTokenPair,
  getCompatibleSwapAssets,
  getSwapDisplaySymbol,
} from "./tokenRouting";

const pools: PoolConfig[] = [
  {
    id: "tez-btc",
    name: "Sirius",
    type: PoolType.SIRIUS,
    address: "KT1btc",
    tokenA: Token.XTZ,
    tokenB: Token.TzBTC,
    lpToken: Token.Sirs,
  },
  {
    id: "tez-usd",
    name: "TEZEX",
    type: PoolType.TEZEX,
    address: "KT1usd",
    tokenA: Token.XTZ,
    tokenB: Token.USDtz,
    lpToken: Token.LP_XTZUSDtz,
  },
];

const getAsset = (name: Token) => ({
  name,
  label: name,
  logo: `/${name}.svg`,
  address: "",
  decimals: 6,
  type: TokenType.FA12,
});

describe("swap token routing", () => {
  it("uses canonical symbols in pair-aware swap headings", () => {
    expect(
      getSwapDisplaySymbol({
        ...getAsset(Token.XTZ),
        label: "Tez",
        type: TokenType.XTZ,
      })
    ).toBe("XTZ");
    expect(
      getSwapDisplaySymbol({
        ...getAsset(Token.TzBTC),
        label: "tzBTC",
      })
    ).toBe("tzBTC");
  });

  it("resolves the same pool regardless of trade direction", () => {
    expect(findPoolForTokenPair(pools, Token.XTZ, Token.TzBTC)?.id).toBe(
      "tez-btc"
    );
    expect(findPoolForTokenPair(pools, Token.TzBTC, Token.XTZ)?.id).toBe(
      "tez-btc"
    );
  });

  it("offers only assets connected to the token in the other field", () => {
    expect(
      getCompatibleSwapAssets(pools, Token.XTZ, getAsset).map(
        (asset) => asset.name
      )
    ).toEqual([Token.TzBTC, Token.USDtz]);

    expect(
      getCompatibleSwapAssets(pools, Token.TzBTC, getAsset).map(
        (asset) => asset.name
      )
    ).toEqual([Token.XTZ]);
  });

  it("does not synthesize a token-to-token route through Sirius", () => {
    expect(
      findPoolForTokenPair(pools, Token.TzBTC, Token.BTCtz)
    ).toBeUndefined();
    expect(
      getCompatibleSwapAssets(pools, Token.TzBTC, getAsset).map(
        (asset) => asset.name
      )
    ).toEqual([Token.XTZ]);
  });

  it("rejects and hides a Sirius pool configured without a direct XTZ leg", () => {
    const unsupported: PoolConfig = {
      ...pools[0],
      id: "unsupported-sirius-token-route",
      tokenA: Token.BTCtz,
      tokenB: Token.TzBTC,
    };

    expect(
      findPoolForTokenPair([unsupported], Token.BTCtz, Token.TzBTC)
    ).toBeUndefined();
    expect(
      getCompatibleSwapAssets([unsupported], Token.BTCtz, getAsset)
    ).toEqual([]);

    PoolRegistry.clear();
    expect(() => PoolRegistry.registerPool(unsupported)).toThrow(
      /unsupported pool configuration/i
    );
  });
});
