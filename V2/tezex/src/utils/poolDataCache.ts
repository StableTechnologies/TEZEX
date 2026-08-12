import { PoolData } from "../types/pools";

interface CacheEntry {
  data: PoolData;
  timestamp: number;
}

type Listener = () => void;

export class PoolDataCache {
  private static cache = new Map<string, CacheEntry>();
  private static TTL = 15000; // 15 seconds default
  private static listeners = new Set<Listener>();
  /** Bumped on set/clear so useSyncExternalStore can detect updates. */
  private static version = 0;

  static subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Snapshot version for external-store subscriptions. */
  static getVersion(): number {
    return this.version;
  }

  private static notify(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Get cached pool data if still valid.
   * Does not mutate the cache (safe for React getSnapshot).
   */
  static get(poolId: string): PoolData | null {
    const cached = this.cache.get(poolId);

    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.TTL) {
      return null;
    }

    return cached.data;
  }

  /**
   * Store pool data in cache and notify subscribers.
   */
  static set(poolId: string, data: PoolData): void {
    this.cache.set(poolId, {
      data,
      timestamp: Date.now(),
    });
    this.notify();
  }

  /**
   * Clear cache for specific pool or all pools and notify subscribers.
   */
  static clear(poolId?: string): void {
    if (poolId) {
      this.cache.delete(poolId);
    } else {
      this.cache.clear();
    }
    this.notify();
  }

  /**
   * Clean up expired entries.
   */
  static cleanup() {
    const now = Date.now();
    let removed = false;

    this.cache.forEach((entry, poolId) => {
      const age = now - entry.timestamp;
      if (age > this.TTL) {
        this.cache.delete(poolId);
        removed = true;
      }
    });

    if (removed) {
      this.notify();
    }
  }
}
