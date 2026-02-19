'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets,
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  IndianRupee,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  Filter,
  ClipboardList,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import type { Order, OrderStatus, WaterType } from '@/types';

// =============================================================================
// Types & Constants
// =============================================================================

type TabKey = 'active' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  ro: 'RO Purified',
  mineral: 'Mineral Water',
  tanker: 'Water Tanker',
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  searching: { label: 'Searching', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  accepted: { label: 'Accepted', color: 'text-blue-700', bg: 'bg-blue-100' },
  en_route: { label: 'En Route', color: 'text-blue-700', bg: 'bg-blue-100' },
  arriving: { label: 'Arriving', color: 'text-orange-700', bg: 'bg-orange-100' },
  delivered: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100' },
};

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_a1',
    customerId: 'cust_1',
    supplierId: 'sup_1',
    waterType: 'tanker',
    quantityLitres: 5000,
    price: {
      base: 800,
      distance: 150,
      surge: 0,
      total: 950,
      commission: 95,
      supplierEarning: 855,
    },
    status: 'en_route',
    deliveryLocation: {
      lat: 28.6139,
      lng: 77.209,
      address: '42, Sector 15, Vasundhara, Ghaziabad',
    },
    tracking: {
      supplierLocation: { lat: 28.62, lng: 77.21 },
      eta: 600,
      distance: 3200,
    },
    payment: { method: 'upi', status: 'paid', amount: 950 },
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 'ord_a2',
    customerId: 'cust_3',
    supplierId: 'sup_1',
    waterType: 'ro',
    quantityLitres: 2000,
    price: {
      base: 500,
      distance: 80,
      surge: 50,
      total: 630,
      commission: 63,
      supplierEarning: 567,
    },
    status: 'accepted',
    deliveryLocation: {
      lat: 28.5355,
      lng: 77.391,
      address: '78, Lajpat Nagar, New Delhi',
    },
    payment: { method: 'cash', status: 'pending', amount: 630 },
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    acceptedAt: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: 'ord_c1',
    customerId: 'cust_4',
    supplierId: 'sup_1',
    waterType: 'mineral',
    quantityLitres: 1000,
    price: {
      base: 400,
      distance: 60,
      surge: 0,
      total: 460,
      commission: 46,
      supplierEarning: 414,
    },
    status: 'delivered',
    deliveryLocation: {
      lat: 28.459,
      lng: 77.026,
      address: '23, DLF Phase 3, Gurugram',
    },
    payment: { method: 'upi', status: 'paid', amount: 460 },
    createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    acceptedAt: new Date(Date.now() - 3 * 3600 * 1000 + 120000),
    deliveredAt: new Date(Date.now() - 2.5 * 3600 * 1000),
  },
  {
    id: 'ord_c2',
    customerId: 'cust_5',
    supplierId: 'sup_1',
    waterType: 'tanker',
    quantityLitres: 10000,
    price: {
      base: 1500,
      distance: 300,
      surge: 100,
      total: 1900,
      commission: 190,
      supplierEarning: 1710,
    },
    status: 'delivered',
    deliveryLocation: {
      lat: 28.7041,
      lng: 77.1025,
      address: '5, Civil Lines, Delhi',
    },
    payment: { method: 'card', status: 'paid', amount: 1900 },
    createdAt: new Date(Date.now() - 5 * 3600 * 1000),
    acceptedAt: new Date(Date.now() - 5 * 3600 * 1000 + 60000),
    deliveredAt: new Date(Date.now() - 4 * 3600 * 1000),
  },
  {
    id: 'ord_x1',
    customerId: 'cust_6',
    supplierId: 'sup_1',
    waterType: 'ro',
    quantityLitres: 500,
    price: {
      base: 200,
      distance: 40,
      surge: 0,
      total: 240,
      commission: 24,
      supplierEarning: 216,
    },
    status: 'cancelled',
    deliveryLocation: {
      lat: 28.63,
      lng: 77.22,
      address: '10, Nehru Place, New Delhi',
    },
    payment: { method: 'upi', status: 'refunded', amount: 240 },
    createdAt: new Date(Date.now() - 8 * 3600 * 1000),
    cancelledAt: new Date(Date.now() - 7.5 * 3600 * 1000),
  },
];

// =============================================================================
// OrderCard Component
// =============================================================================

