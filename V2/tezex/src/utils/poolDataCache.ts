import { PoolData } from "../types/pools";

interface CacheEntry {
  data: PoolData;
  timestamp: number;
}

export class PoolDataCache {
  private static cache = new Map<string, CacheEntry>();
  private static TTL = 15000; // 15 seconds default

  /**
   * Get cached pool data if still valid
   * @param poolId - Pool identifier
   * @returns PoolData if cache is valid, null otherwise
   */
  static get(poolId: string): PoolData | null {
    const cached = this.cache.get(poolId);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;

    // Check if cache expired
    if (age > this.TTL) {
      this.cache.delete(poolId);
      return null;
    }

    return cached.data;
  }

  /**
   * Store pool data in cache
   * @param poolId - Pool identifier
   * @param data - Pool data to cache
   */
  static set(poolId: string, data: PoolData): void {
    this.cache.set(poolId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for specific pool or all pools
   * @param poolId - Optional pool identifier. If not provided, clears all cache
   */
  static clear(poolId?: string): void {
    if (poolId) {
      this.cache.delete(poolId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up expired entries
   */
  static cleanup() {
    const now = Date.now();

    this.cache.forEach((entry, poolId) => {
      const age = now - entry.timestamp;
      if (age > this.TTL) {
        this.cache.delete(poolId);
      }
    });
  }
}
