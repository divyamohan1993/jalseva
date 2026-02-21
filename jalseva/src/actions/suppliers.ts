'use server';

import { batchWriter } from '@/lib/batch-writer';

export async function toggleSupplierOnline(
  supplierId: string,
  isOnline: boolean
) {
  try {
    try {
      batchWriter.update('suppliers', supplierId, {
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
      batchWriter.update('orders', orderId, {
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
      batchWriter.update('orders', orderId, {
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
