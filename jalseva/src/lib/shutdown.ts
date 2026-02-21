// =============================================================================
// JalSeva - Graceful Shutdown Handler
// =============================================================================
// At 50K RPS, abrupt shutdown = lost writes + broken connections.
// This module ensures:
//   1. In-flight requests complete
//   2. Batch writer flushes pending Firestore operations
//   3. Write coalescers flush merged updates
//   4. Queues drain pending items
//   5. Geohash index cleanup
//
// Triggered by SIGTERM (Docker stop, K8s rolling update) or SIGINT (Ctrl+C).
// =============================================================================

import { batchWriter } from '@/lib/batch-writer';
import { orderWriteQueue, trackingQueue, analyticsQueue } from '@/lib/queue';
import { trackingCoalescer, supplierCoalescer, analyticsCoalescer } from '@/lib/firestore-shard';
import { supplierIndex } from '@/lib/geohash';

const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);

let isShuttingDown = false;

/**
 * Returns whether the application is currently shutting down.
 * API routes can check this to reject new requests gracefully.
 */
export function isShutdown(): boolean {
  return isShuttingDown;
}

/**
 * Perform graceful shutdown: flush all buffers and queues.
 */
async function performShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Shutdown] ${signal} received. Flushing buffers...`);

  try {
    // 1. Flush write coalescers (merges pending updates)
    trackingCoalescer.flushAll();
    supplierCoalescer.flushAll();
    analyticsCoalescer.flushAll();
    console.log('[Shutdown] Write coalescers flushed');

    // 2. Flush batch writer (commits to Firestore)
    await batchWriter.flush();
    console.log('[Shutdown] Batch writer flushed');

    // 3. Flush write queues
    await orderWriteQueue.flush();
    await trackingQueue.flush();
    await analyticsQueue.flush();
    console.log('[Shutdown] Write queues flushed');

    // 4. Stop timers
    batchWriter.stop();
    orderWriteQueue.stop();
    trackingQueue.stop();
    analyticsQueue.stop();
    trackingCoalescer.stop();
    supplierCoalescer.stop();
    analyticsCoalescer.stop();
    supplierIndex.stop();
    console.log('[Shutdown] Timers stopped');

    console.log('[Shutdown] Graceful shutdown complete');
  } catch (error) {
    console.error('[Shutdown] Error during graceful shutdown:', error);
  }
}

/**
 * Register shutdown handlers. Call once at application startup.
 * Safe to call multiple times (idempotent).
 */
let _registered = false;
export function registerShutdownHandlers(): void {
  if (_registered) return;
  _registered = true;

  const handler = (signal: string) => {
    performShutdown(signal).finally(() => {
      // Force exit after timeout
      setTimeout(() => {
        console.warn('[Shutdown] Forced exit after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    });
  };

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}

// Auto-register on import
registerShutdownHandlers();
