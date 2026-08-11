import { PoolData } from "../types/pools";
import { PoolDataCache } from "./poolDataCache";

describe("PoolDataCache", () => {
  const sample: PoolData = {
    tokenAPool: { toFixed: () => "1" } as PoolData["tokenAPool"],
    tokenBPool: { toFixed: () => "2" } as PoolData["tokenBPool"],
    lpTokenSupply: { toFixed: () => "3" } as PoolData["lpTokenSupply"],
    lpFeeBp: 25,
    protocolFeeBp: 5,
    totalFeeBp: 30,
    feeSource: "view",
  };

  beforeEach(() => {
    PoolDataCache.clear();
  });

  it("notifies subscribers when set updates cache", () => {
    const listener = jest.fn();
    const unsubscribe = PoolDataCache.subscribe(listener);
    const versionBefore = PoolDataCache.getVersion();

    PoolDataCache.set("pool-1", sample);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(PoolDataCache.getVersion()).toBe(versionBefore + 1);
    expect(PoolDataCache.get("pool-1")?.totalFeeBp).toBe(30);

    unsubscribe();
    PoolDataCache.set("pool-1", { ...sample, totalFeeBp: 40 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers on clear", () => {
    PoolDataCache.set("pool-1", sample);
    const listener = jest.fn();
    PoolDataCache.subscribe(listener);

    PoolDataCache.clear("pool-1");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(PoolDataCache.get("pool-1")).toBeNull();
  });
});
