import {
  detectTezexFeeModel,
  fallbackTezexFeeBp,
  formatTezexFeeLabel,
  parseGetFeeBpView,
  resolveTezexFeeBp,
  tezexAmmFeeBp,
  tezexPoolFeeRate,
} from "./tezexFeeModel";

describe("detectTezexFeeModel", () => {
  it("detects base pools without protocol fields", () => {
    expect(
      detectTezexFeeModel({
        xtzPool: "1000",
        tokenPool: "1000",
        lqtTotal: "1000",
      })
    ).toBe("base");
  });

  it("detects legacy-mod from protocol_fee_bp", () => {
    expect(
      detectTezexFeeModel({
        protocol_fee_bp: 5,
        protocol_fee_recipient: "tz1...",
      })
    ).toBe("legacy-mod");
  });

  it("detects new-mod from protocol recipient / accumulated fields", () => {
    expect(
      detectTezexFeeModel({
        protocol_fee_recipient: "tz1LovVc1JH3taNFjemXWCEywqgxhWsjfvRW",
        accumulated_protocol_fee_xtz: "0",
        accumulated_protocol_fee_token: "0",
      })
    ).toBe("new-mod");
  });
});

describe("tezexPoolFeeRate", () => {
  it("returns 0.003 for base and new-mod (no double-count)", () => {
    expect(tezexPoolFeeRate({})).toBe(0.003);
    expect(
      tezexPoolFeeRate({
        protocol_fee_recipient: "tz1...",
        accumulated_protocol_fee_xtz: "0",
      })
    ).toBe(0.003);
  });

  it("adds protocol_fee_bp only for legacy-mod", () => {
    expect(tezexPoolFeeRate({ protocol_fee_bp: 5 })).toBe(0.0035);
  });
});

describe("parseGetFeeBpView", () => {
  it("parses nested Michelson pair (lp, (protocol, total))", () => {
    expect(
      parseGetFeeBpView({
        0: 25,
        1: { 0: 5, 1: 30 },
      })
    ).toEqual({ lpFeeBp: 25, protocolFeeBp: 5, totalFeeBp: 30 });
  });

  it("parses flat array tuple", () => {
    expect(parseGetFeeBpView([25, 5, 30])).toEqual({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
    });
  });

  it("parses plain nat from base get_fee_bp", () => {
    expect(parseGetFeeBpView(30)).toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 0,
      totalFeeBp: 30,
    });
    expect(parseGetFeeBpView("30")).toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 0,
      totalFeeBp: 30,
    });
  });
});

