'use client';

// =============================================================================
// JalSeva - Analytics Dashboard Page
// =============================================================================
// Data-rich analytics view with date range selector, KPI metric cards,
// CSS bar charts for orders-over-time, revenue breakdown with colored bars,
// top suppliers table, top areas by demand, and customer retention rate.
// =============================================================================

import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  DollarSign,
  Clock,
  Star,
  Calendar,
  Package,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { Order, WaterType } from '@/types';

// =============================================================================
// Types & Constants
// =============================================================================

type DateRangeKey = 'today' | 'week' | 'month' | 'custom';

const DATE_RANGES: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

const WATER_TYPE_COLORS: Record<WaterType, { bg: string; bar: string; text: string }> = {
  ro: { bg: 'bg-blue-100', bar: 'bg-blue-500', text: 'text-blue-700' },
  mineral: { bg: 'bg-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  tanker: { bg: 'bg-amber-100', bar: 'bg-amber-500', text: 'text-amber-700' },
};

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  ro: 'RO Water',
  mineral: 'Mineral Water',
  tanker: 'Tanker Water',
};

// =============================================================================
// Metric Card Sub-component
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  change?: number; // percentage change, positive or negative
}

function MetricCard({ title, value, icon, iconBg, change }: MetricCardProps) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="mt-1.5 flex items-center gap-1">
              {change >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Analytics Dashboard Component
// =============================================================================

export default function AnalyticsPage() {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------------------------------
  // Date range calculation
  // --------------------------------------------------------------------------
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (dateRangeKey) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        start = customStart ? new Date(customStart) : new Date(now);
        start.setHours(0, 0, 0, 0);
        if (customEnd) {
          end.setTime(new Date(customEnd).getTime());
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }, [dateRangeKey, customStart, customEnd]);

  // --------------------------------------------------------------------------
  // Firestore listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const startTimestamp = Timestamp.fromDate(dateRange.start);

    const ordersQuery = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startTimestamp),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orderList: Order[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();

        // Filter by end date as well
        if (createdAt > dateRange.end) return;

        orderList.push({
          id: docSnap.id,
          customerId: data.customerId || '',
          supplierId: data.supplierId || undefined,
          waterType: data.waterType || 'ro',
          quantityLitres: data.quantityLitres || 0,
          price: data.price || { base: 0, distance: 0, surge: 0, total: 0, commission: 0, supplierEarning: 0 },
          status: data.status || 'searching',
          deliveryLocation: data.deliveryLocation || { lat: 0, lng: 0 },
          payment: data.payment || { method: 'cash', status: 'pending', amount: 0 },
          createdAt,
          acceptedAt: data.acceptedAt?.toDate?.() || undefined,
          deliveredAt: data.deliveredAt?.toDate?.() || undefined,
          cancelledAt: data.cancelledAt?.toDate?.() || undefined,
        });
      });

      setOrders(orderList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading analytics data:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dateRange]);

  // --------------------------------------------------------------------------
  // Computed metrics
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    const totalRevenue = deliveredOrders.reduce(
      (sum, o) => sum + (o.payment.status === 'paid' ? o.price.total : 0),
      0
    );

    // Average delivery time (in minutes) for delivered orders
    const deliveryTimes = deliveredOrders
      .filter((o) => o.acceptedAt && o.deliveredAt)
      .map((o) => (o.deliveredAt!.getTime() - o.acceptedAt!.getTime()) / 60000);

    const avgDeliveryTime =
      deliveryTimes.length > 0
        ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
        : 0;

    // Customer satisfaction (based on ratings)
    const ratedOrders = orders.filter((o) => o.rating?.customerRating);
    const avgRating =
      ratedOrders.length > 0
        ? ratedOrders.reduce((sum, o) => sum + (o.rating?.customerRating || 0), 0) /
          ratedOrders.length
        : 0;

    return {
      totalOrders,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      avgDeliveryTime,
      avgRating,
      satisfactionPct: avgRating > 0 ? Math.round((avgRating / 5) * 100) : 0,
    };
  }, [orders]);

  // --------------------------------------------------------------------------
  // Orders over time (bar chart data)
  // --------------------------------------------------------------------------
  const ordersOverTime = useMemo(() => {
    if (orders.length === 0) return [];

    const isDaily = dateRangeKey === 'today' || dateRangeKey === 'week';
    const buckets: Map<string, number> = new Map();

    // Generate bucket keys
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const key = isDaily
        ? current.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : `W${Math.ceil(current.getDate() / 7)}`;

      if (!buckets.has(key)) buckets.set(key, 0);

      if (isDaily) {
        current.setDate(current.getDate() + 1);
      } else {
        current.setDate(current.getDate() + 7);
      }
    }

    // Fill buckets
    orders.forEach((order) => {
      const key = isDaily
        ? order.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : `W${Math.ceil(order.createdAt.getDate() / 7)}`;

      buckets.set(key, (buckets.get(key) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([label, count]) => ({
      label,
      count,
    }));
  }, [orders, dateRange, dateRangeKey]);

  const maxBarValue = useMemo(
    () => Math.max(...ordersOverTime.map((d) => d.count), 1),
    [ordersOverTime]
  );

  // --------------------------------------------------------------------------
  // Revenue breakdown by water type
  // --------------------------------------------------------------------------
  const revenueByType = useMemo(() => {
    const breakdown: Record<WaterType, number> = { ro: 0, mineral: 0, tanker: 0 };
    orders
      .filter((o) => o.status === 'delivered' && o.payment.status === 'paid')
      .forEach((o) => {
        breakdown[o.waterType] = (breakdown[o.waterType] || 0) + o.price.total;
      });

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(breakdown).map(([type, amount]) => ({
      type: type as WaterType,
      amount,
      percentage: Math.round((amount / total) * 100),
    }));
  }, [orders]);

  // --------------------------------------------------------------------------
  // Top suppliers
  // --------------------------------------------------------------------------
  const topSuppliers = useMemo(() => {
    const supplierMap: Map<string, { count: number; revenue: number }> = new Map();

    orders
      .filter((o) => o.status === 'delivered' && o.supplierId)
      .forEach((o) => {
        const existing = supplierMap.get(o.supplierId!) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += o.price.supplierEarning;
        supplierMap.set(o.supplierId!, existing);
      });

    return Array.from(supplierMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  // --------------------------------------------------------------------------
  // Top areas by demand
  // --------------------------------------------------------------------------
  const topAreas = useMemo(() => {
    const areaMap: Map<string, number> = new Map();

    orders.forEach((o) => {
      const areaKey = o.deliveryLocation.address
        ? o.deliveryLocation.address.split(',').slice(-2).join(',').trim()
        : `${o.deliveryLocation.lat.toFixed(2)}, ${o.deliveryLocation.lng.toFixed(2)}`;

      areaMap.set(areaKey, (areaMap.get(areaKey) || 0) + 1);
    });

    return Array.from(areaMap.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  // --------------------------------------------------------------------------
  // Customer retention (unique returning customers)
  // --------------------------------------------------------------------------
  const retentionRate = useMemo(() => {
    const customerOrders: Map<string, number> = new Map();
    orders.forEach((o) => {
      customerOrders.set(o.customerId, (customerOrders.get(o.customerId) || 0) + 1);
    });

    const totalCustomers = customerOrders.size;
    const returningCustomers = Array.from(customerOrders.values()).filter(
      (count) => count > 1
    ).length;

    return totalCustomers > 0
      ? Math.round((returningCustomers / totalCustomers) * 100)
      : 0;
  }, [orders]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform performance metrics and insights
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Date Range Selector                                                */}
      {/* ================================================================== */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {DATE_RANGES.map((dr) => (
              <button
                key={dr.key}
                onClick={() => setDateRangeKey(dr.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  dateRangeKey === dr.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {dr.label}
              </button>
            ))}
          </div>
          {dateRangeKey === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Key Metric Cards                                                   */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={<Package className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          change={12.5}
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          change={8.3}
        />
        <MetricCard
          title="Avg Delivery Time"
          value={metrics.avgDeliveryTime > 0 ? `${metrics.avgDeliveryTime} min` : '--'}
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-100"
          change={-3.2}
        />
        <MetricCard
          title="Customer Satisfaction"
          value={metrics.satisfactionPct > 0 ? `${metrics.satisfactionPct}%` : '--'}
          icon={<Star className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-100"
          change={1.8}
        />
      </div>

      {/* ================================================================== */}
      {/* Orders Over Time (CSS Bar Chart)                                   */}
      {/* ================================================================== */}
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Orders Over Time</CardTitle>
          <span className="text-xs text-gray-400">
            {dateRangeKey === 'today' ? 'Hourly' : dateRangeKey === 'month' ? 'Weekly' : 'Daily'}
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ordersOverTime.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No order data for this period
            </div>
          ) : (
            <div className="space-y-4">
              {/* Y-axis max label */}
              <div className="flex justify-between text-xs text-gray-400">
                <span>Orders</span>
                <span>Max: {maxBarValue}</span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-1.5 sm:gap-2 h-48 px-1">
                {ordersOverTime.map((d, i) => {
                  const heightPct = (d.count / maxBarValue) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1 min-w-0"
                    >
                      {/* Count label */}
                      <span className="text-[10px] text-gray-500 font-medium">
                        {d.count > 0 ? d.count : ''}
                      </span>
                      {/* Bar */}
                      <div
                        className="w-full rounded-t-md bg-blue-500 transition-all duration-500 min-h-[2px]"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        title={`${d.label}: ${d.count} orders`}
                      />
                      {/* X-axis label */}
                      <span className="text-[10px] text-gray-400 truncate max-w-full">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Revenue Breakdown & Customer Retention (two columns)              */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Water Type */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Revenue by Water Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByType.map((item) => {
                const colors = WATER_TYPE_COLORS[item.type];
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-3 h-3 rounded-sm',
                            colors.bar
                          )}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {WATER_TYPE_LABELS[item.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total Revenue</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(metrics.totalRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Retention & Quick Stats */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Retention Ring */}
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                  {/* Background ring */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#f3f4f6"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="10"
                      strokeDasharray={`${(retentionRate / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">
                      {retentionRate}%
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Retention Rate</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Percentage of customers who placed more than one order in this period
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">
                    {metrics.deliveredCount}
                  </p>
                  <p className="text-xs text-green-600">Delivered</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-red-700">
                    {metrics.cancelledCount}
                  </p>
                  <p className="text-xs text-red-600">Cancelled</p>
                </div>
              </div>

              {/* Success Rate */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Order Success Rate</span>
                  <span className="font-semibold text-gray-900">
                    {metrics.totalOrders > 0
                      ? Math.round((metrics.deliveredCount / metrics.totalOrders) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        metrics.totalOrders > 0
                          ? (metrics.deliveredCount / metrics.totalOrders) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Top Suppliers & Top Areas (two columns)                           */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100">
            <CardTitle>Top Suppliers</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Supplier ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Orders</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No supplier data for this period
                    </td>
                  </tr>
                ) : (
                  topSuppliers.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                            i === 0
                              ? 'bg-amber-100 text-amber-700'
                              : i === 1
                              ? 'bg-gray-200 text-gray-600'
                              : i === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                        {s.id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {s.count}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-green-700">
                        {formatCurrency(s.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Areas by Demand */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100">
            <CardTitle>Top Areas by Demand</CardTitle>
          </div>
          <div className="p-4 space-y-3">
            {topAreas.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No location data for this period
              </div>
            ) : (
              topAreas.map((area, i) => {
                const maxCount = topAreas[0]?.count || 1;
                const widthPct = (area.count / maxCount) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {area.area}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 ml-3">
                        {area.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