function OrderCard({ order, tab }: { order: Order; tab: TabKey }) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[order.status];

  const timeAgo = getTimeAgo(order.createdAt);
  const etaMinutes = order.tracking?.eta
    ? Math.ceil(order.tracking.eta / 60)
    : null;
  const distanceKm = order.tracking?.distance
    ? (order.tracking.distance / 1000).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card padding="md" shadow="sm" className="mb-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Customer #{order.customerId.slice(-4)}
              </p>
              <p className="text-[11px] text-gray-400">{timeAgo}</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              statusCfg.bg,
              statusCfg.color
            )}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Order details */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>{WATER_TYPE_LABELS[order.waterType]}</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            {order.quantityLitres.toLocaleString()}L
          </span>
          {distanceKm && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{distanceKm} km</span>
            </>
          )}
        </div>

        {/* Delivery address */}
        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg mb-3">
          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600 line-clamp-2">
            {order.deliveryLocation.address || 'Customer location'}
          </p>
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between">
          <div>
            {tab === 'completed' ? (
              <div className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4 text-green-600" />
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(order.price.supplierEarning)}
                </span>
                <span className="text-xs text-gray-400 ml-1">earned</span>
              </div>
            ) : tab === 'cancelled' ? (
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-500 font-medium">
                  {order.cancelledAt
                    ? `Cancelled ${getTimeAgo(order.cancelledAt)}`
                    : 'Cancelled'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4 text-gray-600" />
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(order.price.total)}
                </span>
              </div>
            )}
          </div>

          {/* Active order actions */}
          {tab === 'active' && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-gray-200"
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              >
                Call
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
                onClick={() =>
                  router.push(`/supplier/delivery/${order.id}`)
                }
              >
                Navigate
              </Button>
            </div>
          )}

          {tab === 'completed' && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Delivered
            </div>
          )}
        </div>

        {/* ETA for active orders */}
        {tab === 'active' && etaMinutes && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              ETA: {etaMinutes} min
            </div>
            <button
              onClick={() =>
                router.push(`/supplier/delivery/${order.id}`)
              }
              className="text-xs text-green-600 font-semibold flex items-center gap-0.5"
            >
              View details
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// =============================================================================
// Time helper
// =============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// =============================================================================
// Supplier Orders Page
// =============================================================================

export default function SupplierOrdersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  // Filter orders by tab
  const filteredOrders = MOCK_ORDERS.filter((order) => {
    switch (activeTab) {
      case 'active':
        return ['accepted', 'en_route', 'arriving', 'searching'].includes(
          order.status
        );
      case 'completed':
        return order.status === 'delivered';
      case 'cancelled':
        return order.status === 'cancelled';
      default:
        return false;
    }
  });

  // Summary counts
  const counts: Record<TabKey, number> = {
    active: MOCK_ORDERS.filter((o) =>
      ['accepted', 'en_route', 'arriving', 'searching'].includes(o.status)
    ).length,
    completed: MOCK_ORDERS.filter((o) => o.status === 'delivered').length,
    cancelled: MOCK_ORDERS.filter((o) => o.status === 'cancelled').length,
  };

  return (
    <div className="px-4 py-4">
      {/* Page Title */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">My Orders</h1>
        <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* ================================================================ */}
      {/* Tab Bar                                                          */}
      {/* ================================================================ */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 relative py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="supplier-orders-tab"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {tab.label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                  activeTab === tab.key
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-500'
                )}
              >
                {counts[tab.key]}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Orders List                                                      */}
      {/* ================================================================ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
        >
          {filteredOrders.length > 0 ? (
            <div>
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} tab={activeTab} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                {activeTab === 'active' ? (
                  <ClipboardList className="w-7 h-7 text-gray-300" />
                ) : activeTab === 'completed' ? (
                  <CheckCircle2 className="w-7 h-7 text-gray-300" />
                ) : (
                  <XCircle className="w-7 h-7 text-gray-300" />
                )}
              </div>
              <p className="text-gray-500 font-medium">
                No {activeTab} orders
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'active'
                  ? 'New orders will appear here when you are online'
                  : activeTab === 'completed'
                  ? 'Your completed deliveries will show up here'
                  : 'No cancelled orders yet'}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ================================================================ */}
      {/* Today's Summary Footer (for completed tab)                       */}
      {/* ================================================================ */}
      {activeTab === 'completed' && filteredOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Total Earned
              </span>
            </div>
            <span className="text-lg font-bold text-green-700">
              {formatCurrency(
                filteredOrders.reduce(
                  (sum, o) => sum + o.price.supplierEarning,
                  0
                )
              )}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            From {filteredOrders.length} completed order
            {filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </motion.div>
      )}
    </div>
  );
}
