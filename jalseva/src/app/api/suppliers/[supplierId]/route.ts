// =============================================================================
// JalSeva API - Single Supplier Operations
// =============================================================================
// GET   /api/suppliers/[supplierId]  - Get supplier details
// PUT   /api/suppliers/[supplierId]  - Update supplier (toggle online, location, verify)
// PATCH /api/suppliers/[supplierId]  - Admin-only: update verification status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { VerificationStatus } from '@/types';

// ---------------------------------------------------------------------------
// GET - Get supplier details
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Missing supplierId parameter.' },
        { status: 400 }
      );
    }

    const supplierDoc = await adminDb.collection('suppliers').doc(supplierId).get();

    if (!supplierDoc.exists) {
      return NextResponse.json(
        { error: 'Supplier not found.' },
        { status: 404 }
      );
    }

    // Also fetch the associated user profile
    const supplierData = supplierDoc.data()!;
    let userProfile = null;

    if (supplierData.userId) {
      const userDoc = await adminDb.collection('users').doc(supplierData.userId).get();
      if (userDoc.exists) {
        userProfile = { id: userDoc.id, ...userDoc.data() };
      }
    }

    return NextResponse.json({
      success: true,
      supplier: { id: supplierDoc.id, ...supplierData },
      userProfile,
    });
  } catch (error) {
    console.error(`[GET /api/suppliers/unknown] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error while fetching supplier.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT - Update supplier (toggle online, update location, admin verify/reject)
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Missing supplierId parameter.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isOnline, currentLocation, waterTypes, serviceArea, vehicle, bankDetails } = body;

    const supplierRef = adminDb.collection('suppliers').doc(supplierId);
    const supplierDoc = await supplierRef.get();

    if (!supplierDoc.exists) {
      return NextResponse.json(
        { error: 'Supplier not found.' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    // Toggle online status
    if (typeof isOnline === 'boolean') {
      // Only verified suppliers can go online
      const currentData = supplierDoc.data()!;
      if (isOnline && currentData.verificationStatus !== 'verified') {
        return NextResponse.json(
          { error: 'Supplier must be verified before going online.' },
          { status: 403 }
        );
      }
      updateData.isOnline = isOnline;
    }

    // Update current location
    if (currentLocation) {
      if (
        typeof currentLocation.lat !== 'number' ||
        typeof currentLocation.lng !== 'number'
      ) {
        return NextResponse.json(
          { error: 'currentLocation must have valid lat and lng.' },
          { status: 400 }
        );
      }
      updateData.currentLocation = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: currentLocation.address || '',
      };
    }

    // Update water types
    if (waterTypes) {
      if (!Array.isArray(waterTypes) || waterTypes.length === 0) {
        return NextResponse.json(
          { error: 'waterTypes must be a non-empty array.' },
          { status: 400 }
        );
      }
      updateData.waterTypes = waterTypes;
    }

    // Update service area
    if (serviceArea) {
      if (
        !serviceArea.center ||
        typeof serviceArea.center.lat !== 'number' ||
        typeof serviceArea.center.lng !== 'number'
      ) {
        return NextResponse.json(
          { error: 'serviceArea.center must have valid lat and lng.' },
          { status: 400 }
        );
      }
      updateData.serviceArea = serviceArea;
    }

    // Update vehicle info
    if (vehicle) {
      updateData.vehicle = vehicle;
    }

    // Update bank details
    if (bankDetails) {
      updateData.bankDetails = bankDetails;
    }

    await supplierRef.update(updateData);

    const updatedDoc = await supplierRef.get();

    return NextResponse.json({
      success: true,
      supplier: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error(`[PUT /api/suppliers/unknown] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error while updating supplier.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH - Admin-only: Update verification status
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Missing supplierId parameter.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { verificationStatus, adminId, rejectionReason } = body as {
      verificationStatus: VerificationStatus;
      adminId: string;
      rejectionReason?: string;
    };

    // --- Validation ---
    if (!adminId) {
      return NextResponse.json(
        { error: 'Missing required field: adminId' },
        { status: 400 }
      );
    }

    // Verify admin role
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const validStatuses: VerificationStatus[] = ['pending', 'verified', 'rejected'];
    if (!verificationStatus || !validStatuses.includes(verificationStatus)) {
      return NextResponse.json(
        { error: 'verificationStatus must be pending, verified, or rejected.' },
        { status: 400 }
      );
    }

    const supplierRef = adminDb.collection('suppliers').doc(supplierId);
    const supplierDoc = await supplierRef.get();

    if (!supplierDoc.exists) {
      return NextResponse.json(
        { error: 'Supplier not found.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      verificationStatus,
      verifiedBy: adminId,
      verifiedAt: now,
      updatedAt: now,
    };

    if (verificationStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    // If rejecting, force offline
    if (verificationStatus === 'rejected') {
      updateData.isOnline = false;
    }

    await supplierRef.update(updateData);

    const updatedDoc = await supplierRef.get();

    return NextResponse.json({
      success: true,
      supplier: { id: updatedDoc.id, ...updatedDoc.data() },
      message: `Supplier verification status updated to '${verificationStatus}'.`,
    });
  } catch (error) {
    console.error(`[PATCH /api/suppliers/unknown] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error while updating verification status.' },
      { status: 500 }
    );
  }
}
