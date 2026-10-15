import BigNumber from "bignumber.js";
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

const pool = {
  id: "shared-pool",
  address: "contract-a",
} as import("../types/pools").PoolConfig;
const data = {
  tokenAPool: new BigNumber(1),
  tokenBPool: new BigNumber(2),
  lpTokenSupply: new BigNumber(3),
} as PoolData;
const deferred = () => {
  let resolve!: (value: PoolData) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<PoolData>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};
describe("scoped shared pool reads", () => {
  beforeEach(() => {
    PoolDataCache.clear();
  });
  afterEach(() => jest.restoreAllMocks());
  test("shares pending reads and then reuses the result", async () => {
    const source = {},
      wait = deferred(),
      read = jest.fn(() => wait.promise);
    const first = PoolDataCache.load(pool, source, read),
      second = PoolDataCache.load(pool, source, read);
    await Promise.resolve();
    expect(read).toHaveBeenCalledTimes(1);
    wait.resolve(data);
    expect(await first).toBe(await second);
    await expect(PoolDataCache.load(pool, source, read)).resolves.toBe(data);
    expect(read).toHaveBeenCalledTimes(1);
  });
  test("expires after 15 seconds without extending the freshness window", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1000),
      source = {},
      read = jest.fn().mockResolvedValue(data);
    await PoolDataCache.load(pool, source, read);
    now.mockReturnValue(16001);
    expect(PoolDataCache.getFor(pool, source)).toBeNull();
    await PoolDataCache.load(pool, source, read);
    expect(read).toHaveBeenCalledTimes(2);
  });
  test("separates matching pool IDs on different networks and contracts", async () => {
    const a = {},
      b = {},
      read = jest.fn().mockResolvedValue(data);
    await PoolDataCache.load(pool, a, read);
    expect(PoolDataCache.getFor(pool, b)).toBeNull();
    await PoolDataCache.load(pool, b, read);
    const changed = { ...pool, address: "contract-b" };
    expect(PoolDataCache.getFor(changed, b)).toBeNull();
    await PoolDataCache.load(changed, b, read);
    expect(read).toHaveBeenCalledTimes(3);
  });
  test.each(["pool", "all"])(
    "a %s clear prevents an old response from restoring cache",
    async (kind) => {
      const source = {},
        wait = deferred();
      const stale = PoolDataCache.load(pool, source, () => wait.promise);
      PoolDataCache.clear(kind === "pool" ? pool.id : undefined);
      wait.resolve(data);
      await stale;
      expect(PoolDataCache.get(pool.id)).toBeNull();
    }
  );
  test("a previous network's late result cannot overwrite the new network", async () => {
    const oldSource = {},
      newSource = {},
      wait = deferred();
    const stale = PoolDataCache.load(pool, oldSource, () => wait.promise);
    const newer = { ...data, totalFeeBp: 40 };
    await PoolDataCache.load(pool, newSource, async () => newer);
    wait.resolve(data);
    await stale;
    expect(PoolDataCache.getFor(pool, newSource)).toBe(newer);
    expect(PoolDataCache.getFor(pool, oldSource)).toBeNull();
  });
  test("forced reads bypass cached and in-flight previews and win out of order", async () => {
    const source = {},
      wait = deferred(),
      fresh = { ...data, totalFeeBp: 45 };
    const preview = PoolDataCache.load(pool, source, () => wait.promise);
    const read = jest.fn().mockResolvedValue(fresh);
    await PoolDataCache.load(pool, source, read, true);
    wait.resolve(data);
    await preview;
    expect(PoolDataCache.getFor(pool, source)).toBe(fresh);
    await PoolDataCache.load(pool, source, read, true);
    expect(read).toHaveBeenCalledTimes(2);
  });
  test("failures do not poison retries or silently fall back to stale data", async () => {
    const source = {},
      read = jest
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(data);
    await expect(PoolDataCache.load(pool, source, read)).rejects.toThrow(
      "offline"
    );
    await expect(PoolDataCache.load(pool, source, read)).resolves.toBe(data);
    await expect(
      PoolDataCache.load(
        pool,
        source,
        async () => {
          throw Error("offline");
        },
        true
      )
    ).rejects.toThrow("offline");
    expect(PoolDataCache.getFor(pool, source)).toBeNull();
  });
});
