// =============================================================================
// JalSeva - Demo Simulator (no auth required, for live verification)
// =============================================================================
// POST  /api/dev/simulate/start   - Spin up a fresh demo customer + supplier +
//                                    in-flight order. Returns { orderId,
//                                    customerId, supplierId, waypoints[] } so
//                                    the client can advance the GPS along a
//                                    real Delhi route at its own pace.
// POST  /api/dev/simulate/tick    - Advance the simulated supplier one step.
//                                    Body: { orderId, supplierId, lat, lng }.
//                                    Server-side this routes through the same
//                                    coalescer that real GPS uses, so the
//                                    customer's tracking page sees the
//                                    identical real-time experience.
// POST  /api/dev/simulate/deliver - Mark the simulated order delivered.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { haversineDistance } from '@/lib/maps';
import { hotCache, locationCache } from '@/lib/cache';
import { trackingCoalescer } from '@/lib/firestore-shard';
import { supplierIndex } from '@/lib/geohash';
import { batchWriter } from '@/lib/batch-writer';
import type { GeoLocation, TrackingInfo } from '@/types';

let _coalescerWired = false;
function wireCoalescer() {
  if (_coalescerWired) return;
  _coalescerWired = true;
  trackingCoalescer.setFlushHandler((writes) => {
    for (const w of writes) batchWriter.update(w.collection, w.docId, w.data);
  });
}
wireCoalescer();

// A short, well-known Delhi route: Connaught Place → India Gate → ~Akbar Road.
// 11 waypoints, ~3.5 km total. At one step/5s ⇒ a 55-second demo.
const ROUTE: { lat: number; lng: number }[] = [
  { lat: 28.6328, lng: 77.2197 }, // Connaught Place (pickup)
  { lat: 28.6280, lng: 77.2210 },
  { lat: 28.6235, lng: 77.2218 },
  { lat: 28.6195, lng: 77.2230 },
  { lat: 28.6160, lng: 77.2245 },
  { lat: 28.6135, lng: 77.2270 },
  { lat: 28.6125, lng: 77.2295 },
  { lat: 28.6128, lng: 77.2320 },
  { lat: 28.6135, lng: 77.2345 },
  { lat: 28.6145, lng: 77.2370 },
  { lat: 28.6155, lng: 77.2400 }, // ~India Gate area (drop)
];

const DEMO_CUSTOMER_PREFIX = 'sim-customer';
const DEMO_SUPPLIER_PREFIX = 'sim-supplier';

function rid() {
  return Math.random().toString(36).slice(2, 8);
}

