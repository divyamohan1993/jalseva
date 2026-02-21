// =============================================================================
// JalSeva - Firestore Write Sharding
// =============================================================================
// Firestore has a hard limit of ~10K writes/sec per database. At 50K RPS,
// even with batch writes and queuing, we hit this ceiling.
//
// Sharding strategy:
//   1. COUNTER SHARDING: Distribute counters across N shards to avoid
//      single-document contention (e.g., totalOrders, revenue).
//   2. TIME-BASED PARTITIONING: Split writes by time bucket so each
//      partition stays under the document write rate limit.
//   3. WRITE COALESCING: Merge multiple updates to the same document
//      into a single write within a coalescing window.
//
// Combined with batch writer (500 ops/batch) and write queues, this
// reduces effective Firestore writes by 10-50x.
// =============================================================================

// ---------------------------------------------------------------------------
// Distributed Counter
// ---------------------------------------------------------------------------

/**
 * Generates a shard key for distributed counters.
 * Instead of incrementing a single document (1 write/sec limit),
 * we spread across N shards and sum at read time.
 *
 * @param baseKey - The counter name (e.g., "total_orders")
 * @param numShards - Number of shards (default 10)
 * @returns A shard-specific document path
 */
export function getCounterShardKey(baseKey: string, numShards = 10): string {
  const shardId = Math.floor(Math.random() * numShards);
  return `counters/${baseKey}/shards/shard_${shardId}`;
}

/**
 * Generates a time-partitioned collection path.
 * Splits high-write collections by date to distribute load.
 *
 * Example: "tracking_updates" -> "tracking_updates_2026_02"
 *
 * @param collection - Base collection name
 * @param date - Date to partition by (defaults to now)
 * @returns Time-partitioned collection name
 */
export function getPartitionedCollection(collection: string, date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${collection}_${year}_${month}`;
}

// ---------------------------------------------------------------------------
// Write Coalescer
// ---------------------------------------------------------------------------

interface PendingWrite {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  mergedAt: number;
  writeCount: number;
}

/**
 * Coalesces multiple writes to the same document within a time window
 * into a single write. At 50K RPS, many requests may update the same
 * supplier location or order status within milliseconds. Instead of
 * N writes, we do 1 write with the latest values.
 *
 * Reduces Firestore writes by 5-20x for hot documents.
 */
export class WriteCoalescer {
  private pending = new Map<string, PendingWrite>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly windowMs: number;
  private onFlush: ((writes: PendingWrite[]) => void) | null = null;

  // Metrics
  private totalReceived = 0;
  private totalFlushed = 0;
  private totalCoalesced = 0;

  constructor(windowMs = 200) {
    this.windowMs = windowMs;
  }

  /**
   * Register a flush handler. Called when coalesced writes are ready.
   */
  setFlushHandler(handler: (writes: PendingWrite[]) => void): void {
    this.onFlush = handler;
    this.startTimer();
  }

  /**
   * Buffer a write. If the same doc already has a pending write,
   * merge the data (last-write-wins for each field).
   */
  write(collection: string, docId: string, data: Record<string, unknown>): void {
    this.totalReceived++;
    const key = `${collection}:${docId}`;

    const existing = this.pending.get(key);
    if (existing) {
      // Merge: newer fields overwrite older ones
      Object.assign(existing.data, data);
      existing.mergedAt = Date.now();
      existing.writeCount++;
      this.totalCoalesced++;
    } else {
      this.pending.set(key, {
        collection,
        docId,
        data: { ...data },
        mergedAt: Date.now(),
        writeCount: 1,
      });
    }
  }

  /**
   * Flush all writes older than the coalescing window.
   */
  flush(): PendingWrite[] {
    const now = Date.now();
    const ready: PendingWrite[] = [];

    for (const [key, write] of this.pending) {
      if (now - write.mergedAt >= this.windowMs) {
        ready.push(write);
        this.pending.delete(key);
        this.totalFlushed++;
      }
    }

    if (ready.length > 0 && this.onFlush) {
      this.onFlush(ready);
    }

    return ready;
  }

  /** Force flush all pending writes regardless of window */
  flushAll(): PendingWrite[] {
    const all = Array.from(this.pending.values());
    this.pending.clear();
    this.totalFlushed += all.length;

    if (all.length > 0 && this.onFlush) {
      this.onFlush(all);
    }

    return all;
  }

  get metrics() {
    return {
      pending: this.pending.size,
      totalReceived: this.totalReceived,
      totalFlushed: this.totalFlushed,
      totalCoalesced: this.totalCoalesced,
      coalescingRatio: this.totalReceived > 0
        ? parseFloat((this.totalCoalesced / this.totalReceived).toFixed(3))
        : 0,
    };
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.windowMs);
    if (this.timer.unref) this.timer.unref();
  }
}

// ---------------------------------------------------------------------------
// Singleton Coalescers
// ---------------------------------------------------------------------------

/** Coalesce tracking/location updates (very hot - updated every few seconds) */
export const trackingCoalescer = new WriteCoalescer(500);  // 500ms window

/** Coalesce supplier status updates */
export const supplierCoalescer = new WriteCoalescer(1000); // 1s window

/** Coalesce analytics events */
export const analyticsCoalescer = new WriteCoalescer(2000); // 2s window
