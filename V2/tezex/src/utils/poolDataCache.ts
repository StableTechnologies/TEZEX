import { PoolConfig, PoolData } from "../types/pools";

interface CacheEntry {
  data: PoolData;
  timestamp: number;
  source?: object;
  configuration?: string;
}

interface PendingRead {
  source: object;
  configuration: string;
  promise: Promise<PoolData>;
}

type Listener = () => void;

export class PoolDataCache {
  private static cache = new Map<string, CacheEntry>();
  private static pending = new Map<string, PendingRead>();
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

  /** A quote may only reuse data from this toolkit and exact pool configuration. */
  static getFor(pool: PoolConfig, source: object): PoolData | null {
    const entry = this.cache.get(pool.id);
    return entry?.source === source &&
      entry.configuration === JSON.stringify(pool)
      ? this.get(pool.id)
      : null;
  }

  static load<T extends PoolData>(
    pool: PoolConfig,
    source: object,
    read: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const configuration = JSON.stringify(pool);
    if (!forceRefresh) {
      const cached = this.getFor(pool, source);
      if (cached) return Promise.resolve(cached as T);
      const pending = this.pending.get(pool.id);
      if (pending?.source === source && pending.configuration === configuration)
        return pending.promise as Promise<T>;
    }
    // A forced refresh supersedes previews, including a preview still in flight.
    this.cache.delete(pool.id);
    const request = {
      source,
      configuration,
      promise: Promise.resolve().then(read),
    };
    request.promise = request.promise
      .then((data) => {
        // Clearing or replacing a request revokes its right to repopulate cache.
        if (this.pending.get(pool.id) === request) {
          this.cache.set(pool.id, {
            data,
            timestamp: Date.now(),
            source,
            configuration,
          });
          this.notify();
        }
        return data;
      })
      .finally(() => {
        if (this.pending.get(pool.id) === request) this.pending.delete(pool.id);
      });
    this.pending.set(pool.id, request);
    return request.promise;
  }

  /**
   * Store pool data in cache and notify subscribers.
   */
  static set(poolId: string, data: PoolData): void {
    this.pending.delete(poolId);
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
      this.pending.delete(poolId);
      this.cache.delete(poolId);
    } else {
      this.pending.clear();
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
