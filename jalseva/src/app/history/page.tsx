'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Mountain,
  Truck,
  Star,
  Calendar,
  ChevronRight,
  Package,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  ClipboardList,
  ScrollText,
  User,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { formatCurrency } from '@/lib/utils';
import type { Order, OrderStatus, WaterType } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { key: OrderStatus | 'all'; label: string; hindi: string }[] = [
  { key: 'all', label: 'All', hindi: 'सभी' },
  { key: 'delivered', label: 'Delivered', hindi: 'पहुंचे' },
  { key: 'cancelled', label: 'Cancelled', hindi: 'रद्द' },
  { key: 'searching', label: 'Pending', hindi: 'लंबित' },
];

const WATER_TYPE_ICONS: Record<WaterType, React.ReactNode> = {
  ro: <Droplets className="w-5 h-5 text-blue-500" />,
  mineral: <Mountain className="w-5 h-5 text-cyan-500" />,
  tanker: <Truck className="w-5 h-5 text-indigo-500" />,
};

const WATER_TYPE_LABELS: Record<WaterType, { en: string; hi: string }> = {
  ro: { en: 'RO Water', hi: 'आरओ पानी' },
  mineral: { en: 'Mineral', hi: 'मिनरल' },
  tanker: { en: 'Tanker', hi: 'टैंकर' },
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; icon: React.ReactNode; label: string; hindi: string }
> = {
  searching: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Searching',
    hindi: 'ढूंढ रहे हैं',
  },
  accepted: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: 'Accepted',
    hindi: 'स्वीकार',
  },
  en_route: {
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    icon: <Truck className="w-3.5 h-3.5" />,
    label: 'On the Way',
    hindi: 'रास्ते में',
  },
  arriving: {
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: <Package className="w-3.5 h-3.5" />,
    label: 'Arriving',
    hindi: 'पहुंचने वाला',
  },
  delivered: {
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: 'Delivered',
    hindi: 'पहुंच गया',
  },
  cancelled: {
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Cancelled',
    hindi: 'रद्द',
  },
};

// ---------------------------------------------------------------------------
// Bottom Navigation (shared)
// ---------------------------------------------------------------------------

