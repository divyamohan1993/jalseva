// =============================================================================
// JalSeva API - Find Nearby Suppliers
// =============================================================================
// GET /api/suppliers/nearby?lat=...&lng=...&radius=...&waterType=...
// Returns online, verified suppliers sorted by distance.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { haversineDistance } from '@/lib/maps';
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
    if (isNaN(lat) || isNaN(lng)) {
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

    // --- Query Firestore for online, verified suppliers ---
    let query = adminDb
      .collection('suppliers')
      .where('isOnline', '==', true)
      .where('verificationStatus', '==', 'verified') as FirebaseFirestore.Query;

    if (waterType) {
      query = query.where('waterTypes', 'array-contains', waterType);
    }

    const snapshot = await query.get();

    // --- Filter by distance and sort ---
    const nearbySuppliers: Array<{
      id: string;
      distance: number;
      eta: number;
      [key: string]: unknown;
    }> = [];

    snapshot.forEach((doc) => {
      const supplier = doc.data();
      if (supplier.currentLocation) {
        const supplierLocation = supplier.currentLocation as GeoLocation;
        const distanceMeters = haversineDistance(userLocation, supplierLocation);
        const distanceKm = distanceMeters / 1000;

        if (distanceKm <= radiusKm) {
          // Estimate ETA: ~30 km/h average city speed
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

    // Sort by distance (nearest first)
    nearbySuppliers.sort((a, b) => a.distance - b.distance);

    // Apply limit
    const limitedResults = nearbySuppliers.slice(0, limit);

    return NextResponse.json({
      success: true,
      suppliers: limitedResults,
      count: limitedResults.length,
      searchParams: {
        lat,
        lng,
        radiusKm,
        waterType: waterType || 'all',
      },
    });
  } catch (error) {
    console.error('[GET /api/suppliers/nearby] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while finding nearby suppliers.' },
      { status: 500 }
    );
  }
}
