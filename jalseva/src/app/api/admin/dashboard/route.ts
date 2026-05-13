// =============================================================================
// JalSeva API - Admin Dashboard (in-memory demo)
// =============================================================================
// GET /api/admin/dashboard
//   → { ordersToday, revenueToday, activeSuppliers, totalUsers,
//       recentOrders, pendingSuppliers }
//
// Reads the singleton in-memory store on the Cloud Run instance. Replaces
// the Firestore client subscriptions in the admin dashboard, which fail
// with permission-denied for demo users who have no Firebase Auth session.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import * as store from '@/lib/demo-store';

export async function GET(_request: NextRequest) {
  try {
    const all = store.listAllOrders();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todayOrders = all.filter(
      (o) => new Date(o.createdAt).getTime() >= todayStartMs,
    );

    let revenueToday = 0;
    for (const o of todayOrders) {
      if (o.status === 'delivered' && o.payment?.status === 'paid') {
        revenueToday += o.price?.total ?? 0;
      }
    }

    const recentOrders = all.slice(0, 10);

    const allSuppliers = store.listAllSuppliers();
    const activeSuppliers = allSuppliers.filter((s) => s.isOnline).length;
    const pendingSuppliers = allSuppliers
      .filter((s) => s.verificationStatus === 'pending')
      .slice(0, 10);

    const totalUsers = store.listAllUsers().length;

    return NextResponse.json({
      ordersToday: todayOrders.length,
      revenueToday,
      activeSuppliers,
      totalUsers,
      recentOrders,
      pendingSuppliers,
    });
  } catch (error) {
    console.error('[GET /api/admin/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
