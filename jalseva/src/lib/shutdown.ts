// =============================================================================
// JalSeva - Graceful Shutdown Handler
// =============================================================================
// At 50K RPS, abrupt shutdown = lost writes + broken connections.
// This module ensures:
//   1. In-flight requests complete
//   2. Write coalescers flush merged updates → batch writer buffer
//   3. Batch writer flushes pending Firestore operations
//   4. Queues drain pending items (in parallel)
//   5. Geohash index cleanup
//
// Triggered by SIGTERM (Docker stop, K8s rolling update) or SIGINT (Ctrl+C).
//
// The force-exit timeout starts immediately when the signal arrives, NOT after
// performShutdown completes. This prevents a hung flush from blocking exit.
// =============================================================================

import { batchWriter } from '@/lib/batch-writer';
import { orderWriteQueue, trackingQueue, analyticsQueue } from '@/lib/queue';
import { trackingCoalescer, supplierCoalescer, analyticsCoalescer } from '@/lib/firestore-shard';
import { supplierIndex } from '@/lib/geohash';

// 30s allows enough time for large batch writer buffers to drain at 50K RPS.
// Docker's default stop timeout is 10s; override with `stop_grace_period: 35s`
// in docker-compose to give the app enough time.
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);

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

  console.log(`[Shutdown] ${signal} received. Flushing buffers (timeout: ${SHUTDOWN_TIMEOUT_MS}ms)...`);

  try {
    // 1. Flush write coalescers first (they dump into batch writer buffer).
    //    These are synchronous so no need for Promise.all.
    trackingCoalescer.flushAll();
    supplierCoalescer.flushAll();
    analyticsCoalescer.flushAll();
    console.log('[Shutdown] Write coalescers flushed');

    // 2. Flush batch writer (commits coalesced + buffered ops to Firestore)
    await batchWriter.flush();
    console.log('[Shutdown] Batch writer flushed');

    // 3. Flush write queues in parallel (independent of each other)
    await Promise.all([
      orderWriteQueue.flush(),
      trackingQueue.flush(),
      analyticsQueue.flush(),
    ]);
    console.log('[Shutdown] Write queues flushed');

    // 4. Stop all timers to allow the event loop to drain
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
    // Start the force-exit timer IMMEDIATELY, not after performShutdown.
    // This guarantees exit even if a flush hangs.
    const forceTimer = setTimeout(() => {
      console.warn('[Shutdown] Forced exit after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    performShutdown(signal).finally(() => {
      clearTimeout(forceTimer);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}

// Auto-register on import
registerShutdownHandlers();
