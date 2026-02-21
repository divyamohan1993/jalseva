'use server';

import { batchWriter } from '@/lib/batch-writer';

export async function submitRating(data: {
  orderId: string;
  rating: number;
  feedback?: string;
  type: 'customer' | 'supplier';
}) {
  try {
    const ratingId = `${data.orderId}_${data.type}_${Date.now()}`;
    const ratingDoc = {
      ...data,
      createdAt: new Date(),
    };

    try {
      // Batch write rating document
      batchWriter.set('ratings', ratingId, ratingDoc as unknown as Record<string, unknown>);

      // Update order with rating field
      const ratingField =
        data.type === 'customer' ? 'rating.customer' : 'rating.supplier';
      batchWriter.update('orders', data.orderId, {
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
