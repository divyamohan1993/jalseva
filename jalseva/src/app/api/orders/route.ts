// =============================================================================
// JalSeva API - Orders
// =============================================================================
// POST /api/orders        - Create a new water tanker order
// GET  /api/orders        - Fetch orders by customerId or supplierId
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { haversineDistance } from '@/lib/maps';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';
import { supplierIndex } from '@/lib/geohash';
import type {
  WaterType,
  PaymentMethod,
  GeoLocation,
  OrderPrice,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_PRICES: Record<WaterType, number> = {
  ro: 150,
  mineral: 200,
  tanker: 500,
};

const DEFAULT_PER_KM_RATE = 15;
const DEFAULT_SURGE_MULTIPLIER = 1.0;
const DEFAULT_COMMISSION_PERCENT = 15;
const DEFAULT_SEARCH_RADIUS_KM = 10;

// ---------------------------------------------------------------------------
// Firebase Admin - lazy import with fallback
// ---------------------------------------------------------------------------

function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

async function getAdminDb() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb;
}

// ---------------------------------------------------------------------------
// Pricing Calculation
// ---------------------------------------------------------------------------

function calculateOrderPrice(
  waterType: WaterType,
  quantityLitres: number,
  distanceKm: number,
  surgeMultiplier: number = DEFAULT_SURGE_MULTIPLIER,
  basePrices: Record<WaterType, number> = DEFAULT_BASE_PRICES,
  perKmRate: number = DEFAULT_PER_KM_RATE,
  commissionPercent: number = DEFAULT_COMMISSION_PERCENT
): OrderPrice {
  const base = basePrices[waterType];
  const distanceCharge = distanceKm * perKmRate * (quantityLitres / 20);
  const subtotal = (base + distanceCharge) * surgeMultiplier;
  const total = Math.round(subtotal);
  const commission = Math.round(total * (commissionPercent / 100));
  const supplierEarning = total - commission;

  return {
    base,
    distance: Math.round(distanceCharge),
    surge: Math.round(subtotal - base - distanceCharge),
    total,
    commission,
    supplierEarning,
  };
}

