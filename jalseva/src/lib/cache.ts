// =============================================================================
// JalSeva - In-Process LRU Cache with TTL
// =============================================================================
// O(1) get / set / delete using Map (maintains insertion order).
// Designed for standalone Node.js (long-lived process). At 50K RPS this
// eliminates network roundtrips to Redis for hot data like pricing, demand
// levels, and supplier locations. Capacity-bounded with automatic eviction.
// =============================================================================

// CODE INSIGHT: This cache avoids the classic LRU doubly-linked-list approach
// entirely. Instead it exploits the ES2015 Map spec guarantee that entries
// iterate in insertion order. A "promotion" is just delete + re-insert —
// moving the entry to the tail in O(1) without pointer manipulation.
// This is simpler, faster (no node allocation), and GC-friendly.

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

    // Periodic cleanup of expired entries every 30 seconds.
    //
    // CODE INSIGHT: timer.unref() is subtle but critical. By default, an
    // active setInterval keeps the Node.js event loop alive — meaning the
    // process can never exit cleanly while this cache exists. unref() tells
    // Node "don't count this timer when deciding whether to shut down."
    // Without it, a graceful shutdown would hang until the timer is cleared.
    //
    // The typeof guard handles edge-imported contexts (e.g., Cloudflare
    // Workers) where setInterval may not exist.
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.evictExpired(), 30_000);
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

    // CODE INSIGHT: This is the LRU trick. Map.keys() iterates in insertion
    // order, so the "oldest" entry is always first. By deleting and
    // re-inserting on every access, frequently-used keys migrate to the tail
    // and cold keys drift toward the head — where they'll be evicted first.
    // Traditional LRU caches use a doubly-linked list + hash map (two data
    // structures); here a single Map does both jobs.
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /** O(1) set with capacity eviction */
  set(key: string, value: T, ttlSeconds = 300): void {
    // Delete first to reset position even if key exists
    this.map.delete(key);

    // CODE INSIGHT: Map.keys().next() yields the first-inserted key — the
    // least-recently-used entry — in O(1). This is the eviction counterpart
    // to the promotion trick above. No scan required, no min-heap, no
    // separate eviction queue. The Map *is* the priority queue.
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

  /**
   * Remove expired entries (runs periodically).
   *
   * CODE INSIGHT: This uses a two-phase collect-then-delete pattern. You
   * might wonder why not just delete inside the for-of loop? Mutating a Map
   * during iteration is actually safe per the ES2015 spec (deleted keys are
   * skipped, new keys may or may not appear). However, the two-phase
   * approach is used here for clarity and to avoid subtle bugs if the
   * iteration behavior ever changes or if additional logic is added later.
   * It also makes the deletion count easily observable for metrics.
   */
  private evictExpired(): void {
    const now = Date.now();
    const expired: string[] = [];
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        expired.push(key);
      }
    }
    for (const key of expired) {
      this.map.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Cache Instances (module-level for process lifetime)
// ---------------------------------------------------------------------------
//
// CODE INSIGHT: These are module-level singletons, meaning they survive
// across all requests for the lifetime of the Node.js process. This is what
// makes in-process caching work on long-lived servers — unlike serverless
// functions where each invocation may get a cold instance, here the cache
// stays warm and accumulates hits over time. The trade-off: each worker
// process gets its own independent cache (no cross-process sharing), so
// with N cluster workers you use N x cache memory. See server.cluster.js
// for how this interacts with multi-core deployment.

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
// CODE INSIGHT: This is a textbook cache-aside (lazy-loading) pattern, but
// note what it does NOT do: it doesn't deduplicate concurrent fetches for
// the same key. If 100 requests hit a cold key simultaneously, all 100
// will call fetcher() before any result is cached — the classic "thundering
// herd" or "cache stampede" problem. For this codebase that's acceptable
// because the circuit breaker (circuit-breaker.ts) rate-limits downstream
// calls, and the fetcher functions are idempotent reads. A more aggressive
// fix would be a "single-flight" wrapper that coalesces concurrent fetches
// into one Promise, but that adds complexity for marginal benefit here.
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
