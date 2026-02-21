// =============================================================================
// JalSeva API - Admin Analytics
// =============================================================================
// GET /api/admin/analytics
// Returns platform analytics including total orders, revenue, active
// suppliers, average delivery time, and daily/weekly/monthly breakdowns.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cacheGet, cacheSet } from '@/lib/redis';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { hotCache } from '@/lib/cache';

// ---------------------------------------------------------------------------
// Date Helpers
// ---------------------------------------------------------------------------

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30); // Default: last 30 days
  }

  return { start, end };
}

function getDateBucketKey(date: string, granularity: string): string {
  const d = new Date(date);
  switch (granularity) {
    case 'daily':
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    case 'weekly': {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return `W-${weekStart.toISOString().split('T')[0]}`;
    }
    case 'monthly':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default:
      return d.toISOString().split('T')[0];
  }
}

// ---------------------------------------------------------------------------
// GET - Admin Analytics
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const period = searchParams.get('period') || 'month';
    const granularity = searchParams.get('granularity') || 'daily';

    // --- Validate admin ---
    if (!adminId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: adminId' },
        { status: 400 }
      );
    }

    const adminDoc = await firestoreBreaker.execute(
      () => adminDb.collection('users').doc(adminId).get(),
      () => null
    );
    if (!adminDoc || !adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // --- Check L1 hot cache first (60s TTL) ---
    const cacheKey = `analytics:${period}:${granularity}`;
    const l1Cached = hotCache.get(cacheKey);
    if (l1Cached !== undefined) {
      return NextResponse.json({
        success: true,
        analytics: l1Cached,
        source: 'l1-cache',
      });
    }

    // --- Check Redis cache (L2) ---
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      // Populate L1 cache from L2
      hotCache.set(cacheKey, cached, 60);
      return NextResponse.json({
        success: true,
        analytics: cached,
        source: 'cache',
      });
    }

    // --- Get date range ---
    const { start, end } = getDateRange(period);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // --- Fetch orders in range ---
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('createdAt', '>=', startISO)
      .where('createdAt', '<=', endISO)
      .get();

    // --- Calculate metrics ---
    let totalOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalDeliveryTimeSeconds = 0;
    let deliveredWithTimeCount = 0;

    const ordersByStatus: Record<string, number> = {};
    const ordersByWaterType: Record<string, number> = {};
    const revenueByWaterType: Record<string, number> = {};
    const timeBreakdown: Record<string, {
      orders: number;
      revenue: number;
      delivered: number;
    }> = {};

    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      totalOrders++;

      // Status breakdown
      const status = order.status || 'unknown';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

      // Water type breakdown
      const wt = order.waterType || 'unknown';
      ordersByWaterType[wt] = (ordersByWaterType[wt] || 0) + 1;

      // Revenue (only for delivered / paid orders)
      if (order.status === 'delivered' || order.payment?.status === 'paid') {
        deliveredOrders++;
        const orderTotal = order.price?.total || 0;
        totalRevenue += orderTotal;
        totalCommission += order.price?.commission || 0;
        revenueByWaterType[wt] = (revenueByWaterType[wt] || 0) + orderTotal;

        // Calculate delivery time
        if (order.createdAt && order.deliveredAt) {
          const created = new Date(order.createdAt).getTime();
          const delivered = new Date(order.deliveredAt).getTime();
          if (delivered > created) {
            totalDeliveryTimeSeconds += (delivered - created) / 1000;
            deliveredWithTimeCount++;
          }
        }
      }

      if (order.status === 'cancelled') {
        cancelledOrders++;
      }

      // Time-series breakdown
      if (order.createdAt) {
        const bucketKey = getDateBucketKey(order.createdAt, granularity);
        if (!timeBreakdown[bucketKey]) {
          timeBreakdown[bucketKey] = { orders: 0, revenue: 0, delivered: 0 };
        }
        timeBreakdown[bucketKey].orders++;

        if (order.status === 'delivered') {
          timeBreakdown[bucketKey].delivered++;
          timeBreakdown[bucketKey].revenue += order.price?.total || 0;
        }
      }
    });

    // --- Active suppliers count ---
    const activeSuppliersSnapshot = await adminDb
      .collection('suppliers')
      .where('isOnline', '==', true)
      .where('verificationStatus', '==', 'verified')
      .get();

    const totalSuppliersSnapshot = await adminDb
      .collection('suppliers')
      .get();

    const verifiedSuppliersSnapshot = await adminDb
      .collection('suppliers')
      .where('verificationStatus', '==', 'verified')
      .get();

    const pendingSuppliersSnapshot = await adminDb
      .collection('suppliers')
      .where('verificationStatus', '==', 'pending')
      .get();

    // --- Total users ---
    const totalUsersSnapshot = await adminDb.collection('users').get();

    // --- Calculate averages ---
    const avgDeliveryTimeMinutes =
      deliveredWithTimeCount > 0
        ? Math.round(totalDeliveryTimeSeconds / deliveredWithTimeCount / 60)
        : 0;

    const avgOrderValue =
      deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

    const completionRate =
      totalOrders > 0
        ? parseFloat(((deliveredOrders / totalOrders) * 100).toFixed(1))
        : 0;

    const cancellationRate =
      totalOrders > 0
        ? parseFloat(((cancelledOrders / totalOrders) * 100).toFixed(1))
        : 0;

    // --- Sort time breakdown chronologically ---
    const sortedTimeSeries = Object.entries(timeBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        ...data,
      }));

    // --- Build analytics response ---
    const analytics = {
      summary: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: Math.round(totalRevenue),
        totalCommission: Math.round(totalCommission),
        avgDeliveryTimeMinutes,
        avgOrderValue,
        completionRate,
        cancellationRate,
      },
      suppliers: {
        total: totalSuppliersSnapshot.size,
        active: activeSuppliersSnapshot.size,
        verified: verifiedSuppliersSnapshot.size,
        pendingVerification: pendingSuppliersSnapshot.size,
      },
      users: {
        total: totalUsersSnapshot.size,
      },
      breakdowns: {
        byStatus: ordersByStatus,
        byWaterType: ordersByWaterType,
        revenueByWaterType,
      },
      timeSeries: sortedTimeSeries,
      metadata: {
        period,
        granularity,
        startDate: startISO,
        endDate: endISO,
        generatedAt: new Date().toISOString(),
      },
    };

    // --- Cache for 5 minutes in Redis (L2) and 60 seconds in L1 ---
    await cacheSet(cacheKey, analytics, 300);
    hotCache.set(cacheKey, analytics, 60);

    return NextResponse.json({
      success: true,
      analytics,
      source: 'firestore',
    });
  } catch (error) {
    console.error('[GET /api/admin/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching analytics.' },
      { status: 500 }
    );
  }
}
