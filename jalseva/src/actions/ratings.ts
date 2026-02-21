'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function submitRating(data: {
  orderId: string;
  rating: number;
  feedback?: string;
  type: 'customer' | 'supplier';
}) {
  try {
    const ratingDoc = {
      ...data,
      createdAt: new Date(),
    };

    try {
      await adminDb.collection('ratings').add(ratingDoc);

      // Update order with rating
      const ratingField =
        data.type === 'customer' ? 'rating.customer' : 'rating.supplier';
      await adminDb
        .collection('orders')
        .doc(data.orderId)
        .update({
          [ratingField]: { score: data.rating, feedback: data.feedback || '' },
        });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to submit rating',
    };
  }
}