// ---------------------------------------------------------------------------
// POST - Create a new order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { waterType, quantityLitres, deliveryLocation, paymentMethod, customerId } = body as {
      waterType: WaterType;
      quantityLitres: number;
      deliveryLocation: GeoLocation;
      paymentMethod: PaymentMethod;
      customerId: string;
    };

    // --- Validation ---
    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing required field: customerId' },
        { status: 400 }
      );
    }

    const validWaterTypes: WaterType[] = ['ro', 'mineral', 'tanker'];
    if (!waterType || !validWaterTypes.includes(waterType)) {
      return NextResponse.json(
        { error: 'Invalid waterType. Must be ro, mineral, or tanker.' },
        { status: 400 }
      );
    }

    if (!quantityLitres || quantityLitres < 20 || quantityLitres > 20000) {
      return NextResponse.json(
        { error: 'Quantity must be between 20 and 20000 litres.' },
        { status: 400 }
      );
    }

    if (
      !deliveryLocation ||
      typeof deliveryLocation.lat !== 'number' ||
      typeof deliveryLocation.lng !== 'number'
    ) {
      return NextResponse.json(
        { error: 'deliveryLocation must have valid lat and lng.' },
        { status: 400 }
      );
    }

    const validPaymentMethods: PaymentMethod[] = ['upi', 'card', 'wallet', 'cash'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid paymentMethod. Must be upi, card, wallet, or cash.' },
        { status: 400 }
      );
    }

    // --- Calculate price with defaults ---
    const price = calculateOrderPrice(
      waterType,
      quantityLitres,
      5, // default 5km distance
    );

    // --- Try Firestore, fall back to demo mode ---
    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();

        // Verify customer exists
        const customerDoc = await adminDb.collection('users').doc(customerId).get();
        if (!customerDoc.exists) {
          return NextResponse.json(
            { error: 'Customer not found.' },
            { status: 404 }
          );
        }

        // Fetch zone pricing if available
        let surgeMultiplier = DEFAULT_SURGE_MULTIPLIER;
        let basePrices = DEFAULT_BASE_PRICES;
        let perKmRate = DEFAULT_PER_KM_RATE;

        const zonesSnapshot = await adminDb.collection('pricing_zones').limit(1).get();
        if (!zonesSnapshot.empty) {
          const zone = zonesSnapshot.docs[0].data();
          if (zone.surgeMultiplier) surgeMultiplier = zone.surgeMultiplier;
          if (zone.basePrice) basePrices = zone.basePrice as Record<WaterType, number>;
          if (zone.perKmRate) perKmRate = zone.perKmRate;
        }

        // Find nearby available suppliers (geohash index first, Firestore fallback)
        const nearbySuppliers: Array<{ id: string; distance: number }> = [];

        if (supplierIndex.size > 0) {
          // O(k) geohash lookup instead of O(n) Firestore scan
          const candidates = supplierIndex.findNearby(
            deliveryLocation.lat, deliveryLocation.lng, DEFAULT_SEARCH_RADIUS_KM,
            (data) => {
              if (!data.isOnline || data.verificationStatus !== 'verified') return false;
              if (Array.isArray(data.waterTypes)) return data.waterTypes.includes(waterType);
              return true;
            }
          );
          for (const c of candidates) {
            const distanceMeters = haversineDistance(deliveryLocation, { lat: c.lat, lng: c.lng });
            const distanceKm = distanceMeters / 1000;
            if (distanceKm <= DEFAULT_SEARCH_RADIUS_KM) {
              nearbySuppliers.push({ id: c.id, distance: distanceKm });
            }
          }
        }

        // Fallback: Firestore scan when index is empty or has no nearby matches
        if (nearbySuppliers.length === 0) {
          // Fallback: Firestore scan (cold start) - capped to prevent unbounded reads
          const suppliersSnapshot = await adminDb
            .collection('suppliers')
            .where('isOnline', '==', true)
            .where('waterTypes', 'array-contains', waterType)
            .where('verificationStatus', '==', 'verified')
            .limit(500)
            .get();

          suppliersSnapshot.forEach((doc) => {
            const supplier = doc.data();
            if (supplier.currentLocation) {
              const distanceMeters = haversineDistance(
                deliveryLocation,
                supplier.currentLocation as GeoLocation
              );
              const distanceKm = distanceMeters / 1000;
              if (distanceKm <= DEFAULT_SEARCH_RADIUS_KM) {
                nearbySuppliers.push({ id: doc.id, distance: distanceKm });
              }
            }
          });
        }

        nearbySuppliers.sort((a, b) => a.distance - b.distance);

        const avgDistanceKm = nearbySuppliers.length > 0 ? nearbySuppliers[0].distance : 5;

        const zonedPrice = calculateOrderPrice(
          waterType,
          quantityLitres,
          avgDistanceKm,
          surgeMultiplier,
          basePrices,
          perKmRate
        );

        // Create order document
        const orderRef = adminDb.collection('orders').doc();
        const orderId = orderRef.id;
        const now = new Date().toISOString();

        const order = {
          id: orderId,
          customerId,
          waterType,
          quantityLitres,
          price: zonedPrice,
          status: 'searching' as const,
          deliveryLocation,
          payment: {
            method: paymentMethod,
            status: 'pending' as const,
            amount: zonedPrice.total,
          },
          nearbySupplierIds: nearbySuppliers.map((s) => s.id),
          createdAt: now,
        };

        batchWriter.set('orders', orderId, order as unknown as Record<string, unknown>);

        return NextResponse.json(
          { success: true, order, nearbySupplierCount: nearbySuppliers.length },
          { status: 201 }
        );
      } catch (dbError) {
        console.warn('[POST /api/orders] Firestore error, using demo mode:', dbError);
        // Fall through to demo mode
      }
    }

    // --- Demo mode: create order without Firestore ---
    const orderId = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const order = {
      id: orderId,
      customerId,
      waterType,
      quantityLitres,
      price,
      status: 'searching' as const,
      deliveryLocation,
      payment: {
        method: paymentMethod,
        status: 'pending' as const,
        amount: price.total,
      },
      createdAt: now,
    };

    return NextResponse.json(
      { success: true, order, nearbySupplierCount: 0, demo: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/orders] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating order.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET - Fetch orders by customerId or supplierId
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!customerId && !supplierId) {
      return NextResponse.json(
        { error: 'Must provide either customerId or supplierId query parameter.' },
        { status: 400 }
      );
    }

    // Try Firestore, fall back to empty results for demo mode
    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();

        let query = adminDb.collection('orders') as FirebaseFirestore.Query;

        if (customerId) {
          query = query.where('customerId', '==', customerId);
        } else if (supplierId) {
          query = query.where('supplierId', '==', supplierId);
        }

        if (status) {
          query = query.where('status', '==', status);
        }

        query = query.orderBy('createdAt', 'desc').limit(limit);

        if (page > 1) {
          const skipCount = (page - 1) * limit;
          const skipSnapshot = await firestoreBreaker.execute(
            () => adminDb
              .collection('orders')
              .where(customerId ? 'customerId' : 'supplierId', '==', customerId || supplierId)
              .orderBy('createdAt', 'desc')
              .limit(skipCount)
              .get(),
            () => ({ empty: true, docs: [] } as unknown as FirebaseFirestore.QuerySnapshot)
          );

          if (!skipSnapshot.empty) {
            const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
            query = query.startAfter(lastDoc);
          }
        }

        const snapshot = await firestoreBreaker.execute(
          () => query.get(),
          () => ({ docs: [] } as unknown as FirebaseFirestore.QuerySnapshot)
        );
        const orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return NextResponse.json({
          success: true,
          orders,
          count: orders.length,
          page,
          limit,
        });
      } catch (dbError) {
        console.warn('[GET /api/orders] Firestore error, returning empty:', dbError);
        // Fall through to demo response
      }
    }

    // Demo mode: return empty orders (client-side store has the data)
    return NextResponse.json({
      success: true,
      orders: [],
      count: 0,
      page,
      limit,
      demo: true,
    });
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching orders.' },
      { status: 500 }
    );
  }
}
