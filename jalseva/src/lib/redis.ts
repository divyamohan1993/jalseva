// =============================================================================
// JalSeva - Upstash Redis Client
// =============================================================================
// Provides caching, real-time supplier location tracking, and zone demand
// level management using Upstash Redis (serverless, HTTP-based).
// =============================================================================

import { Redis } from '@upstash/redis';
import type { GeoLocation, DemandLevel } from '@/types';

// ---------------------------------------------------------------------------
// Client Initialization
// ---------------------------------------------------------------------------

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazy initialization to avoid build-time errors when env vars are not set
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    if (!redisUrl || !redisToken) {
      // Return a no-op redis for build time / when credentials are missing
      console.warn('Upstash Redis credentials not configured. Caching disabled.');
      return {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        incr: async () => 1,
        expire: async () => 1,
        exists: async () => 0,
      } as any;
    }
    _redis = new Redis({ url: redisUrl, token: redisToken });
  }
  return _redis;
}

const redis = new Proxy({} as Redis, {
  get: (_target, prop) => {
    const instance = getRedis();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// ---------------------------------------------------------------------------
// Key Prefixes
// ---------------------------------------------------------------------------
// Centralized key prefixes to keep the Redis namespace organized and
// avoid collisions across different data types.
// ---------------------------------------------------------------------------

const KEYS = {
  CACHE: 'cache:',
  SUPPLIER_LOCATION: 'supplier:location:',
  DEMAND_LEVEL: 'zone:demand:',
  SUPPLIER_ONLINE: 'supplier:online:',
  RATE_LIMIT: 'rate_limit:',
} as const;

// ---------------------------------------------------------------------------
// Generic Cache Operations
// ---------------------------------------------------------------------------

/**
 * Retrieves a cached value by key.
 *
 * @param key - The cache key (will be prefixed automatically).
 * @returns The cached value or `null` if not found / expired.
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(`${KEYS.CACHE}${key}`);
    return value;
  } catch (error) {
    console.error('[Redis] cacheGet error:', error);
    return null;
  }
}

/**
 * Stores a value in the cache with an optional TTL.
 *
 * @param key   - The cache key (will be prefixed automatically).
 * @param value - The value to store (will be JSON-serialized by Upstash).
 * @param ttl   - Time-to-live in seconds. Defaults to 300 (5 minutes).
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = 300
): Promise<void> {
  try {
    await redis.set(`${KEYS.CACHE}${key}`, value, { ex: ttl });
  } catch (error) {
    console.error('[Redis] cacheSet error:', error);
  }
}

/**
 * Deletes a cached entry by key.
 *
 * @param key - The cache key (will be prefixed automatically).
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(`${KEYS.CACHE}${key}`);
  } catch (error) {
    console.error('[Redis] cacheDelete error:', error);
  }
}

// ---------------------------------------------------------------------------
// Supplier Location Tracking
// ---------------------------------------------------------------------------

/**
 * Retrieves the real-time location of a supplier.
 *
 * @param supplierId - The supplier's unique identifier.
 * @returns The supplier's current location or `null` if unavailable.
 */
export async function getSupplierLocation(
  supplierId: string
): Promise<GeoLocation | null> {
  try {
    const location = await redis.get<GeoLocation>(
      `${KEYS.SUPPLIER_LOCATION}${supplierId}`
    );
    return location;
  } catch (error) {
    console.error('[Redis] getSupplierLocation error:', error);
    return null;
  }
}

/**
 * Updates a supplier's real-time location. Entries expire after 5 minutes
 * to automatically mark stale / offline suppliers.
 *
 * @param supplierId - The supplier's unique identifier.
 * @param location   - The new geographic coordinates.
 */
export async function setSupplierLocation(
  supplierId: string,
  location: GeoLocation
): Promise<void> {
  try {
    // Store with a 5-minute TTL. If the supplier stops sending updates
    // they are implicitly considered offline.
    await redis.set(`${KEYS.SUPPLIER_LOCATION}${supplierId}`, location, {
      ex: 300,
    });
  } catch (error) {
    console.error('[Redis] setSupplierLocation error:', error);
  }
}

// ---------------------------------------------------------------------------
// Zone Demand Level Management
// ---------------------------------------------------------------------------

/**
 * Retrieves the current demand level for a zone.
 *
 * @param zoneId - The zone identifier.
 * @returns The demand level string or `null` if not set.
 */
export async function getDemandLevel(
  zoneId: string
): Promise<DemandLevel | null> {
  try {
    const level = await redis.get<DemandLevel>(
      `${KEYS.DEMAND_LEVEL}${zoneId}`
    );
    return level;
  } catch (error) {
    console.error('[Redis] getDemandLevel error:', error);
    return null;
  }
}

/**
 * Sets the demand level for a zone. Expires after 15 minutes so stale
 * demand data is automatically cleared.
 *
 * @param zoneId - The zone identifier.
 * @param level  - The demand level to set.
 */
export async function setDemandLevel(
  zoneId: string,
  level: DemandLevel
): Promise<void> {
  try {
    await redis.set(`${KEYS.DEMAND_LEVEL}${zoneId}`, level, {
      ex: 900, // 15 minutes
    });
  } catch (error) {
    console.error('[Redis] setDemandLevel error:', error);
  }
}

// ---------------------------------------------------------------------------
// Rate Limiting (retained from existing implementation)
// ---------------------------------------------------------------------------

/**
 * Checks whether a request from an identifier is within the rate limit.
 *
 * @param identifier    - A unique key for the entity (e.g. user ID, IP address).
 * @param maxRequests   - Maximum allowed requests in the window. Defaults to 60.
 * @param windowSeconds - Window duration in seconds. Defaults to 60.
 * @returns Whether the request is allowed and how many requests remain.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${KEYS.RATE_LIMIT}${identifier}`;
  const current = await redis.incr(key);

  // Always set expiry to avoid orphaned keys from race conditions.
  // If the key already has a TTL, this refreshes it only on the first
  // increment (when current === 1). For subsequent increments, we skip
  // to preserve the original window boundary.
  if (current === 1) {
    // Use pipeline-safe pattern: set expiry immediately after creation
    // to prevent keys persisting forever if the process crashes.
    try {
      await redis.expire(key, windowSeconds);
    } catch {
      // If expire fails, delete the key to prevent an unbounded counter
      await redis.del(key);
    }
  }

  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { redis };
export default redis;
