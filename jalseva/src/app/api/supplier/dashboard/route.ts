// =============================================================================
// JalSeva API - Supplier Dashboard (in-memory demo)
// =============================================================================
// GET  /api/supplier/dashboard?supplierId=X
//      → { supplier, isOnline, pendingOrders, activeOrder, todayEarnings }
// POST /api/supplier/dashboard
//      body: { action, supplierId, orderId?, online? }
//      actions: toggleOnline | acceptOrder | rejectOrder
//
// Reads/writes the singleton in-memory store on the Cloud Run instance. No
// Firestore involved — the demo runs for a few minutes; when the container
// scales to zero, the store drops and the next cold-start re-seeds.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import * as store from '@/lib/demo-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId required' },
        { status: 400 },
      );
    }

    let supplier = store.getSupplier(supplierId);

    // If the demo supplier doesn't exist yet (e.g. someone signed in with a
    // non-seeded number while choosing Supplier), auto-create a minimal
    // verified record so the dashboard renders.
    if (!supplier) {
      const seeded = store.getSupplier(store.DEMO_IDS.supplier);
      if (seeded) {
        const synthesised = { ...seeded, id: supplierId, userId: supplierId };
        store.upsertSupplier(synthesised);
        supplier = synthesised;
      } else {
        return NextResponse.json(
          { error: 'supplier not found' },
          { status: 404 },
        );
      }
    }

    const pendingOrders = supplier.isOnline ? store.listPendingOrders() : [];
    const activeOrders = store.listActiveOrdersForSupplier(supplierId);
    const todayEarnings = store.getTodayEarningsForSupplier(supplierId);

    return NextResponse.json({
      supplier,
      isOnline: supplier.isOnline,
      pendingOrders,
      activeOrder: activeOrders[0] || null,
      todayEarnings,
    });
  } catch (error) {
    console.error('[GET /api/supplier/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, supplierId, orderId, online } = body as {
      action?: string;
      supplierId?: string;
      orderId?: string;
      online?: boolean;
    };

    if (!action || !supplierId) {
      return NextResponse.json(
        { error: 'action and supplierId required' },
        { status: 400 },
      );
    }

    if (action === 'toggleOnline') {
      const supplier = store.getSupplier(supplierId);
      if (!supplier) {
        return NextResponse.json(
          { error: 'supplier not found' },
          { status: 404 },
        );
      }
      const next = typeof online === 'boolean' ? online : !supplier.isOnline;
      store.setSupplierOnline(supplierId, next);
      return NextResponse.json({ success: true, isOnline: next });
    }

    if (action === 'acceptOrder') {
      if (!orderId) {
        return NextResponse.json(
          { error: 'orderId required for acceptOrder' },
          { status: 400 },
        );
      }
      const updated = store.acceptOrderInStore(orderId, supplierId);
      if (!updated) {
        return NextResponse.json(
          { error: 'order not pending or not found' },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, order: updated });
    }

    if (action === 'rejectOrder') {
      if (!orderId) {
        return NextResponse.json(
          { error: 'orderId required for rejectOrder' },
          { status: 400 },
        );
      }
      store.rejectOrderInStore(orderId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: `unknown action: ${action}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('[POST /api/supplier/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
