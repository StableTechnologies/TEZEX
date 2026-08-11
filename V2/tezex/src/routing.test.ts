import {
  canonicalTezexUrl,
  canonicalPath,
  homePathForHost,
  isStezOnlyHost,
  routeFromLegacyHash,
  STEZ_HOSTNAME,
  stezRouteFromHash,
} from "./routing";

describe("hostname-specific routing", () => {
  it("recognizes only the dedicated sTEZ hostname", () => {
    expect(isStezOnlyHost(STEZ_HOSTNAME)).toBe(true);
    expect(isStezOnlyHost("STEZ.TEZEX.IO")).toBe(true);
    expect(isStezOnlyHost("tezex.io")).toBe(false);
    expect(isStezOnlyHost("stez.tezex.io.example.com")).toBe(false);
  });

  it("uses a redirect route when leaving the dedicated sTEZ hostname", () => {
    expect(homePathForHost(STEZ_HOSTNAME)).toBe("/swap/xtz-to-tzbtc");
    expect(homePathForHost("tezex.io")).toBe("/swap/xtz-to-tzbtc");
  });

  it("moves non-sTEZ routes to the canonical TEZEX origin", () => {
    expect(canonicalTezexUrl("/home/swap")).toBe(
      "https://tezex.io/swap/xtz-to-tzbtc"
    );
    expect(canonicalTezexUrl("/analytics", "?range=30d")).toBe(
      "https://tezex.io/analytics?range=30d"
    );
  });

  it("maps legacy application routes to clean canonical paths", () => {
    expect(canonicalPath("/")).toBe("/swap/xtz-to-tzbtc");
    expect(canonicalPath("/home/swap")).toBe("/swap/xtz-to-tzbtc");
    expect(canonicalPath("/home/add")).toBe("/liquidity/xtz-tzbtc");
    expect(canonicalPath("/home/remove")).toBe("/liquidity/xtz-tzbtc/remove");
    expect(canonicalPath("/analytics")).toBe("/analytics");
  });

  it("converts old hash URLs without dropping their query string", () => {
    expect(routeFromLegacyHash("#/home/swap")).toBe("/swap/xtz-to-tzbtc");
    expect(routeFromLegacyHash("#/home/add?pool=sirius")).toBe(
      "/liquidity/xtz-tzbtc?pool=sirius"
    );
    expect(routeFromLegacyHash("#/analytics?range=30d")).toBe(
      "/analytics?range=30d"
    );
    expect(routeFromLegacyHash("#section")).toBeNull();
  });

  it("maps the clean sTEZ URL to its internal page without exposing a hash", () => {
    expect(stezRouteFromHash("")).toBe("/stez");
    expect(stezRouteFromHash("#/")).toBe("/stez");
    expect(stezRouteFromHash("#/stez")).toBe("/stez");
  });

  it("preserves an incoming non-sTEZ route long enough to redirect it", () => {
    expect(stezRouteFromHash("#/home/swap")).toBe("/home/swap");
    expect(stezRouteFromHash("#/analytics?range=30d")).toBe(
      "/analytics?range=30d"
    );
  });
});
