'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IndianRupee,
  ClipboardList,
  Star,
  Clock,
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  XCircle,
  Droplets,
  TrendingUp,
  ChevronRight,
  User,
  Truck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import { useSupplierStore } from '@/store/supplierStore';
import type { Order, WaterType } from '@/types';

// =============================================================================
// Constants & Helpers
// =============================================================================

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  ro: 'RO Purified',
  mineral: 'Mineral Water',
  tanker: 'Water Tanker',
};

const ORDER_COUNTDOWN_SECONDS = 30;

// =============================================================================
// Mock data for demo (replace with real API calls in production)
// =============================================================================

const MOCK_INCOMING_ORDERS: Order[] = [
  {
    id: 'ord_inc_1',
    customerId: 'cust_1',
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
    status: 'searching',
    deliveryLocation: {
      lat: 28.6139,
      lng: 77.209,
      address: '42, Sector 15, Vasundhara, Ghaziabad',
    },
    payment: { method: 'upi', status: 'pending', amount: 950 },
    createdAt: new Date(),
  },
];

const MOCK_ACTIVE_ORDER: Order = {
  id: 'ord_active_1',
  customerId: 'cust_2',
  supplierId: 'sup_1',
  waterType: 'ro',
  quantityLitres: 2000,
  price: {
    base: 500,
    distance: 100,
    surge: 50,
    total: 650,
    commission: 65,
    supplierEarning: 585,
  },
  status: 'en_route',
  deliveryLocation: {
    lat: 28.5355,
    lng: 77.391,
    address: '12, Green Park, New Delhi',
  },
  tracking: {
    supplierLocation: { lat: 28.54, lng: 77.38 },
    eta: 480,
    distance: 2400,
  },
  payment: { method: 'upi', status: 'paid', amount: 650 },
  createdAt: new Date(Date.now() - 15 * 60 * 1000),
  acceptedAt: new Date(Date.now() - 12 * 60 * 1000),
};

// =============================================================================
// IncomingOrderCard component
// =============================================================================

interface IncomingOrderCardProps {
  order: Order;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
}

