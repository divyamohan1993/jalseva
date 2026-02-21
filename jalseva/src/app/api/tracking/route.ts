// =============================================================================
// JalSeva API - Order Tracking (Optimized for 50K RPS)
// =============================================================================
// POST /api/tracking       - Update supplier location for active order
// GET  /api/tracking       - Get tracking info for an order
//
// Optimizations:
//   1. L1 cache checked before Redis (eliminates network hop)
//   2. Write coalescing merges rapid location updates into single writes
//   3. Geohash index updated for O(1) spatial queries
//   4. Batch writer buffers Firestore writes
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getETA, haversineDistance } from '@/lib/maps';
import { cacheSet, cacheGet } from '@/lib/redis';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { locationCache, hotCache } from '@/lib/cache';
import { batchWriter } from '@/lib/batch-writer';
import { trackingCoalescer } from '@/lib/firestore-shard';
import { supplierIndex } from '@/lib/geohash';
import type { GeoLocation, TrackingInfo } from '@/types';

// Wire up coalescer -> batch writer on first import
let _coalescerWired = false;
function wireCoalescer() {
  if (_coalescerWired) return;
  _coalescerWired = true;
  trackingCoalescer.setFlushHandler((writes) => {
    for (const write of writes) {
      batchWriter.update(write.collection, write.docId, write.data);
    }
  });
}
wireCoalescer();

// ---------------------------------------------------------------------------
// POST - Update supplier location for an active order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, supplierId, location } = body as {
      orderId: string;
      supplierId: string;
      location: GeoLocation;
    };

    // --- Validation ---
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Missing required field: supplierId' },
        { status: 400 }
      );
    }

    if (
      !location ||
      typeof location.lat !== 'number' ||
      typeof location.lng !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Location must have valid lat and lng.' },
        { status: 400 }
      );
    }

    // --- Check L1 cache for order data first ---
    const orderCacheKey = `order:${orderId}`;
    let order = hotCache.get(orderCacheKey) as Record<string, unknown> | undefined;

    if (!order) {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await firestoreBreaker.execute(
        () => orderRef.get(),
        () => null
      );

      if (!orderDoc || !orderDoc.exists) {
        return NextResponse.json(
          { error: 'Order not found.' },
          { status: 404 }
        );
      }

      order = orderDoc.data()!;
      hotCache.set(orderCacheKey, order, 60);
    }

    // Verify this is the assigned supplier
    if (order.supplierId !== supplierId) {
      return NextResponse.json(
        { error: 'Supplier is not assigned to this order.' },
        { status: 403 }
      );
    }

    // Verify order is in a trackable state
    const trackableStatuses = ['accepted', 'en_route', 'arriving'];
    if (!trackableStatuses.includes(order.status as string)) {
      return NextResponse.json(
        { error: `Order is not in a trackable state. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // --- Calculate ETA (use cached or Haversine, async Maps update) ---
    const deliveryLocation = order.deliveryLocation as GeoLocation;
    const distanceMeters = haversineDistance(location, deliveryLocation);

    // Check L1 cache for recent ETA (avoids synchronous Maps API call)
    const etaCacheKey = `eta:${orderId}`;
    const cachedEta = hotCache.get(etaCacheKey) as { eta: number; distance: number; polyline?: string } | undefined;

    // Use Haversine-based ETA immediately (sub-microsecond), update with Maps API asynchronously
    let etaResult: { eta: number; distance: number; polyline?: string };
    if (cachedEta) {
      etaResult = cachedEta;
    } else {
      // Fast Haversine fallback: ~30 km/h city speed
      etaResult = {
        eta: Math.round(distanceMeters / 8.33),
        distance: Math.round(distanceMeters),
      };
    }

    // Fire-and-forget: fetch accurate Maps API ETA and cache it (non-blocking)
    getETA(location, deliveryLocation)
      .then((mapsResult) => {
        hotCache.set(etaCacheKey, mapsResult, 60);
      })
      .catch(() => {});

    // --- Build tracking info ---
    const trackingInfo: TrackingInfo = {
      supplierLocation: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
      },
      eta: etaResult.eta,
      distance: Math.round(distanceMeters),
      polyline: etaResult.polyline,
    };

    // --- Update caches (instant, no network for L1) ---
    locationCache.set(`supplier:${supplierId}`, { lat: location.lat, lng: location.lng }, 60);
    hotCache.set(`tracking:${orderId}`, trackingInfo, 30);

    // --- Update geohash spatial index ---
    supplierIndex.upsert(supplierId, location.lat, location.lng, {
      isOnline: true,
      lastTrackingUpdate: Date.now(),
    });

    // --- Coalesce Firestore writes (many updates -> 1 write) ---
    trackingCoalescer.write('orders', orderId, {
      tracking: trackingInfo as unknown as Record<string, unknown>,
      supplierLocation: trackingInfo.supplierLocation,
      updatedAt: new Date().toISOString(),
    });

    trackingCoalescer.write('suppliers', supplierId, {
      currentLocation: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
      },
    });

    // --- Cache in Redis (L2) - fire-and-forget for latency ---
    cacheSet(`tracking:${orderId}`, trackingInfo, 30).catch(() => {});

    return NextResponse.json({
      success: true,
      tracking: trackingInfo,
    });
  } catch (error) {
    console.error('[POST /api/tracking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating tracking.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET - Get tracking info for an order
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: orderId' },
        { status: 400 }
      );
    }

    // --- L1 cache first (sub-microsecond, no network) ---
    const l1Cached = hotCache.get(`tracking:${orderId}`) as TrackingInfo | undefined;
    if (l1Cached) {
      return NextResponse.json({
        success: true,
        tracking: l1Cached,
        source: 'l1-cache',
      });
    }

    // --- L2: Redis cache ---
    const cachedTracking = await cacheGet<TrackingInfo>(`tracking:${orderId}`);
    if (cachedTracking) {
      hotCache.set(`tracking:${orderId}`, cachedTracking, 30);
      return NextResponse.json({
        success: true,
        tracking: cachedTracking,
        source: 'redis-cache',
      });
    }

    // --- L3: Firestore ---
    const orderDoc = await firestoreBreaker.execute(
      () => adminDb.collection('orders').doc(orderId).get(),
      () => null
    );

    if (!orderDoc || !orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    const order = orderDoc.data()!;

    if (!order.tracking) {
      return NextResponse.json(
        { error: 'No tracking information available for this order.' },
        { status: 404 }
      );
    }

    const tracking = order.tracking as TrackingInfo;
    hotCache.set(`tracking:${orderId}`, tracking, 30);
    cacheSet(`tracking:${orderId}`, tracking, 30).catch(() => {});

    return NextResponse.json({
      success: true,
      tracking,
      source: 'firestore',
    });
  } catch (error) {
    console.error('[GET /api/tracking] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching tracking info.' },
      { status: 500 }
    );
  }
}
