// =============================================================================
// JalSeva API - Suppliers
// =============================================================================
// POST /api/suppliers      - Register a new supplier
// GET  /api/suppliers      - List suppliers (admin, with filters)
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { WaterType, VerificationStatus } from '@/types';

// ---------------------------------------------------------------------------
// POST - Register a new supplier
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      vehicle,
      waterTypes,
      serviceArea,
      documents,
      bankDetails,
    } = body;

    // --- Validation ---
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Verify user exists
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Check if supplier profile already exists for this user
    const existingSupplier = await adminDb
      .collection('suppliers')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingSupplier.empty) {
      return NextResponse.json(
        { error: 'Supplier profile already exists for this user.' },
        { status: 409 }
      );
    }

    // Validate vehicle info
    if (!vehicle || !vehicle.type || !vehicle.capacity || !vehicle.number) {
      return NextResponse.json(
        { error: 'Vehicle must have type, capacity, and number.' },
        { status: 400 }
      );
    }

    if (vehicle.capacity < 500 || vehicle.capacity > 30000) {
      return NextResponse.json(
        { error: 'Vehicle capacity must be between 500 and 30000 litres.' },
        { status: 400 }
      );
    }

    // Validate water types
    const validWaterTypes: WaterType[] = ['ro', 'mineral', 'tanker'];
    if (
      !waterTypes ||
      !Array.isArray(waterTypes) ||
      waterTypes.length === 0 ||
      !waterTypes.every((wt: string) => validWaterTypes.includes(wt as WaterType))
    ) {
      return NextResponse.json(
        { error: 'waterTypes must be a non-empty array of valid water types (ro, mineral, tanker).' },
        { status: 400 }
      );
    }

    // Validate service area
    if (
      !serviceArea ||
      !serviceArea.center ||
      typeof serviceArea.center.lat !== 'number' ||
      typeof serviceArea.center.lng !== 'number' ||
      !serviceArea.radiusKm
    ) {
      return NextResponse.json(
        { error: 'serviceArea must have center (lat, lng) and radiusKm.' },
        { status: 400 }
      );
    }

    // --- Create supplier document ---
    const supplierRef = adminDb.collection('suppliers').doc();
    const supplierId = supplierRef.id;
    const now = new Date().toISOString();

    const supplierData = {
      id: supplierId,
      userId,
      documents: documents || {},
      verificationStatus: 'pending' as VerificationStatus,
      vehicle: {
        type: vehicle.type,
        capacity: vehicle.capacity,
        number: vehicle.number.toUpperCase(),
      },
      isOnline: false,
      currentLocation: serviceArea.center,
      serviceArea: {
        center: {
          lat: serviceArea.center.lat,
          lng: serviceArea.center.lng,
          address: serviceArea.center.address || '',
        },
        radiusKm: serviceArea.radiusKm,
      },
      waterTypes,
      rating: { average: 0, count: 0 },
      bankDetails: bankDetails || null,
      totalOrders: 0,
      totalEarnings: 0,
      createdAt: now,
      updatedAt: now,
    };

    await supplierRef.set(supplierData);

    // Update user role to supplier
    await adminDb.collection('users').doc(userId).update({
      role: 'supplier',
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        supplier: supplierData,
        message: 'Supplier registered successfully. Verification is pending.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/suppliers] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while registering supplier.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET - List suppliers (admin with filters)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as VerificationStatus | null;
    const area = searchParams.get('area');
    const isOnline = searchParams.get('isOnline');
    const waterType = searchParams.get('waterType') as WaterType | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const page = parseInt(searchParams.get('page') || '1', 10);

    let query = adminDb.collection('suppliers') as FirebaseFirestore.Query;

    // Apply filters
    if (status) {
      const validStatuses: VerificationStatus[] = ['pending', 'verified', 'rejected'];
      if (validStatuses.includes(status)) {
        query = query.where('verificationStatus', '==', status);
      }
    }

    if (isOnline !== null && isOnline !== undefined) {
      query = query.where('isOnline', '==', isOnline === 'true');
    }

    if (waterType) {
      query = query.where('waterTypes', 'array-contains', waterType);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    // Pagination
    if (page > 1) {
      const skipCount = (page - 1) * limit;
      let skipQuery = adminDb.collection('suppliers') as FirebaseFirestore.Query;

      if (status) {
        skipQuery = skipQuery.where('verificationStatus', '==', status);
      }

      const skipSnapshot = await skipQuery
        .orderBy('createdAt', 'desc')
        .limit(skipCount)
        .get();

      if (!skipSnapshot.empty) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const suppliers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by area name (post-query since Firestore doesn't support text search)
    let filteredSuppliers = suppliers;
    if (area) {
      const areaLower = area.toLowerCase();
      filteredSuppliers = suppliers.filter((s: Record<string, unknown>) => {
        const serviceArea = s.serviceArea as { center?: { address?: string } };
        return serviceArea?.center?.address?.toLowerCase().includes(areaLower);
      });
    }

    return NextResponse.json({
      success: true,
      suppliers: filteredSuppliers,
      count: filteredSuppliers.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('[GET /api/suppliers] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching suppliers.' },
      { status: 500 }
    );
  }
}
