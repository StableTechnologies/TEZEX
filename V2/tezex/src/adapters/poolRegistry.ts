import {
  IPoolAdapter,
  PoolConfig,
  PoolType,
  StablePoolConfig,
  isSupportedPoolConfiguration,
  supportsDirectSwap,
} from "../types/pools";
import { Asset, Token } from "../types/general";
import { SiriusAdapter } from "./sirius";
import { TezexAdapter } from "./tezex";
import { StableSwapAdapter } from "./tezexStable";

export class PoolRegistry {
  private static adapters: Map<string, IPoolAdapter> = new Map();
  private static assets: Asset[] = [];

  static registerPool(config: PoolConfig): void {
    if (!isSupportedPoolConfiguration(config)) {
      throw new Error(`Unsupported pool configuration: ${config.id}`);
    }
    const adapter = this.createAdapter(config);
    this.adapters.set(config.id, adapter);
  }

  static getAdapter(poolId: string): IPoolAdapter {
    const adapter = this.adapters.get(poolId);
    if (!adapter) {
      throw new Error(`Pool adapter not found for id: ${poolId}`);
    }
    return adapter;
  }

  static getAsset(token: Token): Asset {
    const asset = this.assets.find((a) => a.name === token);
    if (!asset) {
      throw new Error(`Asset not found: ${token}`);
    }
    return asset;
  }

  static getAssetByName(name: string): Asset {
    const asset = this.assets.find((a) => a.name === name);
    if (!asset) {
      throw new Error(`Asset not found: ${name}`);
    }
    return asset;
  }

  static getAssetAddress(token: Token): string {
    return this.getAsset(token).address;
  }

  static getAllPools(): PoolConfig[] {
    return Array.from(this.adapters.values()).map(
      (adapter) => adapter.poolConfig
    );
  }

  static getPoolsByTokenPair(tokenA: Token, tokenB: Token): PoolConfig[] {
    return this.getAllPools().filter((pool) =>
      supportsDirectSwap(pool, tokenA, tokenB)
    );
  }

  static getPoolById(poolId: string): PoolConfig | undefined {
    const adapter = this.adapters.get(poolId);
    return adapter?.poolConfig;
  }

  private static createAdapter(config: PoolConfig): IPoolAdapter {
    switch (config.type) {
      case PoolType.SIRIUS:
        return new SiriusAdapter(config);
      case PoolType.TEZEX:
        return new TezexAdapter(config);
      case PoolType.STABLE:
        return new StableSwapAdapter(config as StablePoolConfig);
      default:
        throw new Error(`Unknown pool type: ${config.type}`);
    }
  }

  static initializeFromConfig(pools: PoolConfig[], assets: Asset[]): void {
    this.assets = assets;
    pools.forEach((pool) => this.registerPool(pool));
  }

  static clear(): void {
    this.adapters.clear();
    this.assets = [];
  }
}
