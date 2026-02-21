// =============================================================================
// JalSeva - Firestore Batch Writer
// =============================================================================
// Firestore has a 10K writes/sec limit per database. At 50K RPS with write-
// heavy workloads, individual writes will fail. Batch writer buffers mutations
// and flushes them in Firestore batches (max 500 operations per batch).
//
// This reduces Firestore API calls by up to 500x and prevents write throttling.
// Combined with the write-ahead queue, this ensures zero data loss.
// =============================================================================

import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';

interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: Record<string, unknown>;
  merge?: boolean;
}

class FirestoreBatchWriter {
  private buffer: BatchOperation[] = [];
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly maxBatchSize = 500; // Firestore limit
  private readonly flushIntervalMs: number;

  // Metrics
  private totalOps = 0;
  private flushedOps = 0;
  private failedFlushes = 0;

  constructor(flushIntervalMs = 100) {
    this.flushIntervalMs = flushIntervalMs;
    this.startAutoFlush();
  }

  /** Queue a SET operation */
  set(collection: string, docId: string, data: Record<string, unknown>, merge = false): void {
    this.buffer.push({ type: 'set', collection, docId, data, merge });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /** Queue an UPDATE operation */
  update(collection: string, docId: string, data: Record<string, unknown>): void {
    this.buffer.push({ type: 'update', collection, docId, data });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /** Queue a DELETE operation */
  delete(collection: string, docId: string): void {
    this.buffer.push({ type: 'delete', collection, docId });
    this.totalOps++;
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /** Current buffer size */
  get depth(): number {
    return this.buffer.length;
  }

  /** Writer metrics */
  get metrics() {
    return {
      bufferDepth: this.buffer.length,
      totalOps: this.totalOps,
      flushedOps: this.flushedOps,
      failedFlushes: this.failedFlushes,
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
        await this.executeBatch(batch);
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

  private async executeBatch(ops: BatchOperation[]): Promise<void> {
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
    } catch {
      this.failedFlushes++;
      // Re-buffer failed operations for retry (add back to front)
      this.buffer.unshift(...ops);
    }
  }

  private startAutoFlush(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }
}

// ---------------------------------------------------------------------------
// Singleton batch writer
// ---------------------------------------------------------------------------

export const batchWriter = new FirestoreBatchWriter(100);
