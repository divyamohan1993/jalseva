// =============================================================================
// JalSeva API - Health Check & Metrics
// =============================================================================
// GET /api/health         - Lightweight liveness probe (for Nginx/K8s)
// GET /api/health?full=1  - Full health + metrics (for dashboards)
//
// At 50K RPS, observability is critical. This endpoint exposes:
//   - Circuit breaker states (are external services healthy?)
//   - Cache hit rates (is L1/L2 caching effective?)
//   - Queue depths (is write backpressure building?)
//   - Batch writer status (are Firestore writes keeping up?)
//   - Rate limiter client counts (memory pressure indicator)
//   - Geospatial index stats (supplier distribution)
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { firestoreBreaker, redisBreaker, mapsBreaker, geminiBreaker } from '@/lib/circuit-breaker';
import { hotCache, locationCache, responseCache } from '@/lib/cache';
import { orderWriteQueue, trackingQueue, analyticsQueue } from '@/lib/queue';
import { batchWriter } from '@/lib/batch-writer';
import { apiLimiter, globalLimiter } from '@/lib/rate-limiter';
import { supplierIndex } from '@/lib/geohash';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full') === '1';

  // Lightweight liveness probe
  if (!full) {
    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now(),
      instance: process.env.INSTANCE_ID || 'default',
      pid: process.pid,
      uptime: Math.round(process.uptime()),
    });
  }

  // Full health check with metrics
  const memUsage = process.memoryUsage();

  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    instance: process.env.INSTANCE_ID || 'default',
    pid: process.pid,
    uptime: Math.round(process.uptime()),

    // Process metrics
    process: {
      memoryMB: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      cpuUsage: process.cpuUsage(),
    },

    // Circuit breaker states
    circuitBreakers: {
      firestore: firestoreBreaker.metrics,
      redis: redisBreaker.metrics,
      maps: mapsBreaker.metrics,
      gemini: geminiBreaker.metrics,
    },

    // Cache metrics
    caches: {
      hot: { size: hotCache.size, hitRate: hotCache.hitRate },
      location: { size: locationCache.size, hitRate: locationCache.hitRate },
      response: { size: responseCache.size, hitRate: responseCache.hitRate },
    },

    // Write queue depths
    queues: {
      orders: orderWriteQueue.metrics,
      tracking: trackingQueue.metrics,
      analytics: analyticsQueue.metrics,
    },

    // Batch writer
    batchWriter: batchWriter.metrics,

    // Rate limiter
    rateLimiter: {
      apiClients: apiLimiter.clientCount,
      globalClients: globalLimiter.clientCount,
    },

    // Geospatial index
    geoIndex: {
      suppliers: supplierIndex.size,
      cells: supplierIndex.cellCount,
    },
  });
}