function IncomingOrderCard({ order, onAccept, onReject }: IncomingOrderCardProps) {
  const [countdown, setCountdown] = useState(ORDER_COUNTDOWN_SECONDS);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      setIsExpired(true);
      onReject(order.id);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, order.id, onReject]);

  const progressPercent = (countdown / ORDER_COUNTDOWN_SECONDS) * 100;

  if (isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      className="relative overflow-hidden"
    >
      <Card padding="none" shadow="lg" className="border-green-200 border-2">
        {/* Countdown Progress Bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <motion.div
            className={cn(
              'h-full transition-colors duration-500',
              countdown > 15
                ? 'bg-green-500'
                : countdown > 7
                ? 'bg-yellow-500'
                : 'bg-red-500'
            )}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </div>

        <div className="p-4">
          {/* Timer Badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              New Order Request
            </span>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                countdown > 15
                  ? 'bg-green-100 text-green-700'
                  : countdown > 7
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              )}
            >
              <Clock className="w-3 h-3" />
              {countdown}s
            </div>
          </div>

          {/* Order Details */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-gray-900">
                  {WATER_TYPE_LABELS[order.waterType]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {order.quantityLitres.toLocaleString()}L
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(order.price.supplierEarning)}
              </p>
              <p className="text-xs text-gray-400">Your earning</p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-700">
                {order.deliveryLocation.address || 'Unknown location'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                ~{order.tracking?.distance
                  ? `${(order.tracking.distance / 1000).toFixed(1)} km`
                  : '2.5 km'}{' '}
                away
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => onReject(order.id)}
              leftIcon={<XCircle className="w-5 h-5" />}
              className="flex-1"
            >
              Reject
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => onAccept(order.id)}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              className="flex-1"
            >
              Accept
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// ActiveDeliveryCard component
// =============================================================================

interface ActiveDeliveryCardProps {
  order: Order;
}

function ActiveDeliveryCard({ order }: ActiveDeliveryCardProps) {
  const router = useRouter();

  const etaMinutes = order.tracking?.eta
    ? Math.ceil(order.tracking.eta / 60)
    : null;

  const distanceKm = order.tracking?.distance
    ? (order.tracking.distance / 1000).toFixed(1)
    : null;

  return (
    <Card padding="none" shadow="md" className="border-blue-200 border">
      {/* Mini Map Placeholder */}
      <div className="relative h-36 bg-gradient-to-br from-blue-50 to-green-50 rounded-t-2xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Navigation className="w-8 h-8 text-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500">
              Live tracking active
            </span>
          </div>
        </div>
        {/* ETA Badge */}
        {etaMinutes && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
            <p className="text-sm font-bold text-gray-900">
              ETA: {etaMinutes} min
            </p>
          </div>
        )}
        {/* Distance Badge */}
        {distanceKm && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              {distanceKm} km
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Customer & Order Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Customer</p>
              <p className="text-xs text-gray-500">
                {WATER_TYPE_LABELS[order.waterType]} &middot;{' '}
                {order.quantityLitres.toLocaleString()}L
              </p>
            </div>
          </div>
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
              order.status === 'en_route'
                ? 'bg-blue-100 text-blue-700'
                : order.status === 'arriving'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            )}
          >
            {order.status === 'en_route'
              ? 'En Route'
              : order.status === 'arriving'
              ? 'Arriving'
              : order.status}
          </span>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
          <MapPin className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">
            {order.deliveryLocation.address || 'Customer location'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="md"
            leftIcon={<Phone className="w-4 h-4" />}
            className="flex-1 border border-gray-200"
            onClick={() => {
              // In production: initiate call to customer
            }}
          >
            Call
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<Navigation className="w-4 h-4" />}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            className="flex-[2]"
            onClick={() => router.push(`/supplier/delivery/${order.id}`)}
          >
            Navigate
          </Button>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// StatCard component
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <Card hover padding="md" className="flex-1 min-w-0">
      <div className="flex items-start justify-between mb-2">
        <div
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            color
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {subtext && (
        <p className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />
          {subtext}
        </p>
      )}
    </Card>
  );
}

// =============================================================================
// Supplier Dashboard Page
// =============================================================================

