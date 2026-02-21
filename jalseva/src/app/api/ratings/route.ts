// =============================================================================
// JalSeva API - Ratings
// =============================================================================
// POST /api/ratings - Submit a rating for a completed order
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';

// ---------------------------------------------------------------------------
// POST - Submit a rating for an order
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      ratedBy, // 'customer' or 'supplier'
      raterId, // userId of the person giving the rating
      rating,
      feedback,
    } = body as {
      orderId: string;
      ratedBy: 'customer' | 'supplier';
      raterId: string;
      rating: number;
      feedback?: string;
    };

    // --- Validation ---
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required field: orderId' },
        { status: 400 }
      );
    }

    if (!ratedBy || !['customer', 'supplier'].includes(ratedBy)) {
      return NextResponse.json(
        { error: 'ratedBy must be "customer" or "supplier".' },
        { status: 400 }
      );
    }

    if (!raterId) {
      return NextResponse.json(
        { error: 'Missing required field: raterId' },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5.' },
        { status: 400 }
      );
    }

    // --- Fetch order ---
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

    // Only allow ratings for delivered orders
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Ratings can only be submitted for delivered orders.' },
        { status: 400 }
      );
    }

    // Verify the rater is part of this order
    if (ratedBy === 'customer' && order.customerId !== raterId) {
      return NextResponse.json(
        { error: 'You are not the customer for this order.' },
        { status: 403 }
      );
    }

    if (ratedBy === 'supplier' && order.supplierId !== raterId) {
      return NextResponse.json(
        { error: 'You are not the supplier for this order.' },
        { status: 403 }
      );
    }

    // Check if already rated by this party
    const existingRating = order.rating || {};
    if (ratedBy === 'customer' && existingRating.customerRating) {
      return NextResponse.json(
        { error: 'Customer has already rated this order.' },
        { status: 409 }
      );
    }
    if (ratedBy === 'supplier' && existingRating.supplierRating) {
      return NextResponse.json(
        { error: 'Supplier has already rated this order.' },
        { status: 409 }
      );
    }

    // --- Update order with rating ---
    const ratingUpdate: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (ratedBy === 'customer') {
      ratingUpdate['rating.customerRating'] = rating;
      if (feedback) ratingUpdate['rating.customerFeedback'] = feedback;
    } else {
      ratingUpdate['rating.supplierRating'] = rating;
      if (feedback) ratingUpdate['rating.supplierFeedback'] = feedback;
    }

    batchWriter.update('orders', orderId, ratingUpdate);

    // --- Recalculate and update the rated party's average rating ---
    // If customer rated, update supplier's average. If supplier rated, update customer's average.
    const ratedEntityId =
      ratedBy === 'customer' ? order.supplierId : order.customerId;
    const ratingField =
      ratedBy === 'customer' ? 'customerRating' : 'supplierRating';

    if (ratedEntityId) {
      // Query all delivered orders for this entity to recalculate average
      const entityField = ratedBy === 'customer' ? 'supplierId' : 'customerId';
      const ratingsSnapshot = await adminDb
        .collection('orders')
        .where(entityField, '==', ratedEntityId)
        .where('status', '==', 'delivered')
        .get();

      let totalRating = 0;
      let ratingCount = 0;

      ratingsSnapshot.forEach((doc) => {
        const orderData = doc.data();
        // For the current order, use the just-submitted rating since the
        // Firestore query may not yet reflect the update we made above.
        const orderRating =
          doc.id === orderId ? rating : orderData.rating?.[ratingField];
        if (typeof orderRating === 'number') {
          totalRating += orderRating;
          ratingCount++;
        }
      });

      const newAverage = parseFloat((totalRating / ratingCount).toFixed(2));

      // Update the rated entity's rating
      if (ratedBy === 'customer' && order.supplierId) {
        // Update supplier rating
        batchWriter.update('suppliers', order.supplierId as string, {
          'rating.average': newAverage,
          'rating.count': ratingCount,
        });
      } else if (ratedBy === 'supplier' && order.customerId) {
        // Update customer (user) rating
        batchWriter.update('users', order.customerId as string, {
          'rating.average': newAverage,
          'rating.count': ratingCount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully.',
      rating: {
        orderId,
        ratedBy,
        rating,
        feedback: feedback || null,
      },
    });
  } catch (error) {
    console.error('[POST /api/ratings] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while submitting rating.' },
      { status: 500 }
    );
  }
}
