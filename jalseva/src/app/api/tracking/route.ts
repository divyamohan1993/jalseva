// =============================================================================
// JalSeva API - Order Tracking
// =============================================================================
// POST /api/tracking       - Update supplier location for active order
// GET  /api/tracking       - Get tracking info for an order
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getETA, haversineDistance } from '@/lib/maps';
import { cacheSet, cacheGet } from '@/lib/redis';
import type { GeoLocation, TrackingInfo } from '@/types';

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

    // --- Fetch order ---
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 }
      );
    }

    const order = orderDoc.data()!;

    // Verify this is the assigned supplier
    if (order.supplierId !== supplierId) {
      return NextResponse.json(
        { error: 'Supplier is not assigned to this order.' },
        { status: 403 }
      );
    }

    // Verify order is in a trackable state
    const trackableStatuses = ['accepted', 'en_route', 'arriving'];
    if (!trackableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `Order is not in a trackable state. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // --- Calculate ETA ---
    const deliveryLocation = order.deliveryLocation as GeoLocation;
    const etaResult = await getETA(location, deliveryLocation);
    const distanceMeters = haversineDistance(location, deliveryLocation);

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

    // --- Update order with tracking data ---
    await orderRef.update({
      tracking: trackingInfo,
      supplierLocation: trackingInfo.supplierLocation,
      updatedAt: new Date().toISOString(),
    });

    // --- Cache tracking data in Redis for real-time access ---
    await cacheSet(`tracking:${orderId}`, trackingInfo, 30); // 30 second TTL

    // --- Also update supplier's current location ---
    await adminDb.collection('suppliers').doc(supplierId).update({
      currentLocation: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
      },
    });

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

    // --- Try Redis cache first for real-time data ---
    const cachedTracking = await cacheGet<TrackingInfo>(`tracking:${orderId}`);
    if (cachedTracking) {
      return NextResponse.json({
        success: true,
        tracking: cachedTracking,
        source: 'cache',
      });
    }

    // --- Fallback to Firestore ---
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
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

    return NextResponse.json({
      success: true,
      tracking: order.tracking as TrackingInfo,
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
