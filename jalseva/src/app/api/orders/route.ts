// =============================================================================
// JalSeva API - Orders
// =============================================================================
// POST /api/orders        - Create a new water tanker order
// GET  /api/orders        - Fetch orders by customerId or supplierId
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { haversineDistance } from '@/lib/maps';
import type {
  WaterType,
  PaymentMethod,
  GeoLocation,
  OrderPrice,
  Order,
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

    // --- Verify customer exists ---
    const customerDoc = await adminDb.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: 'Customer not found.' },
        { status: 404 }
      );
    }

    // --- Fetch zone pricing if available ---
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

    // --- Find nearby available suppliers ---
    const suppliersSnapshot = await adminDb
      .collection('suppliers')
      .where('isOnline', '==', true)
      .where('waterTypes', 'array-contains', waterType)
      .where('verificationStatus', '==', 'verified')
      .get();

    const nearbySuppliers: Array<{ id: string; distance: number }> = [];

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

    // Sort by distance
    nearbySuppliers.sort((a, b) => a.distance - b.distance);

    // Use average distance for pricing (or default 5km if no suppliers found)
    const avgDistanceKm =
      nearbySuppliers.length > 0
        ? nearbySuppliers[0].distance
        : 5;

    // --- Calculate price ---
    const price = calculateOrderPrice(
      waterType,
      quantityLitres,
      avgDistanceKm,
      surgeMultiplier,
      basePrices,
      perKmRate
    );

    // --- Create order document ---
    const orderRef = adminDb.collection('orders').doc();
    const orderId = orderRef.id;
    const now = new Date().toISOString();

    const order: Order & { nearbySupplierIds: string[] } = {
      id: orderId,
      customerId,
      waterType,
      quantityLitres,
      price,
      status: 'searching',
      deliveryLocation,
      payment: {
        method: paymentMethod,
        status: 'pending',
        amount: price.total,
      },
      nearbySupplierIds: nearbySuppliers.map((s) => s.id),
      createdAt: now as unknown as Date,
    };

    await orderRef.set(order);

    return NextResponse.json(
      {
        success: true,
        order,
        nearbySupplierCount: nearbySuppliers.length,
      },
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

    // Simple offset-based pagination
    if (page > 1) {
      const skipCount = (page - 1) * limit;
      const skipSnapshot = await adminDb
        .collection('orders')
        .where(customerId ? 'customerId' : 'supplierId', '==', customerId || supplierId)
        .orderBy('createdAt', 'desc')
        .limit(skipCount)
        .get();

      if (!skipSnapshot.empty) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
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
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching orders.' },
      { status: 500 }
    );
  }
}
