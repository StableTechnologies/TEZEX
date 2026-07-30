import BigNumber from "bignumber.js";
import { NetworkType } from "@airgap/beacon-sdk";

import { Asset, Token, TokenType } from "../types/general";
import { formatWithSubscript, getBalanceFromTzKT, getTxDeadline } from "./util";
import { TRANSACTION_DEADLINE_MS } from "./transactionSafety";

describe("formatWithSubscript", () => {
  it("should format regular decimal values correctly", () => {
    expect(formatWithSubscript(new BigNumber("1.23"), 2)).toBe("1.23");
    expect(formatWithSubscript(new BigNumber("0.1"), 2)).toBe("0.10");
  });

  it("should handle zero correctly", () => {
    expect(formatWithSubscript(new BigNumber("0"), 2)).toBe("0");
  });

  it("should format values with multiple leading zeros correctly", () => {
    expect(formatWithSubscript(new BigNumber("0.0001"), 2)).toBe("0.0₃1");
    expect(formatWithSubscript(new BigNumber("0.000123"), 2)).toBe("0.0₃12");
    expect(
      formatWithSubscript(new BigNumber("0.000000000000000000001"), 2)
    ).toBe("0.0₂₀1");
  });

  it("should handle values with single leading zero without subscript", () => {
    expect(formatWithSubscript(new BigNumber("0.01"), 2)).toBe("0.01");
    expect(formatWithSubscript(new BigNumber("0.05"), 2)).toBe("0.05");
  });

  it("should remove trailing zeros from significant digits", () => {
    expect(formatWithSubscript(new BigNumber("0.000100"), 2)).toBe("0.0₃1");
    expect(formatWithSubscript(new BigNumber("0.000400"), 3)).toBe("0.0₃4");
  });

  it("should format integer values correctly", () => {
    expect(formatWithSubscript(new BigNumber("123"), 2)).toBe("123");
    expect(formatWithSubscript(new BigNumber("1000"), 2)).toBe("1000");
    expect(formatWithSubscript(new BigNumber("1"), 2)).toBe("1");
  });
});

describe("getTxDeadline", () => {
  it("allows enough time for a mobile wallet approval", () => {
    const now = Date.parse("2026-07-20T12:00:00Z");
    jest.spyOn(Date, "now").mockReturnValue(now);

    expect(getTxDeadline().getTime()).toBe(now + TRANSACTION_DEADLINE_MS);

    jest.restoreAllMocks();
  });
});

describe("getBalanceFromTzKT", () => {
  const account = "tz1-user";
  const asset: Asset = {
    name: Token.USDt,
    label: "USDt",
    logo: "",
    address: "KT1-token",
    decimals: 6,
    type: TokenType.FA2,
    tokenId: 7,
  };

  const tokenBalance = (overrides: Record<string, unknown> = {}) => ({
    account: { address: account },
    token: {
      contract: { address: asset.address },
      tokenId: asset.tokenId?.toString(),
    },
    balance: "9007199254740993",
    ...overrides,
  });

  const jsonResponse = (data: unknown, ok = true, status = 200) =>
    ({
      ok,
      status,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn(),
    } as unknown as Response);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("queries and verifies the exact account, contract, and token ID", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse([tokenBalance()]));

    const balance = await getBalanceFromTzKT(
      NetworkType.MAINNET,
      account,
      asset
    );

    expect(balance.toFixed()).toBe("9007199254740993");
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.searchParams.get("account")).toBe(account);
    expect(requestUrl.searchParams.get("token.contract")).toBe(asset.address);
    expect(requestUrl.searchParams.get("token.tokenId")).toBe("7");
    expect(requestUrl.searchParams.get("limit")).toBe("2");
  });

  it("returns zero only for an unambiguous empty token result", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(jsonResponse([]));

    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, asset)
    ).resolves.toEqual(new BigNumber(0));
  });

  it("fails closed on multiple or mismatched token results", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    fetchMock.mockResolvedValueOnce(
      jsonResponse([tokenBalance(), tokenBalance()])
    );
    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, asset)
    ).rejects.toThrow(/ambiguous token balance/i);

    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        tokenBalance({
          token: { contract: { address: asset.address }, tokenId: "8" },
        }),
      ])
    );
    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, asset)
    ).rejects.toThrow(/identity did not match/i);
  });

  it("fails closed on HTTP and malformed balance responses", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));
    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, asset)
    ).rejects.toThrow(/HTTP 503/i);

    fetchMock.mockResolvedValueOnce(
      jsonResponse([tokenBalance({ balance: 9007199254740992 })])
    );
    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, asset)
    ).rejects.toThrow(/invalid token balance/i);
  });

  it("reads an XTZ balance as exact text", async () => {
    const response = {
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("9007199254740993"),
      json: jest.fn(),
    } as unknown as Response;
    jest.spyOn(global, "fetch").mockResolvedValue(response);
    const xtzAsset: Asset = {
      name: Token.XTZ,
      label: "XTZ",
      logo: "",
      address: "",
      decimals: 6,
      type: TokenType.XTZ,
    };

    await expect(
      getBalanceFromTzKT(NetworkType.MAINNET, account, xtzAsset)
    ).resolves.toEqual(new BigNumber("9007199254740993"));
  });
});
