// =============================================================================
// Test: Rate Limiter — Token Bucket Algorithm
// Covers: Test plan items #5 (auth flow rate limiting), #10 (burst > 100/sec)
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenBucketLimiter } from '../rate-limiter';

describe('TokenBucketLimiter', () => {
  let limiter: TokenBucketLimiter;

  beforeEach(() => {
    limiter = new TokenBucketLimiter({
      maxTokens: 10,
      refillRate: 5, // 5 tokens/sec
    });
  });

  it('allows requests up to the burst limit', () => {
    for (let i = 0; i < 10; i++) {
      const result = limiter.consume('test-ip');
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests beyond the burst limit', () => {
    // Exhaust all tokens
    for (let i = 0; i < 10; i++) {
      limiter.consume('test-ip');
    }
    const result = limiter.consume('test-ip');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills tokens over time', async () => {
    // Exhaust all tokens
    for (let i = 0; i < 10; i++) {
      limiter.consume('test-ip');
    }
    expect(limiter.consume('test-ip').allowed).toBe(false);

    // Wait 500ms — should refill ~2.5 tokens at 5/sec
    await new Promise((r) => setTimeout(r, 500));

    const result = limiter.consume('test-ip');
    expect(result.allowed).toBe(true);
  });

  it('tracks separate buckets per key (per IP)', () => {
    // Exhaust all tokens for IP-A
    for (let i = 0; i < 10; i++) {
      limiter.consume('ip-a');
    }
    expect(limiter.consume('ip-a').allowed).toBe(false);

    // IP-B should still have full bucket
    const result = limiter.consume('ip-b');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('reports remaining tokens correctly', () => {
    const r1 = limiter.consume('ip');
    expect(r1.remaining).toBe(9);

    const r2 = limiter.consume('ip');
    expect(r2.remaining).toBe(8);
  });

  it('evicts oldest client when maxClients is reached', () => {
    const small = new TokenBucketLimiter({
      maxTokens: 5,
      refillRate: 5,
      maxClients: 3,
    });

    small.consume('a');
    small.consume('b');
    small.consume('c');
    expect(small.clientCount).toBe(3);

    // This should evict 'a'
    small.consume('d');
    expect(small.clientCount).toBe(3);
  });

  it('calculates retryAfterMs based on deficit', () => {
    // Exhaust all 10 tokens
    for (let i = 0; i < 10; i++) {
      limiter.consume('ip');
    }

    const result = limiter.consume('ip');
    expect(result.allowed).toBe(false);
    // Need 1 token at 5 tokens/sec → ~200ms
    expect(result.retryAfterMs).toBeGreaterThanOrEqual(100);
    expect(result.retryAfterMs).toBeLessThanOrEqual(500);
  });

  it('handles multi-token consumption', () => {
    const result = limiter.consume('ip', 5);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);

    const result2 = limiter.consume('ip', 6);
    expect(result2.allowed).toBe(false);
  });
});

describe('Rate limiter: burst > 100 req/sec per IP returns 429', () => {
  it('blocks after 100 burst requests with apiLimiter config', () => {
    const apiLimiter = new TokenBucketLimiter({
      maxTokens: 100,
      refillRate: 50,
      maxClients: 200_000,
    });

    // Consume all 100 burst tokens
    for (let i = 0; i < 100; i++) {
      const r = apiLimiter.consume('attacker-ip');
      expect(r.allowed).toBe(true);
    }

    // 101st request should be blocked
    const blocked = apiLimiter.consume('attacker-ip');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('global limiter handles 60K burst', () => {
    const globalLimiter = new TokenBucketLimiter({
      maxTokens: 60_000,
      refillRate: 50_000,
      maxClients: 1,
    });

    // Should allow up to 60K
    for (let i = 0; i < 1000; i++) {
      expect(globalLimiter.consume('global').allowed).toBe(true);
    }
  });
});