async function ensureUser(uid: string, role: 'customer' | 'supplier') {
  const ref = adminDb.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      id: uid,
      phone: '+91 99999 00000',
      name: role === 'customer' ? 'Demo Customer' : 'Demo Supplier',
      role,
      language: 'en',
      rating: { average: 5, count: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function ensureSupplier(uid: string) {
  const ref = adminDb.collection('suppliers').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      id: uid,
      userId: uid,
      verificationStatus: 'verified',
      isOnline: true,
      vehicle: { type: 'tanker', capacity: 5000, number: 'DL-DEMO-' + rid() },
      waterTypes: ['ro', 'mineral', 'tanker'],
      serviceArea: { center: ROUTE[0], radiusKm: 25 },
      rating: { average: 5, count: 0 },
      documents: {},
      supportsSubscription: false,
      currentLocation: ROUTE[0],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set({ isOnline: true, currentLocation: ROUTE[0] }, { merge: true });
  }
}

// -------------------------------------------------------------------
// POST /api/dev/simulate?action=start
// -------------------------------------------------------------------
async function start() {
  const customerId = `${DEMO_CUSTOMER_PREFIX}-${rid()}`;
  const supplierId = `${DEMO_SUPPLIER_PREFIX}-${rid()}`;

  await Promise.all([
    ensureUser(customerId, 'customer'),
    ensureUser(supplierId, 'supplier'),
    ensureSupplier(supplierId),
  ]);

  const orderId = `sim_${Date.now()}_${rid()}`;
  const orderRef = adminDb.collection('orders').doc(orderId);

  const distanceMeters = haversineDistance(ROUTE[0], ROUTE[ROUTE.length - 1]);

  await orderRef.set({
    id: orderId,
    customerId,
    supplierId,
    waterType: 'tanker',
    quantityLitres: 5000,
    price: {
      base: 800,
      distance: 150,
      surge: 0,
      total: 950,
      commission: 95,
      supplierEarning: 855,
    },
    status: 'accepted',
    deliveryLocation: {
      ...ROUTE[ROUTE.length - 1],
      address: 'Near India Gate, New Delhi (Demo)',
    },
    tracking: {
      supplierLocation: ROUTE[0],
      eta: Math.round(distanceMeters / 8.33),
      distance: Math.round(distanceMeters),
    },
    payment: { method: 'upi', status: 'paid', amount: 950 },
    createdAt: FieldValue.serverTimestamp(),
    acceptedAt: FieldValue.serverTimestamp(),
    isSimulated: true,
  });

  return NextResponse.json({
    success: true,
    orderId,
    customerId,
    supplierId,
    waypoints: ROUTE,
    trackingUrl: `/tracking/${orderId}`,
  });
}

// -------------------------------------------------------------------
// POST /api/dev/simulate?action=tick   body: { orderId, supplierId, lat, lng, stepIndex }
// Same write path that the real supplier GPS broadcast uses.
// -------------------------------------------------------------------
async function tick(body: {
  orderId: string;
  supplierId: string;
  lat: number;
  lng: number;
  stepIndex?: number;
}) {
  const { orderId, supplierId, lat, lng, stepIndex } = body;
  if (!orderId || !supplierId || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'orderId, supplierId, lat, lng required' }, { status: 400 });
  }

  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  const order = orderSnap.data() as { deliveryLocation: GeoLocation; status: string; supplierId?: string };
  if (order.supplierId !== supplierId) {
    return NextResponse.json({ error: 'Supplier mismatch' }, { status: 403 });
  }

  // Move through state machine on first tick (accepted → en_route)
  if (order.status === 'accepted') {
    await orderRef.set({ status: 'en_route' }, { merge: true });
  }

  const supplierLocation: GeoLocation = { lat, lng, address: '' };
  const distanceMeters = haversineDistance(supplierLocation, order.deliveryLocation);
  const tracking: TrackingInfo = {
    supplierLocation,
    eta: Math.round(distanceMeters / 8.33),
    distance: Math.round(distanceMeters),
  };

  // Same caches + coalescer the real POST /api/tracking path uses.
  hotCache.set(`tracking:${orderId}`, tracking, 30);
  locationCache.set(`supplier:${supplierId}`, { lat, lng }, 60);
  const existing = supplierIndex.get(supplierId);
  supplierIndex.upsert(supplierId, lat, lng, {
    ...existing?.data,
    isOnline: true,
    lastTrackingUpdate: Date.now(),
  });
  trackingCoalescer.write('orders', orderId, {
    tracking: tracking as unknown as Record<string, unknown>,
    supplierLocation,
    updatedAt: new Date().toISOString(),
  });
  trackingCoalescer.write('suppliers', supplierId, {
    currentLocation: supplierLocation,
  });

  return NextResponse.json({ success: true, tracking, stepIndex });
}

// -------------------------------------------------------------------
// POST /api/dev/simulate?action=deliver
// -------------------------------------------------------------------
async function deliver(body: { orderId: string }) {
  const { orderId } = body;
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  await adminDb.collection('orders').doc(orderId).set(
    { status: 'delivered', deliveredAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'start';

  try {
    if (action === 'start') return await start();
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch {}
    if (action === 'tick') return await tick(body as never);
    if (action === 'deliver') return await deliver(body as never);
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[/api/dev/simulate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