function BottomNav({ active }: { active: string }) {
  const router = useRouter();

  const navItems = [
    { key: 'home', label: 'Home', hindi: 'होम', icon: Home, path: '/' },
    {
      key: 'booking',
      label: 'Booking',
      hindi: 'बुकिंग',
      icon: ClipboardList,
      path: '/booking',
    },
    {
      key: 'history',
      label: 'History',
      hindi: 'इतिहास',
      icon: ScrollText,
      path: '/history',
    },
    {
      key: 'profile',
      label: 'Profile',
      hindi: 'प्रोफाइल',
      icon: User,
      path: '/profile',
    },
  ];

  return (
    <nav className="bottom-nav shadow-lg">
      {navItems.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon
              className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Order Detail Modal
// ---------------------------------------------------------------------------

function OrderDetailModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  const statusConf = STATUS_CONFIG[order.status];
  const waterLabel = WATER_TYPE_LABELS[order.waterType];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Order Details</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-400 -mt-4 mb-5">ऑर्डर विवरण</p>

        {/* Status badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConf.bg} ${statusConf.color} text-sm font-medium mb-4`}
        >
          {statusConf.icon}
          {statusConf.label} / {statusConf.hindi}
        </div>

        {/* Details grid */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono text-gray-700 text-xs">
              {order.id.slice(0, 12)}...
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Water Type / पानी</span>
            <span className="font-medium text-gray-800">
              {waterLabel.en}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Quantity / मात्रा</span>
            <span className="font-medium text-gray-800">
              {order.quantityLitres}L
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment / भुगतान</span>
            <span className="font-medium text-gray-800 capitalize">
              {order.payment?.method || 'Cash'}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-3" />

          {/* Price breakdown */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Base Price</span>
            <span className="text-gray-700">
              {formatCurrency(order.price.base)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="text-gray-700">
              {formatCurrency(order.price.distance)}
            </span>
          </div>
          {order.price.surge > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600">Surge</span>
              <span className="text-amber-600">
                +{formatCurrency(order.price.surge)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-gray-200">
            <span className="font-bold text-gray-800">Total / कुल</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(order.price.total)}
            </span>
          </div>

          <div className="border-t border-gray-100 pt-3" />

          {/* Timestamps */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Ordered / ऑर्डर</span>
            <span className="text-gray-700">
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
          {order.deliveredAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivered / पहुंचा</span>
              <span className="text-gray-700">
                {new Date(order.deliveredAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}

          {/* Rating */}
          {order.rating?.customerRating && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-500">Your Rating / रेटिंग</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= (order.rating?.customerRating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Delivery address */}
          {order.deliveryLocation?.address && (
            <>
              <div className="border-t border-gray-100 pt-3" />
              <div>
                <p className="text-sm text-gray-500 mb-1">
                  Delivery Address / पता
                </p>
                <p className="text-sm text-gray-800">
                  {order.deliveryLocation.address}
                </p>
              </div>
            </>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onClose}
          className="mt-6 rounded-2xl"
        >
          Close / बंद करें
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Order Card Component
// ---------------------------------------------------------------------------

function OrderCard({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const statusConf = STATUS_CONFIG[order.status];
  const waterLabel = WATER_TYPE_LABELS[order.waterType];
  const waterIcon = WATER_TYPE_ICONS[order.waterType];

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card hover shadow="sm" className="cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-3">
          {/* Water type icon */}
          <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
            {waterIcon}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {waterLabel.en} - {order.quantityLitres}L
                </p>
                <p className="text-xs text-gray-400">
                  {waterLabel.hi} - {order.quantityLitres} लीटर
                </p>
              </div>
              <p className="font-bold text-gray-900 text-sm shrink-0">
                {formatCurrency(order.price.total)}
              </p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {/* Status badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.bg} ${statusConf.color}`}
                >
                  {statusConf.icon}
                  {statusConf.label}
                </span>

                {/* Rating */}
                {order.rating?.customerRating && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    {order.rating.customerRating}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {dateStr}
              </div>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 self-center" />
        </div>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main History Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { orders, setOrders } = useOrderStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // --- Redirect if not logged in ---
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/history');
      return;
    }
  }, [user, router]);

  // --- Fetch orders ---
  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const param = user.role === 'supplier' ? 'supplierId' : 'customerId';
        const res = await fetch(`/api/orders?${param}=${encodeURIComponent(user.id)}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || data || []);
        }
      } catch {
        // Use existing orders from store
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, setOrders]
  );

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  // --- Filtered orders ---
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  // --- Handle order click ---
  const handleOrderClick = (order: Order) => {
    // If order is active (searching/accepted/en_route/arriving), go to tracking
    if (['searching', 'accepted', 'en_route', 'arriving'].includes(order.status)) {
      router.push(
        order.status === 'searching'
          ? '/booking'
          : `/tracking/${order.id}`
      );
      return;
    }
    // Otherwise show detail modal
    setSelectedOrder(order);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-water rounded-lg flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Order History
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                ऑर्डर इतिहास
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="p-2 rounded-xl hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[40px] ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              <span className="text-[10px] ml-1 opacity-70">
                {filter.hindi}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <main className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          // Skeleton loaders
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 skeleton rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton w-3/4 rounded" />
                    <div className="h-3 skeleton w-1/2 rounded" />
                    <div className="flex gap-2">
                      <div className="h-5 skeleton w-20 rounded-full" />
                      <div className="h-5 skeleton w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-16"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ScrollText className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">
              अभी तक कोई ऑर्डर नहीं
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/')}
              className="mt-6"
            >
              Order Water / पानी ऑर्डर करें
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <OrderCard
                  order={order}
                  onClick={() => handleOrderClick(order)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Count summary */}
        {!loading && filteredOrders.length > 0 && (
          <p className="text-center text-xs text-gray-400 pt-4 pb-2">
            {filteredOrders.length}{' '}
            {filteredOrders.length === 1 ? 'order' : 'orders'} /{' '}
            {filteredOrders.length} ऑर्डर
          </p>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav active="history" />

      {/* Order Detail Modal */}
      <AnimatePresence>
        <OrderDetailModal
          order={selectedOrder}
          isOpen={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedOrder(null);
          }}
        />
      </AnimatePresence>
    </div>
  );
}
