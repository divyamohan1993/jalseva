// =============================================================================
// JalSeva - Firestore Batch Writer (Hardened for 50K RPS)
// =============================================================================
// Firestore has a 10K writes/sec limit per database. At 50K RPS with write-
// heavy workloads, individual writes will fail. Batch writer buffers mutations
// and flushes them in Firestore batches (max 500 operations per batch).
//
// Improvements:
//   1. Max buffer size with backpressure signal (prevents OOM)
//   2. Flushing guard prevents concurrent flush races
//   3. Failed batches are re-enqueued only once (no infinite retry loop)
//   4. Metrics track buffer pressure for observability
// =============================================================================

import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';

interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: Record<string, unknown>;
  merge?: boolean;
  retried?: boolean;
}

class FirestoreBatchWriter {
  private buffer: BatchOperation[] = [];
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly maxBatchSize = 500; // Firestore limit
  private readonly maxBufferSize: number;
  private readonly flushIntervalMs: number;

  // Metrics
  private totalOps = 0;
  private flushedOps = 0;
  private failedFlushes = 0;
  private droppedOps = 0;

  constructor(flushIntervalMs = 100, maxBufferSize = 50_000) {
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize = maxBufferSize;
    this.startAutoFlush();
  }

  /** Queue a SET operation. Returns false if buffer is full (backpressure). */
  set(collection: string, docId: string, data: Record<string, unknown>, merge = false): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      this.droppedOps++;
      console.warn(`[BatchWriter] Buffer full (${this.maxBufferSize}), dropping SET ${collection}/${docId}`);
      return false;
    }
    this.buffer.push({ type: 'set', collection, docId, data, merge });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
    return true;
  }

  /** Queue an UPDATE operation. Returns false if buffer is full. */
  update(collection: string, docId: string, data: Record<string, unknown>): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      this.droppedOps++;
      console.warn(`[BatchWriter] Buffer full (${this.maxBufferSize}), dropping UPDATE ${collection}/${docId}`);
      return false;
    }
    this.buffer.push({ type: 'update', collection, docId, data });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
    return true;
  }

  /** Queue a DELETE operation. Returns false if buffer is full. */
  delete(collection: string, docId: string): boolean {
    if (this.buffer.length >= this.maxBufferSize) {
      this.droppedOps++;
      console.warn(`[BatchWriter] Buffer full (${this.maxBufferSize}), dropping DELETE ${collection}/${docId}`);
      return false;
    }
    this.buffer.push({ type: 'delete', collection, docId });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
    return true;
  }

  /** Current buffer size */
  get depth(): number {
    return this.buffer.length;
  }

  /** Writer metrics */
  get metrics() {
    return {
      bufferDepth: this.buffer.length,
      maxBufferSize: this.maxBufferSize,
      bufferPressure: this.buffer.length / this.maxBufferSize,
      totalOps: this.totalOps,
      flushedOps: this.flushedOps,
      failedFlushes: this.failedFlushes,
      droppedOps: this.droppedOps,
      flushing: this.flushing,
    };
  }

  /** Force flush all buffered operations */
  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;

    this.flushing = true;
    try {
      while (this.buffer.length > 0) {
        const batch = this.buffer.splice(0, this.maxBatchSize);
        const ok = await this.executeBatch(batch);
        if (!ok) {
          // Re-add failed ops only if they haven't been retried yet
          const retryable = batch.filter((op) => !op.retried);
          for (const op of retryable) {
            op.retried = true;
          }
          // Only re-enqueue if buffer has room (prevent OOM)
          const available = this.maxBufferSize - this.buffer.length;
          const toRequeue = retryable.slice(0, available);
          if (toRequeue.length > 0) {
            this.buffer.unshift(...toRequeue);
          }
          if (retryable.length > available) {
            this.droppedOps += retryable.length - available;
          }
          break; // Stop flushing on first failure
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  /** Stop auto-flush (for graceful shutdown) */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async executeBatch(ops: BatchOperation[]): Promise<boolean> {
    try {
      await firestoreBreaker.execute(async () => {
        const batch = adminDb.batch();

        for (const op of ops) {
          const docRef = adminDb.collection(op.collection).doc(op.docId);

          switch (op.type) {
            case 'set':
              if (op.merge) {
                batch.set(docRef, op.data!, { merge: true });
              } else {
                batch.set(docRef, op.data!);
              }
              break;
            case 'update':
              batch.update(docRef, op.data!);
              break;
            case 'delete':
              batch.delete(docRef);
              break;
          }
        }

        await batch.commit();
        this.flushedOps += ops.length;
      });
      return true;
    } catch {
      this.failedFlushes++;
      return false;
    }
  }

  private startAutoFlush(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }
}

// ---------------------------------------------------------------------------
// Singleton batch writer (50K buffer cap prevents OOM)
// ---------------------------------------------------------------------------

export const batchWriter = new FirestoreBatchWriter(100, 50_000);
