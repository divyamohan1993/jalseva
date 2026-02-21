'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function createPaymentOrder(orderId: string) {
  try {
    const orderSnap = await adminDb.collection('orders').doc(orderId).get();

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
