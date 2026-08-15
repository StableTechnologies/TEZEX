import { NetworkInfo } from "../../contexts/network";
import {
  loadStezSnapshot,
  quoteStezDeposit,
  quoteStezRedeem,
  USHUAIA_PROTOCOL,
} from "./rpc";

const network: NetworkInfo = {
  tezosServer: "https://rpc.example",
  rpcFallbacks: [],
  chainId: "NetXTest",
  pools: [],
  assets: [],
};

const response = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );

describe("sTEZ RPC adapter", () => {
  afterEach(() => jest.restoreAllMocks());

  it("reports protocol feature-disabled responses without inventing a contract", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/chain_id")) return response("NetXTest");
      if (url.endsWith("/head/hash")) return response("BLockHash");
      if (url.endsWith("/protocols")) {
        return response({ protocol: USHUAIA_PROTOCOL });
      }
      if (url.endsWith("/header")) {
        return response({ level: 123, timestamp: "2026-07-30T12:00:00Z" });
      }
      if (url.endsWith("/stez/contract_hash")) {
        return response(
          [
            {
              kind: "permanent",
              id: "proto.025-PsUshuai.plugin.non_activated_feature",
              feature: "stez",
            },
          ],
          500
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const snapshot = await loadStezSnapshot(network);

    expect(snapshot.availability).toBe("disabled");
    expect(snapshot.contractHash).toBeNull();
    expect(snapshot.blockHash).toBe("BLockHash");
    expect(snapshot.blockLevel).toBe(BigInt(123));
  });

  it("reads global and account values from the same resolved block", async () => {
    const urls: string[] = [];
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("/chain_id")) return response("NetXTest");
      if (url.endsWith("/head/hash")) return response("BFixedHash");
      if (url.endsWith("/protocols")) {
        return response({ protocol: USHUAIA_PROTOCOL });
      }
      if (url.endsWith("/header")) {
        return response({ level: 456, timestamp: "2026-07-30T12:00:00Z" });
      }
      if (url.endsWith("/stez/contract_hash")) return response("KT1Native");
      if (url.endsWith("/contracts/KT1Native/entrypoints")) {
        return response({
          entrypoints: {
            deposit: { prim: "unit" },
            redeem: { prim: "nat" },
            finalize_redeem: { prim: "key_hash" },
          },
        });
      }
      if (url.endsWith("/stez/total_supply")) return response("1000000000");
      if (url.endsWith("/stez/total_amount_of_tez")) {
        return response("1040000000");
      }
      if (url.endsWith("/stez/exchange_rate")) {
        return response({ numerator: "1040000000", denominator: "1000000000" });
      }
      if (url.endsWith("/balance")) return response("9000000");
      if (url.endsWith("/staked_balance")) return response("1500000");
      if (url.endsWith("/stez_balance")) return response("2000000");
      if (url.endsWith("/stez_redeemed_frozen_balance")) {
        return response("300000");
      }
      if (url.endsWith("/stez_redeemed_finalizable_balance")) {
        return response("100000");
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const snapshot = await loadStezSnapshot(network, "tz1Wallet");

    expect(snapshot.availability).toBe("available");
    expect(snapshot.contractHash).toBe("KT1Native");
    expect(snapshot.walletStakedMutez).toBe(BigInt(1_500_000));
    expect(snapshot.walletStezUnits).toBe(BigInt(2_000_000));
    expect(snapshot.redeemedFinalizableMutez).toBe(BigInt(100_000));
    expect(
      urls
        .filter((url) => url.includes("/blocks/") && !url.includes("/head/"))
        .every((url) => url.includes("/blocks/BFixedHash/"))
    ).toBe(true);
  });

  it("rejects a detected contract when its transaction interface changes", async () => {
    jest.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/chain_id")) return response("NetXTest");
      if (url.endsWith("/head/hash")) return response("BFixedHash");
      if (url.endsWith("/protocols")) {
        return response({ protocol: "ProtoAlpha" });
      }
      if (url.endsWith("/header")) {
        return response({ level: 456, timestamp: "2026-08-10T12:00:00Z" });
      }
      if (url.endsWith("/stez/contract_hash")) return response("KT1Native");
      if (url.endsWith("/contracts/KT1Native/entrypoints")) {
        return response({ entrypoints: { deposit: { prim: "unit" } } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const snapshot = await loadStezSnapshot(network);

    expect(snapshot.availability).toBe("unsupported");
    expect(snapshot.contractHash).toBeNull();
  });

  it("quotes deposit and redemption using integer floor math", () => {
    expect(
      quoteStezDeposit(BigInt(10_000_000), BigInt(1_040_000), BigInt(1_000_000))
    ).toBe(BigInt(9_615_384));
    expect(
      quoteStezRedeem(BigInt(2_000_000), BigInt(1_040_000), BigInt(1_000_000))
    ).toBe(BigInt(2_080_000));
  });
});
