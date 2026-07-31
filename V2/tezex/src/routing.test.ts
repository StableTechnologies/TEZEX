import { canonicalTezexUrl, isStezOnlyHost, STEZ_HOSTNAME } from "./routing";

describe("hostname-specific routing", () => {
  it("recognizes only the dedicated sTEZ hostname", () => {
    expect(isStezOnlyHost(STEZ_HOSTNAME)).toBe(true);
    expect(isStezOnlyHost("STEZ.TEZEX.IO")).toBe(true);
    expect(isStezOnlyHost("tezex.io")).toBe(false);
    expect(isStezOnlyHost("stez.tezex.io.example.com")).toBe(false);
  });

  it("moves non-sTEZ routes to the canonical TEZEX origin", () => {
    expect(canonicalTezexUrl("/home/swap")).toBe(
      "https://tezex.io/#/home/swap"
    );
    expect(canonicalTezexUrl("/analytics", "?range=30d")).toBe(
      "https://tezex.io/#/analytics?range=30d"
    );
  });
});
