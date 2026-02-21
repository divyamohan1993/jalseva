// =============================================================================
// Test: LRU Cache with TTL
// Covers: Test plan items #6, #7 (caching in order/supplier flows)
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache, cacheAside } from '../cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(5);
  });

  it('stores and retrieves values', () => {
    cache.set('k1', 'v1');
    expect(cache.get('k1')).toBe('v1');
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('respects TTL expiration', async () => {
    cache.set('temp', 'value', 0.1); // 100ms TTL
    expect(cache.get('temp')).toBe('value');

    await new Promise((r) => setTimeout(r, 150));
    expect(cache.get('temp')).toBeUndefined();
  });

  it('evicts oldest entry when at capacity', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    cache.set('d', '4');
    cache.set('e', '5');
    expect(cache.size).toBe(5);

    // Adding 6th should evict 'a' (oldest)
    cache.set('f', '6');
    expect(cache.size).toBe(5);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('f')).toBe('6');
  });

  it('promotes accessed items (LRU behavior)', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    cache.set('d', '4');
    cache.set('e', '5');

    // Access 'a' to promote it
    cache.get('a');

    // Fill to evict — 'b' should be evicted (oldest unused)
    cache.set('f', '6');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('1'); // Still present (was promoted)
  });

  it('has() respects TTL', async () => {
    cache.set('x', 'y', 0.1);
    expect(cache.has('x')).toBe(true);

    await new Promise((r) => setTimeout(r, 150));
    expect(cache.has('x')).toBe(false);
  });

  it('delete() removes entries', () => {
    cache.set('k', 'v');
    expect(cache.delete('k')).toBe(true);
    expect(cache.get('k')).toBeUndefined();
  });

  it('clear() resets everything', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.hitRate).toBe(0);
  });

  it('tracks hit rate', () => {
    cache.set('a', '1');
    cache.get('a'); // hit
    cache.get('b'); // miss
    expect(cache.hitRate).toBe(0.5);
  });
});

describe('cacheAside', () => {
  it('returns cached value on hit', async () => {
    const cache = new LRUCache<number>(100);
    cache.set('key', 42);

    const fetcher = vi.fn().mockResolvedValue(99);
    const result = await cacheAside(cache, 'key', fetcher);

    expect(result).toBe(42);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('calls fetcher on miss and populates cache', async () => {
    const cache = new LRUCache<number>(100);
    const fetcher = vi.fn().mockResolvedValue(99);

    const result = await cacheAside(cache, 'key', fetcher);
    expect(result).toBe(99);
    expect(fetcher).toHaveBeenCalledOnce();

    // Second call should hit cache
    const result2 = await cacheAside(cache, 'key', fetcher);
    expect(result2).toBe(99);
    expect(fetcher).toHaveBeenCalledOnce(); // still 1
  });
});
