// =============================================================================
// JalSeva API - Single Order Operations
// =============================================================================
// GET /api/orders/[orderId]  - Fetch a single order by ID
// PUT /api/orders/[orderId]  - Update order (status changes, accept, reject, etc.)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type { OrderStatus } from '@/types';

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  searching: ['accepted', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['arriving', 'delivered', 'cancelled'],
  arriving: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

async function getAdminDb() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb;
}

// ---------------------------------------------------------------------------
// GET - Fetch a single order
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter.' },
        { status: 400 }
      );
    }

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          return NextResponse.json(
            { error: 'Order not found.' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          order: { id: orderDoc.id, ...orderDoc.data() },
        });
      } catch (dbError) {
        console.warn(`[GET /api/orders/${orderId}] Firestore error:`, dbError);
        // Fall through to demo response
      }
    }

    // Demo mode: return 404 so client uses its local store data
    return NextResponse.json(
      { error: 'Order not found (demo mode).', demo: true },
      { status: 404 }
    );
  } catch (error) {
    console.error(`[GET /api/orders/unknown] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error while fetching order.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT - Update order (status transitions, accept, deliver, cancel)
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId parameter.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, supplierId, cancellationReason } = body as {
      status?: OrderStatus;
      supplierId?: string;
      cancellationReason?: string;
    };

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
          return NextResponse.json(
            { error: 'Order not found.' },
            { status: 404 }
          );
        }

        const currentOrder = orderDoc.data()!;
        const currentStatus = currentOrder.status as OrderStatus;
        const now = new Date().toISOString();

        // Validate status transition
        const allowedTransitions = VALID_TRANSITIONS[currentStatus];
        if (!allowedTransitions || !allowedTransitions.includes(status)) {
          return NextResponse.json(
            {
              error: `Invalid status transition from '${currentStatus}' to '${status}'. Allowed: ${allowedTransitions?.join(', ') || 'none'}.`,
            },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {
          status,
          updatedAt: now,
        };

        switch (status) {
          case 'accepted': {
            if (!supplierId) {
              return NextResponse.json(
                { error: 'supplierId is required when accepting an order.' },
                { status: 400 }
              );
            }

            const supplierDoc = await adminDb
              .collection('suppliers')
              .doc(supplierId)
              .get();

            if (!supplierDoc.exists) {
              return NextResponse.json(
                { error: 'Supplier not found.' },
                { status: 404 }
              );
            }

            const supplierData = supplierDoc.data()!;
            if (supplierData.verificationStatus !== 'verified') {
              return NextResponse.json(
                { error: 'Supplier is not verified.' },
                { status: 403 }
              );
            }

            updateData.supplierId = supplierId;
            updateData.acceptedAt = now;

            if (supplierData.currentLocation) {
              updateData.supplierLocation = supplierData.currentLocation;
            }
            break;
          }

          case 'en_route': {
            updateData.pickedAt = now;
            break;
          }

          case 'arriving': {
            updateData.arrivingAt = now;
            break;
          }

          case 'delivered': {
            updateData.deliveredAt = now;
            updateData['payment.status'] = 'paid';
            break;
          }

          case 'cancelled': {
            updateData.cancelledAt = now;
            if (cancellationReason) {
              updateData.cancellationReason = cancellationReason;
            }
            if (currentOrder.payment?.status === 'paid') {
              updateData['payment.status'] = 'refunded';
            }
            break;
          }
        }

        await orderRef.update(updateData);
        const updatedDoc = await orderRef.get();

        return NextResponse.json({
          success: true,
          order: { id: updatedDoc.id, ...updatedDoc.data() },
          message: `Order status updated to '${status}'.`,
        });
      } catch (dbError) {
        console.warn(`[PUT /api/orders/${orderId}] Firestore error:`, dbError);
        // Fall through to demo response
      }
    }

    // Demo mode: return success with the requested status
    return NextResponse.json({
      success: true,
      order: { id: orderId, status },
      message: `Order status updated to '${status}' (demo mode).`,
      demo: true,
    });
  } catch (error) {
    console.error(`[PUT /api/orders/unknown] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error while updating order.' },
      { status: 500 }
    );
  }
}
