'use server';

import { adminDb } from '@/lib/firebase-admin';
import { cacheSet, cacheGet } from '@/lib/redis';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';
import { locationCache } from '@/lib/cache';

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

    // Hot cache for in-process reads — O(1), zero network
    locationCache.set(`tracking:${orderId}`, location, 30);

    // Redis cache for cross-process reads
    await cacheSet(`tracking:${orderId}`, JSON.stringify(trackingData), 60);

    // Non-blocking batch write to Firestore
    try {
      batchWriter.update('orders', orderId, {
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
    // L1: In-process hot cache — O(1)
    const hotLocation = locationCache.get(`tracking:${orderId}`);
    if (hotLocation) {
      return { success: true as const, tracking: { supplierLocation: hotLocation } };
    }

    // L2: Redis cache — ~1ms
    const cached = await cacheGet(`tracking:${orderId}`);
    if (cached) {
      return { success: true as const, tracking: JSON.parse(cached as string) };
    }

    // L3: Firestore via circuit breaker
    const orderSnap = await firestoreBreaker.execute(
      () => adminDb.collection('orders').doc(orderId).get(),
      () => ({ exists: false, data: () => null } as any),
    );

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
