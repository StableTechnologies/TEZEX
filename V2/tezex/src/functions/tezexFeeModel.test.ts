import { detectTezexFeeModel, tezexPoolFeeRate } from "./tezexFeeModel";

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
