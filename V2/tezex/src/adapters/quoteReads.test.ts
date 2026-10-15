import BigNumber from "bignumber.js";
import { TezosToolkit } from "@taquito/taquito";
import { Asset } from "../types/general";
import { PoolConfig, PoolType } from "../types/pools";
import mainnet from "../config/network/mainnet.json";
import shadownet from "../config/network/shadownet.json";
import previewnet from "../config/network/previewnet.json";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";

const networks = { mainnet, shadownet, previewnet };
const cases = Object.entries(networks).flatMap(([network, config]) =>
  config.pools.map((pool) => ({
    name: `${network}/${pool.id}`,
    config,
    pool: pool as PoolConfig,
  }))
);

describe("live storage behind shared quote reads", () => {
  beforeEach(() => {
    PoolDataCache.clear();
    PoolRegistry.clear();
  });

  test.each(cases)(
    "$name shares previews but refreshes reserves and fees",
    async ({ config, pool }) => {
      PoolRegistry.initializeFromConfig(
        config.pools as PoolConfig[],
        config.assets as Asset[]
      );
      const adapter = PoolRegistry.getAdapter(pool.id);
      let reserve = 1000000;
      let fee = 30;
      const executeView = jest.fn(async () => fee);
      const getStablePool = jest.fn(async () => ({
        tokens_info: new Map(
          ["0", "1"].map((key) => [
            key,
            {
              rate_f: "1000000000000000000",
              precision_multiplier_f: "1000000000000000000",
              reserves: reserve,
            },
          ])
        ),
        total_supply: 1000000,
        initial_A_time: 0,
        future_A_time: 0,
        initial_A_f: 10000,
        future_A_f: 10000,
        fee: { lp_f: fee, stakers_f: 0, ref_f: 0 },
      }));
      const storage = jest.fn(async () => ({
        xtzPool: reserve,
        tokenPool: reserve,
        lqtTotal: 1000000,
        reserve_a: reserve,
        reserve_b: reserve,
        lqt_total: 1000000,
        tokenAddress: PoolRegistry.getAssetAddress(pool.tokenB),
        lqtAddress: PoolRegistry.getAssetAddress(pool.lpToken),
        storage: { pools: { get: getStablePool }, dev_store: { dev_fee_f: 0 } },
      }));
      const at = jest.fn(async () => ({
        storage,
        contractViews: { get_fee_bp: () => ({ executeView }) },
      }));
      const toolkit = { contract: { at } } as unknown as TezosToolkit;

      const [first, shared] = await Promise.all([
        adapter.getPoolData(toolkit),
        adapter.getPoolData(toolkit),
      ]);
      expect(first).toBe(shared);
      expect(first.tokenAPool.toFixed()).toBe("1000000");
      expect(at).toHaveBeenCalledTimes(1);
      expect(storage).toHaveBeenCalledTimes(1);

      reserve = 2000000;
      fee = 40;
      expect(await adapter.getPoolData(toolkit)).toBe(first);
      const fresh = await adapter.getPoolData(toolkit, true);
      expect(fresh.tokenAPool.toFixed()).toBe("2000000");
      expect(fresh.tokenBPool.toFixed()).toBe("2000000");
      expect(at).toHaveBeenCalledTimes(1);
      expect(storage).toHaveBeenCalledTimes(2);
      if (pool.type === PoolType.TEZEX) {
        expect(executeView).toHaveBeenCalledTimes(2);
        expect(fresh.totalFeeBp).toBe(40);
      }
      if (pool.type === PoolType.STABLE) {
        expect(getStablePool).toHaveBeenCalledTimes(2);
        expect(fresh).toHaveProperty("fee.lp_f", new BigNumber(40));
        expect(await adapter.getPoolData(toolkit)).toBe(fresh);
      }
    }
  );
});
