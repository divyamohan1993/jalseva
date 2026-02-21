// =============================================================================
// JalSeva - In-Process LRU Cache with TTL
// =============================================================================
// O(1) get / set / delete using Map (maintains insertion order).
// Designed for standalone Node.js (long-lived process). At 50K RPS this
// eliminates network roundtrips to Redis for hot data like pricing, demand
// levels, and supplier locations. Capacity-bounded with automatic eviction.
// =============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T = unknown> {
  private readonly map = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;

    // Periodic cleanup of expired entries every 30 seconds
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.evictExpired(), 30_000);
      // Don't block process exit
      if (timer.unref) timer.unref();
    }
  }

  /** O(1) get with LRU promotion */
  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      this.misses++;
      return undefined;
    }

    // LRU promotion: delete + re-insert moves to end
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /** O(1) set with capacity eviction */
  set(key: string, value: T, ttlSeconds = 300): void {
    // Delete first to reset position even if key exists
    this.map.delete(key);

    // Evict oldest entry if at capacity
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /** O(1) delete */
  delete(key: string): boolean {
    return this.map.delete(key);
  }

  /** O(1) existence check */
  has(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  /** Current cache size */
  get size(): number {
    return this.map.size;
  }

  /** Cache hit rate (0-1) */
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /** Flush all entries */
  clear(): void {
    this.map.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Remove expired entries (runs periodically) */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Cache Instances (module-level for process lifetime)
// ---------------------------------------------------------------------------

/** General-purpose hot data cache (pricing, config, demand levels) */
export const hotCache = new LRUCache(20_000);

/** Supplier location cache (high-frequency reads/writes) */
export const locationCache = new LRUCache<{ lat: number; lng: number }>(50_000);

/** API response cache (stale-while-revalidate pattern) */
export const responseCache = new LRUCache<string>(5_000);

// ---------------------------------------------------------------------------
// Cache-aside helper (read-through with TTL)
// ---------------------------------------------------------------------------

/**
 * Cache-aside pattern: check cache first, fetch on miss, populate cache.
 * Eliminates cold-start penalty while keeping data fresh.
 *
 * @param cache  - The LRU cache instance to use.
 * @param key    - Cache key.
 * @param fetcher - Async function to call on cache miss.
 * @param ttl    - TTL in seconds (default 60).
 * @returns The cached or freshly fetched value.
 */
export async function cacheAside<T>(
  cache: LRUCache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl = 60
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const value = await fetcher();
  cache.set(key, value, ttl);
  return value;
}