describe("fallbackTezexFeeBp / resolveTezexFeeBp", () => {
  it("falls back to total 30 for base", () => {
    expect(fallbackTezexFeeBp("base")).toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 0,
      totalFeeBp: 30,
      source: "fallback",
    });
  });

  it("falls back to 25/5/30 for new-mod", () => {
    expect(fallbackTezexFeeBp("new-mod")).toEqual({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
      source: "fallback",
    });
  });

  it("uses storage protocol_fee_bp for legacy-mod", () => {
    expect(fallbackTezexFeeBp("legacy-mod", { protocol_fee_bp: 5 })).toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 5,
      totalFeeBp: 35,
      source: "fallback",
    });
  });

  it("reads new-mod fees from get_fee_bp contractViews on success", async () => {
    const executeView = jest
      .fn()
      .mockResolvedValue({ 0: 25, 1: { 0: 5, 1: 30 } });
    const contract = {
      address: "KT1FeeViewCaller",
      contractViews: {
        get_fee_bp: () => ({ executeView }),
      },
    };
    await expect(
      resolveTezexFeeBp(
        contract,
        "new-mod",
        { protocol_fee_recipient: "tz1..." },
        "KT1FeeViewCaller"
      )
    ).resolves.toEqual({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
      source: "view",
    });
    expect(executeView).toHaveBeenCalledWith({
      viewCaller: "KT1FeeViewCaller",
    });
  });

  it("preserves OnChainView this when calling executeView", async () => {
    // Mirrors Taquito OnChainView: method body reads instance fields via `this`.
    class FakeOnChainView {
      constructor(private readonly result: unknown) {}
      async executeView(_executionContext?: { viewCaller?: string }) {
        if (!this || this.result === undefined) {
          throw new TypeError("lost this");
        }
        return this.result;
      }
    }
    const view = new FakeOnChainView({ 0: 25, 1: { 0: 5, 1: 30 } });
    const executeViewSpy = jest.spyOn(view, "executeView");
    const contract = {
      address: "KT1ThisBound",
      contractViews: {
        get_fee_bp: () => view,
      },
    };
    await expect(
      resolveTezexFeeBp(contract, "new-mod", {
        protocol_fee_recipient: "tz1...",
      })
    ).resolves.toEqual({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
      source: "view",
    });
    expect(executeViewSpy).toHaveBeenCalledWith({ viewCaller: "KT1ThisBound" });
  });

  it("reads base fees from plain get_fee_bp nat on success", async () => {
    const executeView = jest.fn().mockResolvedValue(30);
    const contract = {
      address: "KT1Base",
      contractViews: {
        get_fee_bp: () => ({ executeView }),
      },
    };
    await expect(resolveTezexFeeBp(contract, "base", {})).resolves.toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 0,
      totalFeeBp: 30,
      source: "view",
    });
    expect(executeView).toHaveBeenCalledWith({ viewCaller: "KT1Base" });
  });

  it("ignores legacy TZIP-4 views map and uses contractViews", async () => {
    const executeView = jest.fn().mockResolvedValue([25, 5, 30]);
    const contract = {
      address: "KT1Mod",
      views: {
        get_fee_bp: () => ({
          read: async () => {
            throw new Error("should not use views.read");
          },
        }),
      },
      contractViews: {
        get_fee_bp: () => ({ executeView }),
      },
    };
    await expect(
      resolveTezexFeeBp(contract, "new-mod", {
        protocol_fee_recipient: "tz1...",
      })
    ).resolves.toMatchObject({ source: "view", totalFeeBp: 30 });
    expect(executeView).toHaveBeenCalled();
  });

  it("falls back when get_fee_bp executeView fails", async () => {
    const contract = {
      contractViews: {
        get_fee_bp: () => ({
          executeView: async () => {
            throw new Error("Http error response: (404)");
          },
        }),
      },
    };
    await expect(
      resolveTezexFeeBp(contract, "new-mod", {
        protocol_fee_recipient: "tz1...",
      })
    ).resolves.toEqual({
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
      source: "fallback",
    });
  });

  it("falls back for base when get_fee_bp is missing", async () => {
    await expect(resolveTezexFeeBp({}, "base", {})).resolves.toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 0,
      totalFeeBp: 30,
      source: "fallback",
    });
  });

  it("does not call get_fee_bp for legacy-mod", async () => {
    const executeView = jest.fn();
    const contract = {
      contractViews: {
        get_fee_bp: () => ({ executeView }),
      },
    };
    await expect(
      resolveTezexFeeBp(contract, "legacy-mod", { protocol_fee_bp: 5 })
    ).resolves.toEqual({
      lpFeeBp: 30,
      protocolFeeBp: 5,
      totalFeeBp: 35,
      source: "fallback",
    });
    expect(executeView).not.toHaveBeenCalled();
  });
});

describe("tezexAmmFeeBp / formatTezexFeeLabel", () => {
  it("keeps AMM at 30 bp for legacy-mod regardless of total label bp", () => {
    expect(tezexAmmFeeBp("legacy-mod", 35)).toBe(30);
    expect(tezexAmmFeeBp("new-mod", 30)).toBe(30);
    expect(tezexAmmFeeBp("base", 30)).toBe(30);
  });

  it("formats split and flat fee labels", () => {
    expect(
      formatTezexFeeLabel({ lpFeeBp: 25, protocolFeeBp: 5, totalFeeBp: 30 })
    ).toBe("0.30% (0.25% LP / 0.05% TEZEX)");
    expect(
      formatTezexFeeLabel({ lpFeeBp: 30, protocolFeeBp: 0, totalFeeBp: 30 })
    ).toBe("0.30% pool fee");
  });
});
