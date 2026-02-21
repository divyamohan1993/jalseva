// =============================================================================
// JalSeva API - Subscriptions (Competitive advantage over Tankerwala)
// =============================================================================
// POST /api/subscriptions     - Create a recurring delivery subscription
// GET  /api/subscriptions     - List subscriptions for a customer
// PUT  /api/subscriptions     - Update/pause/cancel a subscription
// =============================================================================
// Inspired by: Tankerwala's bulk order/scheduling feature and DrinkPrime's
// subscription model. JalSeva adds AI-powered delivery optimization.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import type {
  WaterType,
  PaymentMethod,
  SubscriptionFrequency,
  GeoLocation,
} from '@/types';

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
// Helpers
// ---------------------------------------------------------------------------

const FREQUENCY_DAYS: Record<SubscriptionFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

function calculateNextDeliveryDate(frequency: SubscriptionFrequency): string {
  const next = new Date();
  next.setDate(next.getDate() + FREQUENCY_DAYS[frequency]);
  return next.toISOString();
}

const VALID_WATER_TYPES: WaterType[] = ['ro', 'mineral', 'tanker'];
const VALID_FREQUENCIES: SubscriptionFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly'];
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'wallet', 'cash'];

const BASE_PRICES: Record<WaterType, number> = {
  ro: 150,
  mineral: 200,
  tanker: 500,
};

// Subscription discount: 10% off per-delivery price
const SUBSCRIPTION_DISCOUNT = 0.10;

// ---------------------------------------------------------------------------
// POST - Create subscription
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
    }

    const { customerId, waterType, quantityLitres, frequency, deliveryLocation, paymentMethod } = body as {
      customerId: string;
      waterType: WaterType;
      quantityLitres: number;
      frequency: SubscriptionFrequency;
      deliveryLocation: GeoLocation;
      paymentMethod: PaymentMethod;
    };

    // Validation
    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId.' }, { status: 400 });
    }
    if (!waterType || !VALID_WATER_TYPES.includes(waterType)) {
      return NextResponse.json({ error: 'Invalid waterType.' }, { status: 400 });
    }
    if (!quantityLitres || quantityLitres < 20 || quantityLitres > 20000) {
      return NextResponse.json({ error: 'Quantity must be 20-20000 litres.' }, { status: 400 });
    }
    if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency. Use daily, weekly, biweekly, or monthly.' }, { status: 400 });
    }
    if (!deliveryLocation?.lat || !deliveryLocation?.lng) {
      return NextResponse.json({ error: 'deliveryLocation must have lat and lng.' }, { status: 400 });
    }
    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid paymentMethod.' }, { status: 400 });
    }

    // Calculate discounted price
    const basePrice = BASE_PRICES[waterType];
    const pricePerDelivery = Math.round(basePrice * (1 - SUBSCRIPTION_DISCOUNT));

    const now = new Date().toISOString();
    const nextDeliveryDate = calculateNextDeliveryDate(frequency);

    // Try Firestore
    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();
        const subRef = adminDb.collection('subscriptions').doc();
        const subscription = {
          id: subRef.id,
          customerId,
          waterType,
          quantityLitres,
          frequency,
          deliveryLocation,
          nextDeliveryDate,
          isActive: true,
          paymentMethod,
          pricePerDelivery,
          createdAt: now,
        };

        await subRef.set(subscription);

        return NextResponse.json({ success: true, subscription }, { status: 201 });
      } catch (dbError) {
        console.warn('[POST /api/subscriptions] Firestore error:', dbError);
      }
    }

    // Demo mode
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const subscription = {
      id: subscriptionId,
      customerId,
      waterType,
      quantityLitres,
      frequency,
      deliveryLocation,
      nextDeliveryDate,
      isActive: true,
      paymentMethod,
      pricePerDelivery,
      savingsPercent: SUBSCRIPTION_DISCOUNT * 100,
      createdAt: now,
      demo: true,
    };

    return NextResponse.json({ success: true, subscription }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/subscriptions] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET - List subscriptions
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required.' }, { status: 400 });
    }

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb
          .collection('subscriptions')
          .where('customerId', '==', customerId)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const subscriptions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return NextResponse.json({ success: true, subscriptions, count: subscriptions.length });
      } catch (dbError) {
        console.warn('[GET /api/subscriptions] Firestore error:', dbError);
      }
    }

    // Demo mode
    return NextResponse.json({ success: true, subscriptions: [], count: 0, demo: true });
  } catch (error) {
    console.error('[GET /api/subscriptions] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT - Update subscription (pause/cancel/update frequency)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
    }

    const { subscriptionId, action, frequency } = body as {
      subscriptionId: string;
      action: 'pause' | 'resume' | 'cancel' | 'update';
      frequency?: SubscriptionFrequency;
    };

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required.' }, { status: 400 });
    }

    const validActions = ['pause', 'resume', 'cancel', 'update'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: 'action must be pause, resume, cancel, or update.' }, { status: 400 });
    }

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();
        const subRef = adminDb.collection('subscriptions').doc(subscriptionId);
        const subDoc = await subRef.get();

        if (!subDoc.exists) {
          return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
        }

        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

        if (action === 'pause') updates.isActive = false;
        if (action === 'resume') {
          updates.isActive = true;
          updates.nextDeliveryDate = calculateNextDeliveryDate(
            (subDoc.data()?.frequency || 'weekly') as SubscriptionFrequency
          );
        }
        if (action === 'cancel') {
          updates.isActive = false;
          updates.cancelledAt = new Date().toISOString();
        }
        if (action === 'update' && frequency && VALID_FREQUENCIES.includes(frequency)) {
          updates.frequency = frequency;
          updates.nextDeliveryDate = calculateNextDeliveryDate(frequency);
        }

        await subRef.update(updates);

        return NextResponse.json({ success: true, subscriptionId, action, updates });
      } catch (dbError) {
        console.warn('[PUT /api/subscriptions] Firestore error:', dbError);
      }
    }

    // Demo mode
    return NextResponse.json({
      success: true,
      subscriptionId,
      action,
      demo: true,
      message: `Subscription ${action}d successfully.`,
    });
  } catch (error) {
    console.error('[PUT /api/subscriptions] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
