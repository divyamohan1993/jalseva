// =============================================================================
// JalSeva API - Create Payment Order (Simulated Razorpay)
// =============================================================================
// POST /api/payments/create-order
// Creates a simulated Razorpay order for an existing JalSeva order.
// Returns a simulated checkout result so the client can auto-complete payment.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createOrder as createRazorpayOrder, simulateCheckout } from '@/lib/razorpay';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';
import { hotCache } from '@/lib/cache';

// ---------------------------------------------------------------------------
// POST - Create a simulated Razorpay order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid or missing JSON body.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    const { orderId, amount, currency = 'INR' } = body as {
      orderId: string;
      amount: number;
      currency?: string;
    };

    // --- Validation ---
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number (in rupees).' },
        { status: 400 }
      );
    }

    // --- Verify order exists (L1 cache first) ---
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
      hotCache.set(orderCacheKey, order, 120);
    }

    // Prevent duplicate payment orders
    const payment = order.payment as Record<string, unknown> | undefined;
    if (payment?.razorpayOrderId) {
      return NextResponse.json(
        {
          error: 'A payment order already exists for this order.',
          razorpayOrderId: payment.razorpayOrderId,
        },
        { status: 409 }
      );
    }

    // Only allow payment for orders that are not cancelled or already paid
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot create payment for a cancelled order.' },
        { status: 400 }
      );
    }

    if (payment?.status === 'paid') {
      return NextResponse.json(
        { error: 'This order has already been paid.' },
        { status: 400 }
      );
    }

    // --- Create simulated Razorpay order ---
    const amountInPaise = Math.round(amount * 100);
    const receipt = `jalseva_${orderId}`;

    const razorpayOrder = await createRazorpayOrder(amountInPaise, currency, receipt);

    // Generate simulated checkout credentials for the client
    const checkoutResult = simulateCheckout(razorpayOrder.id);

    // --- Update JalSeva order with Razorpay order ID ---
    batchWriter.update('orders', orderId, {
      'payment.razorpayOrderId': razorpayOrder.id,
      'payment.amount': amount,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate cached order so payment verification reads fresh data
    // from Firestore instead of seeing a stale entry without razorpayOrderId
    hotCache.delete(orderCacheKey);

    return NextResponse.json({
      success: true,
      simulated: true,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
      },
      // Include checkout credentials so the client can auto-verify
      checkout: checkoutResult,
      keyId: 'rzp_sim_jalseva',
    });
  } catch (error) {
    console.error('[POST /api/payments/create-order] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating payment order.' },
      { status: 500 }
    );
  }
}
