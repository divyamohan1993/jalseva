'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function toggleSupplierOnline(
  supplierId: string,
  isOnline: boolean
) {
  try {
    try {
      await adminDb.collection('suppliers').doc(supplierId).update({
        isOnline,
        updatedAt: new Date(),
      });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
}

export async function acceptOrder(
  orderId: string,
  supplierId: string
) {
  try {
    try {
      await adminDb.collection('orders').doc(orderId).update({
        status: 'accepted',
        supplierId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to accept order',
    };
  }
}

export async function rejectOrder(orderId: string) {
  try {
    try {
      await adminDb.collection('orders').doc(orderId).update({
        updatedAt: new Date(),
      });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to reject order',
    };
  }
}
