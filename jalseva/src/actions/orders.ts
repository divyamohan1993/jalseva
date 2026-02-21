'use server';

import { adminDb } from '@/lib/firebase-admin';
import { calculatePrice, generateOrderId } from '@/lib/utils';
import { getDemandLevel } from '@/lib/redis';
import type { CreateOrderRequest, Order, OrderStatus } from '@/types';

// Demand multipliers - O(1) Map lookup
const DEMAND_MULTIPLIERS = new Map<string, number>([
  ['low', 0.9],
  ['normal', 1.0],
  ['high', 1.3],
  ['surge', 1.6],
]);

export async function createOrder(request: CreateOrderRequest) {
  try {
    const orderId = generateOrderId();
    const demandLevel = (await getDemandLevel('default')) ?? 'normal';
    const surgeMultiplier = DEMAND_MULTIPLIERS.get(demandLevel) ?? 1.0;

    const price = calculatePrice(
      request.waterType,
      request.quantityLitres,
      3000,
      surgeMultiplier
    );

    const order = {
      id: orderId,
      customerId: request.customerId,
      waterType: request.waterType,
      quantityLitres: request.quantityLitres,
      status: 'searching' as const,
      deliveryLocation: request.deliveryLocation,
      price,
      payment: {
        method: request.paymentMethod || ('cash' as const),
        status: 'pending' as const,
        amount: price.total,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await adminDb.collection('orders').doc(orderId).set(order);
    } catch {
      // Firestore may be unavailable in demo mode
    }

    return { success: true as const, order: order as Order };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  supplierId?: string
) {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (supplierId) updateData.supplierId = supplierId;
    if (status === 'accepted') updateData.acceptedAt = new Date();
    if (status === 'delivered') updateData.deliveredAt = new Date();

    try {
      await adminDb.collection('orders').doc(orderId).update(updateData);
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update order',
    };
  }
}

export async function cancelOrder(orderId: string) {
  return updateOrderStatus(orderId, 'cancelled');
}
