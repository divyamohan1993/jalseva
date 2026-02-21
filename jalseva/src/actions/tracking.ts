'use server';

import { adminDb } from '@/lib/firebase-admin';
import { cacheSet, cacheGet } from '@/lib/redis';

export async function updateSupplierLocation(
  orderId: string,
  location: { lat: number; lng: number },
  eta?: number,
  distance?: number
) {
  try {
    const trackingData = {
      supplierLocation: location,
      eta: eta ?? 0,
      distance: distance ?? 0,
      updatedAt: new Date(),
    };

    // Cache in Redis for fast reads - O(1)
    await cacheSet(`tracking:${orderId}`, JSON.stringify(trackingData), 60);

    try {
      await adminDb.collection('orders').doc(orderId).update({
        tracking: trackingData,
        updatedAt: new Date(),
      });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update tracking',
    };
  }
}

export async function getTrackingInfo(orderId: string) {
  try {
    // Try Redis cache first - O(1)
    const cached = await cacheGet(`tracking:${orderId}`);
    if (cached) {
      return { success: true as const, tracking: JSON.parse(cached as string) };
    }

    // Fallback to Firestore
    const orderSnap = await adminDb.collection('orders').doc(orderId).get();
    if (orderSnap.exists) {
      const tracking = orderSnap.data()?.tracking;
      return { success: true as const, tracking: tracking ?? null };
    }

    return { success: true as const, tracking: null };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to get tracking',
    };
  }
}