export default function SupplierDashboard() {
  const router = useRouter();
  const { isOnline, todayEarnings, pendingOrders, activeOrder, supplier } =
    useSupplierStore();
  const { removePendingOrder, setActiveOrder, setPendingOrders } =
    useSupplierStore();

  // Demo state - in production these come from the store / API
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [demoActiveOrder, setDemoActiveOrder] = useState<Order | null>(null);
  const [stats] = useState({
    todayEarnings: todayEarnings || 2450,
    todayOrders: 7,
    rating: supplier?.rating.average ?? 4.6,
    pendingCount: 2,
  });

  // Load demo incoming orders when online
  useEffect(() => {
    if (isOnline && pendingOrders.length === 0 && incomingOrders.length === 0) {
      // Simulate incoming order after 1 second when going online
      const timer = setTimeout(() => {
        setIncomingOrders(MOCK_INCOMING_ORDERS);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setIncomingOrders([]);
    }
  }, [isOnline, pendingOrders.length, incomingOrders.length]);

  // Use store active order or demo
  const currentActiveOrder = activeOrder || demoActiveOrder;

  // --------------------------------------------------------------------------
  // Order accept / reject handlers
  // --------------------------------------------------------------------------
  const handleAcceptOrder = useCallback(
    (orderId: string) => {
      const order = incomingOrders.find((o) => o.id === orderId);
      if (order) {
        const acceptedOrder: Order = {
          ...order,
          status: 'en_route',
          acceptedAt: new Date(),
          supplierId: supplier?.id || 'sup_1',
          tracking: {
            supplierLocation: supplier?.currentLocation || {
              lat: 28.54,
              lng: 77.38,
            },
            eta: 600,
            distance: 3200,
          },
        };
        setActiveOrder(acceptedOrder);
        setDemoActiveOrder(acceptedOrder);
        setIncomingOrders((prev) => prev.filter((o) => o.id !== orderId));
        removePendingOrder(orderId);
      }
    },
    [incomingOrders, supplier, setActiveOrder, removePendingOrder]
  );

  const handleRejectOrder = useCallback(
    (orderId: string) => {
      setIncomingOrders((prev) => prev.filter((o) => o.id !== orderId));
      removePendingOrder(orderId);
    },
    [removePendingOrder]
  );

  // Combine store pending orders and demo orders
  const allIncomingOrders =
    pendingOrders.length > 0 ? pendingOrders : incomingOrders;

  // --------------------------------------------------------------------------
  // Current area (from supplier profile or geolocation)
  // --------------------------------------------------------------------------
  const currentArea =
    supplier?.serviceArea?.center?.address || 'Vasundhara, Ghaziabad';

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ================================================================ */}
      {/* Stats Grid                                                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<IndianRupee className="w-4 h-4 text-green-600" />}
          label="Today's Earnings"
          value={formatCurrency(stats.todayEarnings)}
          subtext="+18% vs yesterday"
          color="bg-green-100"
        />
        <StatCard
          icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
          label="Today's Orders"
          value={String(stats.todayOrders)}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Star className="w-4 h-4 text-yellow-600" />}
          label="Rating"
          value={stats.rating.toFixed(1)}
          color="bg-yellow-100"
        />
        <StatCard
          icon={<Clock className="w-4 h-4 text-purple-600" />}
          label="Pending"
          value={String(allIncomingOrders.length + (currentActiveOrder ? 1 : 0))}
          color="bg-purple-100"
        />
      </div>

      {/* ================================================================ */}
      {/* Current Area                                                     */}
      {/* ================================================================ */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm">
        <MapPin className="w-4 h-4 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium">Current Area</p>
          <p className="text-sm text-gray-800 font-semibold truncate">
            {currentArea}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>

      {/* ================================================================ */}
      {/* Offline Banner                                                   */}
      {/* ================================================================ */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-100 rounded-xl p-4 flex flex-col items-center text-center gap-2"
        >
          <Truck className="w-10 h-10 text-gray-300" />
          <p className="text-gray-500 font-medium text-sm">You are offline</p>
          <p className="text-gray-400 text-xs">
            Go online to start receiving order requests
          </p>
        </motion.div>
      )}

      {/* ================================================================ */}
      {/* Incoming Orders                                                  */}
      {/* ================================================================ */}
      {isOnline && allIncomingOrders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Incoming Orders
            </h2>
            <span className="ml-auto text-xs text-gray-400">
              {allIncomingOrders.length} request
              {allIncomingOrders.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {allIncomingOrders.map((order) => (
                <IncomingOrderCard
                  key={order.id}
                  order={order}
                  onAccept={handleAcceptOrder}
                  onReject={handleRejectOrder}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* Active Delivery                                                  */}
      {/* ================================================================ */}
      {currentActiveOrder && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Active Delivery
            </h2>
          </div>
          <ActiveDeliveryCard order={currentActiveOrder} />
        </section>
      )}

      {/* ================================================================ */}
      {/* Empty state when online but no orders                            */}
      {/* ================================================================ */}
      {isOnline &&
        allIncomingOrders.length === 0 &&
        !currentActiveOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center text-center py-8 gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <Droplets className="w-8 h-8 text-green-300" />
            </div>
            <p className="text-gray-500 font-medium">Waiting for orders...</p>
            <p className="text-gray-400 text-xs max-w-[240px]">
              You will receive order requests from customers in your service area
            </p>
          </motion.div>
        )}
    </div>
  );
}
