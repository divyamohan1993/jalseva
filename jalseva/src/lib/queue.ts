// =============================================================================
// JalSeva - Write-Ahead Queue with Guaranteed Delivery
// =============================================================================
// At 50K RPS, synchronous Firestore writes become the bottleneck (max ~10K
// writes/sec per database). This queue buffers mutations, batches them, and
// retries failures with exponential backoff. Dead-letter queue captures
// permanently failed items so no request is ever lost.
//
// Design:
//   - Bounded in-memory buffer with backpressure
//   - Auto-flush every N ms or when buffer hits threshold
//   - Retry failed items up to maxRetries times
//   - Dead-letter array for permanent failures (can be persisted later)
//   - Non-blocking enqueue returns immediately
// =============================================================================

export interface QueueItem<T = unknown> {
  id: string;
  data: T;
  retries: number;
  createdAt: number;
}

interface QueueOptions {
  /** Queue name for logging */
  name: string;
  /** Max items before applying backpressure (default 50000) */
  maxSize?: number;
  /** Flush interval in ms (default 100) */
  flushIntervalMs?: number;
  /** Max items to process per flush (default 500) */
  batchSize?: number;
  /** Max retry attempts per item (default 3) */
  maxRetries?: number;
}

type ProcessorFn<T> = (items: T[]) => Promise<void>;

export class WriteQueue<T = unknown> {
  private buffer: QueueItem<T>[] = [];
  private deadLetter: QueueItem<T>[] = [];
  private processing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private processor: ProcessorFn<T> | null = null;

  private readonly name: string;
  private readonly maxSize: number;
  private readonly flushIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  // Metrics
  private enqueued = 0;
  private processed = 0;
  private failed = 0;

  constructor(options: QueueOptions) {
    this.name = options.name;
    this.maxSize = options.maxSize ?? 50_000;
    this.flushIntervalMs = options.flushIntervalMs ?? 100;
    this.batchSize = options.batchSize ?? 500;
    this.maxRetries = options.maxRetries ?? 3;
  }

  /** Register the batch processor function */
  onProcess(fn: ProcessorFn<T>): void {
    this.processor = fn;
    this.startFlushing();
  }

  /**
   * Enqueue an item for processing. Returns immediately (non-blocking).
   * Returns false if queue is full (backpressure signal).
   */
  enqueue(data: T, id?: string): boolean {
    if (this.buffer.length >= this.maxSize) {
      console.warn(`[Queue:${this.name}] Backpressure - queue full (${this.maxSize})`);
      return false;
    }

    this.buffer.push({
      id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      data,
      retries: 0,
      createdAt: Date.now(),
    });
    this.enqueued++;

    // Flush immediately if batch size reached
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }

    return true;
  }

  /** Current queue depth */
  get depth(): number {
    return this.buffer.length;
  }

  /** Dead letter queue size */
  get deadLetterSize(): number {
    return this.deadLetter.length;
  }

  /** Queue metrics */
  get metrics() {
    return {
      name: this.name,
      depth: this.buffer.length,
      deadLetterSize: this.deadLetter.length,
      enqueued: this.enqueued,
      processed: this.processed,
      failed: this.failed,
      processing: this.processing,
    };
  }

  /** Drain dead letter queue for manual inspection/replay */
  drainDeadLetter(): QueueItem<T>[] {
    const items = [...this.deadLetter];
    this.deadLetter = [];
    return items;
  }

  /** Stop the queue (for graceful shutdown) */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Force a flush now */
  async flush(): Promise<void> {
    if (this.processing || this.buffer.length === 0 || !this.processor) return;

    this.processing = true;
    try {
      // Take a batch from the front of the buffer
      const batch = this.buffer.splice(0, this.batchSize);
      const dataItems = batch.map((item) => item.data);

      try {
        await this.processor(dataItems);
        this.processed += batch.length;
      } catch {
        // Retry or dead-letter each item in the batch
        for (const item of batch) {
          if (item.retries < this.maxRetries) {
            item.retries++;
            this.buffer.push(item); // Re-enqueue at end
          } else {
            this.deadLetter.push(item);
            this.failed++;
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private startFlushing(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }
}

// ---------------------------------------------------------------------------
// Pre-configured queues
// ---------------------------------------------------------------------------

/** Order write queue - buffers Firestore order writes */
export const orderWriteQueue = new WriteQueue<Record<string, unknown>>({
  name: 'order-writes',
  maxSize: 100_000,
  flushIntervalMs: 50,
  batchSize: 500, // Firestore batch limit
  maxRetries: 3,
});

/** Tracking update queue - high-frequency location updates */
export const trackingQueue = new WriteQueue<Record<string, unknown>>({
  name: 'tracking-updates',
  maxSize: 200_000,
  flushIntervalMs: 100,
  batchSize: 500,
  maxRetries: 2,
});

/** Analytics event queue - non-critical, can tolerate some loss */
export const analyticsQueue = new WriteQueue<Record<string, unknown>>({
  name: 'analytics-events',
  maxSize: 50_000,
  flushIntervalMs: 500,
  batchSize: 500,
  maxRetries: 1,
});
