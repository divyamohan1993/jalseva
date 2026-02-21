// =============================================================================
// JalSeva - In-Memory Token Bucket Rate Limiter
// =============================================================================
// For 50K RPS, rate limiting MUST be in-memory (not Redis). A Redis roundtrip
// per request at this scale would add 1-5ms latency × 50K = impossible.
// Token bucket allows bursts while enforcing sustained rate limits.
//
// Design:
//   - Per-IP rate limiting with configurable burst/rate
//   - O(1) check and consume operations
//   - Automatic cleanup of stale buckets to prevent memory leaks
//   - Global rate limit for system-wide protection
// =============================================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterOptions {
  /** Max tokens (burst capacity) */
  maxTokens: number;
  /** Tokens added per second (sustained rate) */
  refillRate: number;
  /** Max tracked clients before cleanup (default 100000) */
  maxClients?: number;
}

export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly maxClients: number;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.maxClients = options.maxClients ?? 100_000;

    // Cleanup stale buckets every 60 seconds
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.cleanup(), 60_000);
      if (timer.unref) timer.unref();
    }
  }

  /**
   * Check if a request is allowed and consume a token.
   * Returns { allowed, remaining, retryAfterMs }.
   */
  consume(key: string, tokens = 1): {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
  } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      // New client: create bucket if under capacity
      if (this.buckets.size >= this.maxClients) {
        this.evictOldest();
      }
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.maxTokens,
      bucket.tokens + elapsed * this.refillRate
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
      };
    }

    // Not enough tokens - calculate when they'll be available
    const deficit = tokens - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  /** Number of tracked clients */
  get clientCount(): number {
    return this.buckets.size;
  }

  private evictOldest(): void {
    const oldestKey = this.buckets.keys().next().value;
    if (oldestKey !== undefined) {
      this.buckets.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 120_000; // 2 minutes of inactivity

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > staleThreshold) {
        this.buckets.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limiters
// ---------------------------------------------------------------------------

/** API rate limiter: 100 requests/sec burst, 50/sec sustained per IP */
export const apiLimiter = new TokenBucketLimiter({
  maxTokens: 100,
  refillRate: 50,
  maxClients: 200_000,
});

/** Write rate limiter: 20 writes/sec burst, 10/sec sustained per IP */
export const writeLimiter = new TokenBucketLimiter({
  maxTokens: 20,
  refillRate: 10,
  maxClients: 200_000,
});

/** Global rate limiter: 60K total requests/sec for the entire system */
export const globalLimiter = new TokenBucketLimiter({
  maxTokens: 60_000,
  refillRate: 50_000,
  maxClients: 1,
});
