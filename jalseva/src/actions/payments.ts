'use server';

import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';

export async function createPaymentOrder(orderId: string) {
  try {
    // Read requires actual data back — use circuit breaker for resilience
    const orderSnap = await firestoreBreaker.execute(
      () => adminDb.collection('orders').doc(orderId).get(),
      () => ({ exists: false, data: () => null } as any),
    );

    if (!orderSnap.exists) {
      return { success: false as const, error: 'Order not found' };
    }

    const order = orderSnap.data()!;
    const paymentId = `pay_sim_${Date.now()}`;

    return {
      success: true as const,
      payment: {
        id: paymentId,
        amount: order.price?.total ?? 0,
        currency: 'INR',
        orderId,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    };
  }
}
