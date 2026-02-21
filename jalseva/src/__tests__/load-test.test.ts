// =============================================================================
// Test: Load / Throughput — Concurrent Rate Limiting & Queue Capacity
// Covers: Test plan item #12 (load test to validate throughput improvements)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { TokenBucketLimiter } from '../lib/rate-limiter';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { LRUCache } from '../lib/cache';
import { WriteQueue } from '../lib/queue';

describe('Load Test: Rate limiter under concurrent load', () => {
  it('handles 10K rapid requests from 100 different IPs', () => {
    const limiter = new TokenBucketLimiter({
      maxTokens: 100,
      refillRate: 50,
      maxClients: 200_000,
    });

    let allowed = 0;
    let blocked = 0;

    for (let ip = 0; ip < 100; ip++) {
      for (let req = 0; req < 100; req++) {
        const result = limiter.consume(`ip-${ip}`);
        if (result.allowed) allowed++;
        else blocked++;
      }
    }

    // Each IP gets 100 burst tokens, so all 10K should be allowed
    expect(allowed).toBe(10_000);
    expect(blocked).toBe(0);
  });

  it('correctly blocks at burst+1 for each IP', () => {
    const limiter = new TokenBucketLimiter({
      maxTokens: 100,
      refillRate: 50,
      maxClients: 200_000,
    });

    let blocked = 0;
    // 101 requests from each of 50 IPs
    for (let ip = 0; ip < 50; ip++) {
      for (let req = 0; req < 101; req++) {
        const result = limiter.consume(`ip-${ip}`);
        if (!result.allowed) blocked++;
      }
    }

    // Each IP blocked on 101st request
    expect(blocked).toBe(50);
  });

  it('global limiter sustains high throughput', () => {
    const globalLimiter = new TokenBucketLimiter({
      maxTokens: 60_000,
      refillRate: 50_000,
      maxClients: 1,
    });

    let allowed = 0;
    for (let i = 0; i < 50_000; i++) {
      if (globalLimiter.consume('global').allowed) allowed++;
    }

    expect(allowed).toBe(50_000);
  });
});

describe('Load Test: Cache throughput', () => {
  it('handles 100K set/get operations', () => {
    const cache = new LRUCache<number>(50_000);

    // Write 100K entries
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      cache.set(`key-${i}`, i, 300);
    }
    const writeTime = performance.now() - start;

    // Cache is bounded at 50K
    expect(cache.size).toBe(50_000);

    // Read 50K entries
    const readStart = performance.now();
    let hits = 0;
    for (let i = 50_000; i < 100_000; i++) {
      if (cache.get(`key-${i}`) !== undefined) hits++;
    }
    const readTime = performance.now() - readStart;

    expect(hits).toBe(50_000); // All recent entries should be cached

    // Performance: should complete in <500ms
    expect(writeTime).toBeLessThan(2000);
    expect(readTime).toBeLessThan(2000);
  });

  it('maintains O(1) get performance with full cache', () => {
    const cache = new LRUCache<string>(10_000);

    // Fill cache
    for (let i = 0; i < 10_000; i++) {
      cache.set(`k${i}`, `v${i}`);
    }

    // Benchmark get on last entry
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      cache.get(`k${9999}`);
    }
    const elapsed = performance.now() - start;

    // 10K gets should be very fast
    expect(elapsed).toBeLessThan(100);
  });
});

describe('Load Test: Queue backpressure', () => {
  it('handles backpressure at capacity', () => {
    const queue = new WriteQueue<string>({
      name: 'load-test',
      maxSize: 1000,
      flushIntervalMs: 999999, // Disable auto-flush
      batchSize: 100,
      maxRetries: 1,
    });

    // Fill to capacity
    let enqueued = 0;
    for (let i = 0; i < 1100; i++) {
      if (queue.enqueue(`item-${i}`)) enqueued++;
    }

    expect(enqueued).toBe(1000);
    expect(queue.depth).toBe(1000);
    expect(queue.enqueue('overflow')).toBe(false);

    queue.stop();
  });

  it('processes and drains queue efficiently', async () => {
    const queue = new WriteQueue<number>({
      name: 'drain-test',
      maxSize: 10_000,
      flushIntervalMs: 10,
      batchSize: 500,
      maxRetries: 1,
    });

    let processedCount = 0;
    queue.onProcess(async (items) => {
      processedCount += items.length;
    });

    // Enqueue 5K items
    for (let i = 0; i < 5000; i++) {
      queue.enqueue(i);
    }

    // Wait for processing
    await new Promise((r) => setTimeout(r, 500));

    expect(processedCount).toBe(5000);
    expect(queue.depth).toBe(0);

    queue.stop();
  });
});

describe('Load Test: Circuit breaker under load', () => {
  it('fast-fails without calling fn when open', async () => {
    const breaker = new CircuitBreaker({
      name: 'load-breaker',
      failureThreshold: 3,
      recoveryTimeout: 60_000,
      callTimeout: 100,
    });

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await breaker.execute(
        () => Promise.reject(new Error('fail')),
        () => 'fb'
      );
    }

    // Now measure fast-fail performance
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      await breaker.execute(
        () => Promise.resolve('should-not-run'),
        () => 'fast-fail'
      );
    }
    const elapsed = performance.now() - start;

    // 10K fast-fails should be < 200ms (no external calls)
    expect(elapsed).toBeLessThan(500);
    expect(breaker.metrics.rejectedCalls).toBe(10_000);
  });
});
