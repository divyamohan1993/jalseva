// =============================================================================
// JalSeva API - Verify Razorpay Payment
// =============================================================================
// POST /api/payments/verify
// Verifies the Razorpay payment signature using HMAC SHA256, then updates
// the order payment status in Firestore.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyPayment } from '@/lib/razorpay';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';

// ---------------------------------------------------------------------------
// POST - Verify Razorpay payment signature
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId: string;
    };

    // --- Validation ---
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
        },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    // --- Verify signature ---
    const isValid = verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      // Log the failed verification attempt
      console.warn(
        `[Payment Verification] Invalid signature for order ${orderId}. ` +
          `Razorpay Order: ${razorpay_order_id}, Payment: ${razorpay_payment_id}`
      );

      // Update order with failed payment status
      batchWriter.update('orders', orderId, {
        'payment.status': 'failed',
        'payment.razorpayPaymentId': razorpay_payment_id,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed. Invalid signature.',
        },
        { status: 400 }
      );
    }

    // --- Verify order exists ---
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

    const order = orderDoc.data()!;

    // Verify the Razorpay order ID matches
    if (order.payment?.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Razorpay order ID does not match the JalSeva order.' },
        { status: 400 }
      );
    }

    // --- Update order payment status ---
    const now = new Date().toISOString();

    batchWriter.update('orders', orderId, {
      'payment.status': 'paid',
      'payment.razorpayPaymentId': razorpay_payment_id,
      'payment.transactionId': razorpay_payment_id,
      'payment.paidAt': now,
      updatedAt: now,
    });

    // --- Record payment in payments collection for auditing ---
    const paymentDocId = `pay_${orderId}_${Date.now()}`;
    batchWriter.set('payments', paymentDocId, {
      orderId,
      customerId: order.customerId,
      supplierId: order.supplierId || null,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: order.payment?.amount || 0,
      currency: 'INR',
      status: 'paid',
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully.',
      payment: {
        orderId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
      },
    });
  } catch (error) {
    console.error('[POST /api/payments/verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while verifying payment.' },
      { status: 500 }
    );
  }
}
