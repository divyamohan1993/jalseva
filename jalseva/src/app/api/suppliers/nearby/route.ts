// =============================================================================
// JalSeva API - Find Nearby Suppliers (Geohash-Optimized)
// =============================================================================
// GET /api/suppliers/nearby?lat=...&lng=...&radius=...&waterType=...
//
// BEFORE: O(n) - scans ALL suppliers, runs Haversine on each
// AFTER:  O(k) - geohash index narrows to k candidates (k << n)
//
// At 50K RPS with 10K suppliers, this reduces per-request work from
// 10K distance calculations to ~5-50 (suppliers in nearby geohash cells).
//
// Fallback: If the geohash index is empty (cold start), falls back to
// the original Firestore query + Haversine scan.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { haversineDistance } from '@/lib/maps';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { supplierIndex } from '@/lib/geohash';
import { responseCache, cacheAside } from '@/lib/cache';
import type { GeoLocation, WaterType } from '@/types';

// ---------------------------------------------------------------------------
// GET - Find nearby suppliers
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radiusKm = parseFloat(searchParams.get('radius') || '10');
    const waterType = searchParams.get('waterType') as WaterType | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // --- Validation ---
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing or invalid lat/lng query parameters.' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'lat must be [-90, 90] and lng must be [-180, 180].' },
        { status: 400 }
      );
    }

    if (radiusKm <= 0 || radiusKm > 50) {
      return NextResponse.json(
        { error: 'radius must be between 0 and 50 km.' },
        { status: 400 }
      );
    }

    const validWaterTypes: WaterType[] = ['ro', 'mineral', 'tanker'];
    if (waterType && !validWaterTypes.includes(waterType)) {
      return NextResponse.json(
        { error: 'Invalid waterType. Must be ro, mineral, or tanker.' },
        { status: 400 }
      );
    }

    const userLocation: GeoLocation = { lat, lng };

    // --- Try geohash index first (O(k) lookup) ---
    if (supplierIndex.size > 0) {
      const candidates = supplierIndex.findNearby(lat, lng, radiusKm, (data) => {
        // Filter by online + verified + waterType
        if (!data.isOnline || data.verificationStatus !== 'verified') return false;
        if (waterType && Array.isArray(data.waterTypes)) {
          return data.waterTypes.includes(waterType);
        }
        return true;
      });

      // Exact distance filter using Haversine on small candidate set
      const nearbySuppliers = candidates
        .map((candidate) => {
          const distanceMeters = haversineDistance(userLocation, { lat: candidate.lat, lng: candidate.lng });
          const distanceKm = distanceMeters / 1000;
          if (distanceKm > radiusKm) return null;

          const etaSeconds = Math.round(distanceMeters / 8.33); // ~30 km/h

          return {
            id: candidate.id,
            ...candidate.data,
            distance: Math.round(distanceMeters),
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            eta: etaSeconds,
            etaMinutes: Math.round(etaSeconds / 60),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a!.distance - b!.distance)
        .slice(0, limit) as Array<{ id: string; distance: number; [key: string]: unknown }>;

      return NextResponse.json({
        success: true,
        suppliers: nearbySuppliers,
        count: nearbySuppliers.length,
        source: 'geohash-index',
        searchParams: { lat, lng, radiusKm, waterType: waterType || 'all' },
      });
    }

    // --- Fallback: Firestore query + Haversine scan (cold start) ---
    // Also populates the geohash index for subsequent requests
    const cacheKey = `nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}:${waterType || 'all'}`;

    const cachedResult = responseCache.get(cacheKey);
    if (cachedResult) {
      return new NextResponse(cachedResult, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    let query = adminDb
      .collection('suppliers')
      .where('isOnline', '==', true)
      .where('verificationStatus', '==', 'verified') as FirebaseFirestore.Query;

    if (waterType) {
      query = query.where('waterTypes', 'array-contains', waterType);
    }

    const snapshot = await firestoreBreaker.execute(
      () => query.get(),
      () => ({ docs: [], forEach: () => {} } as unknown as FirebaseFirestore.QuerySnapshot)
    );

    const nearbySuppliers: Array<{
      id: string;
      distance: number;
      eta: number;
      [key: string]: unknown;
    }> = [];

    snapshot.forEach((doc) => {
      const supplier = doc.data();

      // Populate geohash index for future requests
      if (supplier.currentLocation) {
        const loc = supplier.currentLocation as GeoLocation;
        supplierIndex.upsert(doc.id, loc.lat, loc.lng, {
          isOnline: supplier.isOnline,
          verificationStatus: supplier.verificationStatus,
          waterTypes: supplier.waterTypes,
          vehicle: supplier.vehicle,
          rating: supplier.rating,
          serviceArea: supplier.serviceArea,
          name: supplier.name,
        });

        const distanceMeters = haversineDistance(userLocation, loc);
        const distanceKm = distanceMeters / 1000;

        if (distanceKm <= radiusKm) {
          const etaSeconds = Math.round(distanceMeters / 8.33);
          nearbySuppliers.push({
            id: doc.id,
            ...supplier,
            distance: Math.round(distanceMeters),
            distanceKm: parseFloat(distanceKm.toFixed(2)),
            eta: etaSeconds,
            etaMinutes: Math.round(etaSeconds / 60),
          });
        }
      }
    });

    nearbySuppliers.sort((a, b) => a.distance - b.distance);
    const limitedResults = nearbySuppliers.slice(0, limit);

    const responseBody = JSON.stringify({
      success: true,
      suppliers: limitedResults,
      count: limitedResults.length,
      source: 'firestore-scan',
      searchParams: { lat, lng, radiusKm, waterType: waterType || 'all' },
    });

    // Cache for 15 seconds (location data changes slowly)
    responseCache.set(cacheKey, responseBody, 15);

    return new NextResponse(responseBody, {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (error) {
    console.error('[GET /api/suppliers/nearby] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while finding nearby suppliers.' },
      { status: 500 }
    );
  }
}
