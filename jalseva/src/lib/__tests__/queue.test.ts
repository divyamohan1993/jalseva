// =============================================================================
// Test: Write-Ahead Queue — Backpressure & Dead-Letter
// Covers: Test plan items #6 (order flow), #12 (throughput)
// =============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WriteQueue } from '../queue';

describe('WriteQueue', () => {
  let queue: WriteQueue<string>;

  beforeEach(() => {
    queue = new WriteQueue<string>({
      name: 'test-queue',
      maxSize: 10,
      flushIntervalMs: 50,
      batchSize: 3,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    queue.stop();
  });

  it('enqueues items and tracks depth', () => {
    expect(queue.enqueue('a')).toBe(true);
    expect(queue.enqueue('b')).toBe(true);
    expect(queue.depth).toBe(2);
  });

  it('applies backpressure when full', () => {
    for (let i = 0; i < 10; i++) {
      expect(queue.enqueue(`item-${i}`)).toBe(true);
    }
    // Queue is now full
    expect(queue.enqueue('overflow')).toBe(false);
    expect(queue.depth).toBe(10);
  });

  it('processes items in batches', async () => {
    const processed: string[][] = [];
    queue.onProcess(async (items) => {
      processed.push(items);
    });

    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c'); // Batch threshold (3) → triggers flush

    // Wait for flush
    await new Promise((r) => setTimeout(r, 100));

    expect(processed.length).toBeGreaterThanOrEqual(1);
    expect(processed[0]).toEqual(['a', 'b', 'c']);
    expect(queue.depth).toBe(0);
  });

  it('retries failed items up to maxRetries', async () => {
    let calls = 0;
    queue.onProcess(async () => {
      calls++;
      if (calls <= 2) throw new Error('transient');
    });

    queue.enqueue('retry-me');

    // Wait for several flush cycles
    await new Promise((r) => setTimeout(r, 300));

    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('moves permanently failed items to dead-letter queue', async () => {
    queue.onProcess(async () => {
      throw new Error('permanent failure');
    });

    queue.enqueue('doomed');

    // Wait for retries to exhaust
    await new Promise((r) => setTimeout(r, 500));

    expect(queue.deadLetterSize).toBeGreaterThan(0);
    const dead = queue.drainDeadLetter();
    expect(dead.length).toBeGreaterThan(0);
    expect(dead[0].data).toBe('doomed');
    expect(dead[0].retries).toBe(2); // maxRetries
  });

  it('tracks metrics', async () => {
    queue.onProcess(async () => {});

    queue.enqueue('x');
    queue.enqueue('y');
    queue.enqueue('z');

    await new Promise((r) => setTimeout(r, 100));

    const m = queue.metrics;
    expect(m.enqueued).toBe(3);
    expect(m.processed).toBe(3);
    expect(m.name).toBe('test-queue');
  });

  it('stop() halts auto-flushing', () => {
    queue.onProcess(async () => {});
    queue.stop();
    queue.enqueue('after-stop');
    // Item stays in buffer since auto-flush is stopped
    expect(queue.depth).toBe(1);
  });
});
