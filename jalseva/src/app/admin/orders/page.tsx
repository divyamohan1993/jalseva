'use client';
export const dynamic = 'force-dynamic';

// =============================================================================
// JalSeva - Order Management Page
// =============================================================================
// Comprehensive order management: table with all orders, filters by status and
// date range, search by order ID, full order details view, cancel and refund.
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  Search,
  Calendar,
  X,
  Package,
  MapPin,
  AlertTriangle,
  Eye,
  XCircle,
  RefreshCcw,
  ChevronDown,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Order, OrderStatus, } from '@/types';

// =============================================================================
// Constants
// =============================================================================

type StatusFilter = 'all' | OrderStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'searching', label: 'Searching' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'en_route', label: 'En Route' },
  { key: 'arriving', label: 'Arriving' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

type DateRange = 'today' | 'week' | 'month' | 'all';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

const waterTypeLabels: Record<string, string> = {
  ro: 'RO Water',
  mineral: 'Mineral',
  tanker: 'Tanker',
};

const paymentMethodLabels: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  wallet: 'Wallet',
  cash: 'Cash',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
};

// =============================================================================
// Order Management Component
// =============================================================================

export default function OrdersPage() {
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Cancel / Refund
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // --------------------------------------------------------------------------
  // Date range calculation
  // --------------------------------------------------------------------------
  const getDateThreshold = (range: DateRange): Date | null => {
    const now = new Date();
    switch (range) {
      case 'today': {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'month': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // Firestore listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orderList: Order[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        orderList.push({
          id: docSnap.id,
          customerId: data.customerId || '',
          supplierId: data.supplierId || undefined,
          waterType: data.waterType || 'ro',
          quantityLitres: data.quantityLitres || 0,
          price: data.price || {
            base: 0, distance: 0, surge: 0, total: 0,
            commission: 0, supplierEarning: 0,
          },
          status: data.status || 'searching',
          deliveryLocation: data.deliveryLocation || { lat: 0, lng: 0 },
          supplierLocation: data.supplierLocation || undefined,
          tracking: data.tracking || undefined,
          payment: data.payment || { method: 'cash', status: 'pending', amount: 0 },
          rating: data.rating || undefined,
          beckn: data.beckn || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          acceptedAt: data.acceptedAt?.toDate?.() || undefined,
          pickedAt: data.pickedAt?.toDate?.() || undefined,
          deliveredAt: data.deliveredAt?.toDate?.() || undefined,
          cancelledAt: data.cancelledAt?.toDate?.() || undefined,
        });
      });

      setOrders(orderList);
      setLoading(false);
    }, (error) => {
      console.error('Error loading orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // Filtering & Search
  // --------------------------------------------------------------------------
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Date range filter
    const threshold = getDateThreshold(dateRange);
    if (threshold) {
      result = result.filter((o) => o.createdAt >= threshold);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerId.toLowerCase().includes(q) ||
          (o.supplierId || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, statusFilter, dateRange, searchQuery, getDateThreshold]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);

    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
      });
      setSelectedOrder({ ...selectedOrder, status: 'cancelled', cancelledAt: new Date() });
      setCancelModalOpen(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);

    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        'payment.status': 'refunded',
      });
      setSelectedOrder({
        ...selectedOrder,
        payment: { ...selectedOrder.payment, status: 'refunded' },
      });
      setRefundModalOpen(false);
    } catch (error) {
      console.error('Error processing refund:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  // --------------------------------------------------------------------------
  // Format helpers
  // --------------------------------------------------------------------------
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all platform orders
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="w-4 h-4" />
          <span>{orders.length} total orders</span>
        </div>
      </div>

      {/* Filters Bar */}
      <Card padding="md">
        <div className="space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.key}
                onClick={() => setStatusFilter(sf.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0',
                  statusFilter === sf.key
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
              >
                {sf.label}
                {statusCounts[sf.key] !== undefined && (
                  <span className="ml-1.5 text-xs opacity-60">
                    {statusCounts[sf.key] || 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Date Range */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by Order ID, Customer ID, Supplier ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4 text-gray-400" />
                {DATE_RANGES.find((d) => d.key === dateRange)?.label}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                  {DATE_RANGES.map((dr) => (
                    <button
                      key={dr.key}
                      onClick={() => {
                        setDateRange(dr.key);
                        setShowDateDropdown(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        dateRange === dr.key
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {dr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Orders Table                                                       */}
      {/* ================================================================== */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Qty</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    {searchQuery ? 'No orders match your search' : 'No orders found'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openOrderDetail(order)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-700">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-600 text-xs font-mono">
                        {order.customerId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-600 text-xs font-mono">
                        {order.supplierId ? `${order.supplierId.slice(0, 8)}...` : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700 capitalize text-xs">
                        {waterTypeLabels[order.waterType] || order.waterType}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {order.quantityLitres}L
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(order.price.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={order.status as any}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openOrderDetail(order)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results count */}
        {!loading && filteredOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        )}
      </Card>

      {/* ================================================================== */}
      {/* Order Detail Modal                                                 */}
      {/* ================================================================== */}
      {detailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDetailOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
                <p className="text-xs font-mono text-gray-400">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge variant={selectedOrder.status as any} size="lg" />
                <span className={cn(
                  'text-xs font-medium px-2 py-1 rounded-lg',
                  paymentStatusColors[selectedOrder.payment.status] || 'bg-gray-100 text-gray-700'
                )}>
                  Payment: {selectedOrder.payment.status}
                </span>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Water Type</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {waterTypeLabels[selectedOrder.waterType] || selectedOrder.waterType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium text-gray-900">
                    {selectedOrder.quantityLitres} litres
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-medium text-gray-900">
                    {paymentMethodLabels[selectedOrder.payment.method] || selectedOrder.payment.method}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Base Price</span>
                    <span className="text-gray-700">{formatCurrency(selectedOrder.price.base)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Distance Charge</span>
                    <span className="text-gray-700">{formatCurrency(selectedOrder.price.distance)}</span>
                  </div>
                  {selectedOrder.price.surge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Surge Charge</span>
                      <span className="text-orange-600">{formatCurrency(selectedOrder.price.surge)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-sm font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{formatCurrency(selectedOrder.price.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 pt-1">
                    <span>Commission ({((selectedOrder.price.commission / selectedOrder.price.total) * 100 || 0).toFixed(0)}%)</span>
                    <span>{formatCurrency(selectedOrder.price.commission)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Supplier Earning</span>
                    <span>{formatCurrency(selectedOrder.price.supplierEarning)}</span>
                  </div>
                </div>
              </div>

              {/* IDs */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Participants</h5>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Customer ID</span>
                    <span className="font-mono text-xs text-gray-700">
                      {selectedOrder.customerId}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Supplier ID</span>
                    <span className="font-mono text-xs text-gray-700">
                      {selectedOrder.supplierId || 'Not assigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Location */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Delivery Location</h5>
                <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    {selectedOrder.deliveryLocation.address ? (
                      <p className="text-sm text-gray-700">
                        {selectedOrder.deliveryLocation.address}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-700 font-mono">
                        {selectedOrder.deliveryLocation.lat.toFixed(6)}, {selectedOrder.deliveryLocation.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h5>
                <div className="space-y-3">
                  <TimelineItem
                    label="Created"
                    time={formatDateTime(selectedOrder.createdAt)}
                    active
                  />
                  {selectedOrder.acceptedAt && (
                    <TimelineItem
                      label="Accepted"
                      time={formatDateTime(selectedOrder.acceptedAt)}
                      active
                    />
                  )}
                  {selectedOrder.pickedAt && (
                    <TimelineItem
                      label="Picked Up"
                      time={formatDateTime(selectedOrder.pickedAt)}
                      active
                    />
                  )}
                  {selectedOrder.deliveredAt && (
                    <TimelineItem
                      label="Delivered"
                      time={formatDateTime(selectedOrder.deliveredAt)}
                      active
                      success
                    />
                  )}
                  {selectedOrder.cancelledAt && (
                    <TimelineItem
                      label="Cancelled"
                      time={formatDateTime(selectedOrder.cancelledAt)}
                      active
                      error
                    />
                  )}
                </div>
              </div>

              {/* Rating */}
              {selectedOrder.rating && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Rating</h5>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    {selectedOrder.rating.customerRating !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Customer Rating</span>
                        <span className="font-medium text-gray-900">
                          {'*'.repeat(selectedOrder.rating.customerRating)} {selectedOrder.rating.customerRating}/5
                        </span>
                      </div>
                    )}
                    {selectedOrder.rating.customerFeedback && (
                      <p className="text-xs text-gray-500 italic">
                        &ldquo;{selectedOrder.rating.customerFeedback}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {selectedOrder.payment.razorpayPaymentId && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Payment Details</h5>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Razorpay Order ID</span>
                      <span className="font-mono text-xs text-gray-700">
                        {selectedOrder.payment.razorpayOrderId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payment ID</span>
                      <span className="font-mono text-xs text-gray-700">
                        {selectedOrder.payment.razorpayPaymentId}
                      </span>
                    </div>
                    {selectedOrder.payment.transactionId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Transaction ID</span>
                        <span className="font-mono text-xs text-gray-700">
                          {selectedOrder.payment.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <Button
                    variant="danger"
                    fullWidth
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => setCancelModalOpen(true)}
                  >
                    Cancel Order
                  </Button>
                )}
                {selectedOrder.payment.status === 'paid' && (
                  <Button
                    variant="outline"
                    fullWidth
                    leftIcon={<RefreshCcw className="w-4 h-4" />}
                    onClick={() => setRefundModalOpen(true)}
                  >
                    Initiate Refund
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Cancel Confirmation Modal                                          */}
      {/* ================================================================== */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50">
            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
            <p className="text-sm text-gray-700">
              Are you sure you want to cancel order{' '}
              <span className="font-mono font-medium">#{selectedOrder?.id.slice(0, 8)}</span>?
              This action cannot be undone. The customer and supplier will be notified.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Order
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={actionLoading}
              onClick={handleCancelOrder}
            >
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* Refund Confirmation Modal                                          */}
      {/* ================================================================== */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title="Initiate Refund"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50">
            <RefreshCcw className="w-8 h-8 text-purple-500 shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                Initiate a full refund of{' '}
                <span className="font-semibold">
                  {formatCurrency(selectedOrder?.price.total || 0)}
                </span>{' '}
                to the customer?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Refund will be processed via {paymentMethodLabels[selectedOrder?.payment.method || 'cash']} within 5-7 business days.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setRefundModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={actionLoading}
              onClick={handleRefundOrder}
            >
              Process Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// =============================================================================
// Timeline Item Sub-component
// =============================================================================

function TimelineItem({
  label,
  time,
  active,
  success,
  error,
}: {
  label: string;
  time: string;
  active?: boolean;
  success?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full shrink-0',
          success
            ? 'bg-green-500'
            : error
            ? 'bg-red-500'
            : active
            ? 'bg-blue-500'
            : 'bg-gray-300'
        )}
      />
      <div className="flex-1 flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-medium',
            success
              ? 'text-green-700'
              : error
              ? 'text-red-700'
              : 'text-gray-700'
          )}
        >
          {label}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
    </div>
  );
}
