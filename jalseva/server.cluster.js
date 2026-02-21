// =============================================================================
// JalSeva - Cluster Mode Server
// =============================================================================
// Forks one Next.js worker per CPU core. On a typical 4-8 core VM this gives
// 4-8x throughput vs a single process. Combined with Nginx load balancing
// across multiple containers, this is the path to 50K RPS.
//
// Usage:
//   NODE_ENV=production node server.cluster.js
//
// Design:
//   - Primary process manages workers, does no HTTP serving
//   - Workers run the Next.js standalone server
//   - Workers auto-restart on crash (with backoff to prevent thrashing)
//   - Graceful shutdown on SIGTERM/SIGINT (zero-downtime deploys)
//   - Each worker gets its own event loop, V8 heap, and connection pool
// =============================================================================

const cluster = require('node:cluster');
const os = require('node:os');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_WORKERS = parseInt(process.env.CLUSTER_WORKERS || '0', 10) || os.cpus().length;
const RESTART_DELAY_MS = 1000;
const MAX_RESTART_DELAY_MS = 30000;
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);

// ---------------------------------------------------------------------------
// Primary Process
// ---------------------------------------------------------------------------

if (cluster.isPrimary) {
  const workerRestartCounts = new Map();
  let shuttingDown = false;

  console.log(`[Cluster] Primary ${process.pid} starting ${MAX_WORKERS} workers`);
  console.log(`[Cluster] CPUs: ${os.cpus().length}, Memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);

  // Fork workers
  for (let i = 0; i < MAX_WORKERS; i++) {
    forkWorker(i);
  }

  function forkWorker(index) {
    // All workers share the same PORT. Node.js cluster module distributes
    // incoming connections across workers via round-robin (default on Linux).
    // Previously each worker got PORT+index, meaning only worker 0 received
    // traffic since Docker only exposes the base port.
    const worker = cluster.fork({
      WORKER_INDEX: index.toString(),
    });
    worker._index = index;
    console.log(`[Cluster] Worker ${worker.process.pid} started (index: ${index})`);
  }

  // Handle worker exit with exponential backoff
  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;

    const index = worker._index ?? 0;
    const restartCount = (workerRestartCounts.get(index) || 0) + 1;
    workerRestartCounts.set(index, restartCount);

    const delay = Math.min(RESTART_DELAY_MS * Math.pow(2, restartCount - 1), MAX_RESTART_DELAY_MS);

    console.warn(
      `[Cluster] Worker ${worker.process.pid} exited (code: ${code}, signal: ${signal}). ` +
      `Restarting in ${delay}ms (attempt ${restartCount})`
    );

    setTimeout(() => {
      if (!shuttingDown) forkWorker(index);
    }, delay);

    // Reset restart count after 60s of stability
    setTimeout(() => {
      if (workerRestartCounts.get(index) === restartCount) {
        workerRestartCounts.set(index, 0);
      }
    }, 60000);
  });

  // Graceful shutdown
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Cluster] ${signal} received. Graceful shutdown...`);

    // Send SIGTERM to all workers
    for (const id in cluster.workers) {
      const w = cluster.workers[id];
      if (w) w.process.kill('SIGTERM');
    }

    // Force exit after timeout
    setTimeout(() => {
      console.warn('[Cluster] Forced exit after timeout');
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

} else {
  // ---------------------------------------------------------------------------
  // Worker Process - runs Next.js server
  // ---------------------------------------------------------------------------

  // Set hostname for Next.js standalone server
  process.env.HOSTNAME = '0.0.0.0';

  // The standalone output places server.js in the root
  require('./server.js');

  console.log(`[Worker ${process.pid}] Listening on port ${process.env.PORT}`);

  // Graceful shutdown for worker
  let isShuttingDown = false;

  process.on('SIGTERM', () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Worker ${process.pid}] SIGTERM - draining connections...`);

    // Give in-flight requests time to complete
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  });
}
