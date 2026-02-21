'use client';
export const dynamic = 'force-dynamic';

// =============================================================================
// JalSeva - Admin Dashboard Page
// =============================================================================
// Real-time overview of platform operations: KPI cards, live operations map
// placeholder, recent orders table, and pending supplier approvals.
// =============================================================================

import type React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  Package,
  DollarSign,
  Users,
  TrendingUp,
  MapPin,
  ChevronRight,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardTitle, } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Order, Supplier, } from '@/types';

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: number; positive: boolean };
}

function StatCard({ title, value, subtitle, icon, iconBg, trend }: StatCardProps) {
  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp
                className={cn(
                  'w-3.5 h-3.5',
                  trend.positive ? 'text-green-500' : 'text-red-500 rotate-180'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.positive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.positive ? '+' : '-'}{Math.abs(trend.value)}% vs yesterday
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
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
// Status color map
// =============================================================================

const statusBadgeVariant: Record<string, 'searching' | 'accepted' | 'en_route' | 'arriving' | 'delivered' | 'cancelled' | 'pending' | 'verified' | 'rejected' | 'info'> = {
  searching: 'searching',
  accepted: 'accepted',
  en_route: 'en_route',
  arriving: 'arriving',
  delivered: 'delivered',
  cancelled: 'cancelled',
  pending: 'pending',
  verified: 'verified',
  rejected: 'rejected',
};

// =============================================================================
// Admin Dashboard Component
// =============================================================================

export default function AdminDashboard() {
  const router = useRouter();

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [activeSuppliers, setActiveSuppliers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingSuppliers, setPendingSuppliers] = useState<(Supplier & { userName?: string })[]>([]);
  const [_loading, setLoading] = useState(true);

  // --------------------------------------------------------------------------
  // Firestore real-time listeners
  // --------------------------------------------------------------------------
  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(todayStart);

    // --- Listen to today's orders for stats ---
    const ordersQuery = query(
      collection(db, 'orders'),
      where('createdAt', '>=', todayTimestamp),
      orderBy('createdAt', 'desc')
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders: Order[] = [];
      let revenue = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const order: Order = {
          id: doc.id,
          customerId: data.customerId || '',
          supplierId: data.supplierId || undefined,
          waterType: data.waterType || 'ro',
          quantityLitres: data.quantityLitres || 0,
          price: data.price || { base: 0, distance: 0, surge: 0, total: 0, commission: 0, supplierEarning: 0 },
          status: data.status || 'searching',
          deliveryLocation: data.deliveryLocation || { lat: 0, lng: 0 },
          supplierLocation: data.supplierLocation || undefined,
          tracking: data.tracking || undefined,
          payment: data.payment || { method: 'cash', status: 'pending', amount: 0 },
          rating: data.rating || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          acceptedAt: data.acceptedAt?.toDate?.() || undefined,
          deliveredAt: data.deliveredAt?.toDate?.() || undefined,
          cancelledAt: data.cancelledAt?.toDate?.() || undefined,
        };

        orders.push(order);

        if (order.status === 'delivered' && order.payment.status === 'paid') {
          revenue += order.price.total;
        }
      });

      setOrdersToday(orders.length);
      setRevenueToday(revenue);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to orders:', error);
      setLoading(false);
    });

    // --- Listen to recent orders (latest 10 regardless of date) ---
    const recentQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          customerId: data.customerId || '',
          supplierId: data.supplierId || undefined,
          waterType: data.waterType || 'ro',
          quantityLitres: data.quantityLitres || 0,
          price: data.price || { base: 0, distance: 0, surge: 0, total: 0, commission: 0, supplierEarning: 0 },
          status: data.status || 'searching',
          deliveryLocation: data.deliveryLocation || { lat: 0, lng: 0 },
          payment: data.payment || { method: 'cash', status: 'pending', amount: 0 },
          createdAt: data.createdAt?.toDate?.() || new Date(),
          acceptedAt: data.acceptedAt?.toDate?.() || undefined,
          deliveredAt: data.deliveredAt?.toDate?.() || undefined,
          cancelledAt: data.cancelledAt?.toDate?.() || undefined,
        });
      });
      setRecentOrders(orders);
    });

    // --- Listen to pending suppliers ---
    const pendingQuery = query(
      collection(db, 'suppliers'),
      where('verificationStatus', '==', 'pending'),
      orderBy('userId'),
      limit(10)
    );

    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      const suppliers: (Supplier & { userName?: string })[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        suppliers.push({
          id: doc.id,
          userId: data.userId || '',
          documents: data.documents || {},
          verificationStatus: data.verificationStatus || 'pending',
          vehicle: data.vehicle || { type: '', capacity: 0, number: '' },
          isOnline: data.isOnline || false,
          currentLocation: data.currentLocation || undefined,
          serviceArea: data.serviceArea || { center: { lat: 0, lng: 0 }, radiusKm: 10 },
          waterTypes: data.waterTypes || [],
          rating: data.rating || { average: 0, count: 0 },
          bankDetails: data.bankDetails || undefined,
          userName: data.userName || data.name || 'Unknown',
        });
      });
      setPendingSuppliers(suppliers);
    });

    // --- Listen to active suppliers count ---
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      where('isOnline', '==', true)
    );

    const unsubActive = onSnapshot(suppliersQuery, (snapshot) => {
      setActiveSuppliers(snapshot.size);
    });

    // --- Listen to total users count ---
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setTotalUsers(snapshot.size);
    });

    return () => {
      unsubOrders();
      unsubRecent();
      unsubPending();
      unsubActive();
      unsubUsers();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------
  const waterTypeLabels: Record<string, string> = {
    ro: 'RO Water',
    mineral: 'Mineral',
    tanker: 'Tanker',
  };

  const _formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time overview of JalSeva operations
        </p>
      </div>

      {/* ================================================================== */}
      {/* KPI Stat Cards                                                     */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Orders Today"
          value={ordersToday}
          subtitle="Total orders placed"
          icon={<Package className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(revenueToday)}
          subtitle="From delivered orders"
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-100"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Active Suppliers"
          value={activeSuppliers}
          subtitle="Currently online"
          icon={<Truck className="w-6 h-6 text-orange-600" />}
          iconBg="bg-orange-100"
        />
        <StatCard
          title="Total Users"
          value={totalUsers.toLocaleString('en-IN')}
          subtitle="Registered on platform"
          icon={<Users className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-100"
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* ================================================================== */}
      {/* Live Operations Map Placeholder                                    */}
      {/* ================================================================== */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Live Operations Map</h3>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                Active Orders
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                Suppliers
              </span>
            </div>
          </div>
        </div>
        <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-50 via-gray-50 to-green-50 flex items-center justify-center">
          {/* Map placeholder with decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-8 left-12 w-3 h-3 rounded-full bg-blue-500 animate-ping" />
            <div className="absolute top-20 right-20 w-3 h-3 rounded-full bg-blue-500 animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-16 left-1/3 w-3 h-3 rounded-full bg-blue-500 animate-ping" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/3 left-1/4 w-4 h-4 rounded-sm bg-green-500 animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-sm bg-green-500 animate-pulse" style={{ animationDelay: '0.7s' }} />
            <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-sm bg-green-500 animate-pulse" style={{ animationDelay: '1.3s' }} />
          </div>
          <div className="text-center z-10">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">
              Live map integration will render here
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Google Maps with real-time order pins and supplier truck markers
            </p>
          </div>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Recent Orders & Pending Approvals (two columns on desktop)        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <button
              onClick={() => router.push('/admin/orders')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push('/admin/orders')}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-700">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700 capitalize">
                          {waterTypeLabels[order.waterType] || order.waterType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(order.price.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusBadgeVariant[order.status] || 'info'}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pending Supplier Approvals */}
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Pending Approvals</CardTitle>
              {pendingSuppliers.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingSuppliers.length}
                </span>
              )}
            </div>
            <button
              onClick={() => router.push('/admin/suppliers')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingSuppliers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
                No pending approvals
              </div>
            ) : (
              pendingSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {supplier.userName || 'Unknown Supplier'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {supplier.vehicle.type} - {supplier.vehicle.number || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {supplier.vehicle.capacity}L capacity
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => router.push('/admin/suppliers')}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Review"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {supplier.waterTypes?.map((type) => (
                      <span
                        key={type}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600"
                      >
                        {waterTypeLabels[type] || type}
                      </span>
                    ))}
                    <Badge variant="pending" size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Quick Stats Footer                                                 */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Avg Delivery</span>
          </div>
          <p className="text-lg font-bold text-gray-900">32 min</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">Active Issues</span>
          </div>
          <p className="text-lg font-bold text-gray-900">3</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Success Rate</span>
          </div>
          <p className="text-lg font-bold text-gray-900">94%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Cancellation</span>
          </div>
          <p className="text-lg font-bold text-gray-900">6%</p>
        </div>
      </div>
    </div>
  );
}
