'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Navigation,
  Phone,
  MessageSquare,
  MapPin,
  Droplets,
  CheckCircle2,
  Camera,
  X,
  Clock,
  User,
  ExternalLink,
  Flag,
  PackageCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import type { Order, WaterType, OrderStatus } from '@/types';

// =============================================================================
// Constants
// =============================================================================

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  ro: 'RO Purified',
  mineral: 'Mineral Water',
  tanker: 'Water Tanker',
};

type DeliveryStatus = 'navigate' | 'arrived' | 'delivered';

const DELIVERY_STEPS: { key: DeliveryStatus; label: string; icon: typeof Navigation }[] = [
  { key: 'navigate', label: 'Navigate', icon: Navigation },
  { key: 'arrived', label: 'Arrived', icon: Flag },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
];

// Map order status -> UI delivery step
function statusToStep(status: OrderStatus | undefined): DeliveryStatus {
  if (status === 'arriving') return 'arrived';
  if (status === 'delivered') return 'delivered';
  return 'navigate';
}

// =============================================================================
// Navigation Info Bar
// =============================================================================

function NavigationInfoBar({ eta, distance }: { eta: number | null; distance: number | null }) {
  const etaMinutes = eta ? Math.ceil(eta / 60) : null;
  const distanceKm = distance != null ? (distance / 1000).toFixed(1) : null;

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
      {etaMinutes != null && (
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-400">ETA</p>
              <p className="text-lg font-bold text-gray-900">{etaMinutes} min</p>
            </div>
          </div>
        </div>
      )}
      {distanceKm != null && (
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-400">Distance</p>
              <p className="text-lg font-bold text-gray-900">{distanceKm} km</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Delivery Status Stepper
// =============================================================================

function DeliveryStatusStepper({ currentStatus }: { currentStatus: DeliveryStatus }) {
  const currentIndex = DELIVERY_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center justify-between px-2">
      {DELIVERY_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-green-100 text-green-600 ring-2 ring-green-400 ring-offset-2'
                      : 'bg-gray-100 text-gray-400'
                )}
                animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isCurrent
                    ? 'text-green-600 font-semibold'
                    : isCompleted
                      ? 'text-green-500'
                      : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>

            {i < DELIVERY_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-500',
                  i < currentIndex ? 'bg-green-400' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// =============================================================================
// Photo Upload for Delivery Proof
// =============================================================================

function DeliveryPhotoUpload({
  photo,
  onUpload,
  onRemove,
}: {
  photo: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        id="delivery-photo"
      />

      {photo ? (
        <div className="relative">
          <div className="h-32 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-green-600">
              <CheckCircle2 className="w-8 h-8" />
              <span className="text-xs font-medium">Photo captured</span>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="delivery-photo"
          className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-green-400 transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">Take delivery photo</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Required for delivery confirmation</p>
        </label>
      )}
    </div>
  );
}

// =============================================================================
// Active Delivery Page (Live)
// =============================================================================

export default function ActiveDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const user = useAuthStore((s) => s.user);
  const { activeOrder, setActiveOrder } = useSupplierStore();

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  const [order, setOrder] = useState<Order | null>(activeOrder?.id === orderId ? activeOrder : null);
  const [loadingOrder, setLoadingOrder] = useState(!order);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [showDeliveredSuccess, setShowDeliveredSuccess] = useState(false);

  const deliveryStatus = statusToStep(order?.status);

  // GPS broadcast state
  const watchIdRef = useRef<number | null>(null);
  const lastBroadcastAt = useRef<number>(0);
  const [gpsState, setGpsState] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const [lastBroadcastMs, setLastBroadcastMs] = useState<number>(0);

  // --------------------------------------------------------------------------
  // Fetch order on mount if not in store
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (order && order.id === orderId) return;
    if (!orderId) return;

    let cancelled = false;
    setLoadingOrder(true);
    setOrderError(null);

    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`Failed to load order (${res.status})`);
        }
        const data: Order = await res.json();
        if (!cancelled) {
          setOrder(data);
          setActiveOrder(data);
        }
      } catch (err) {
        if (!cancelled) {
          setOrderError(err instanceof Error ? err.message : 'Failed to load order');
        }
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Keep local order in sync with store-driven realtime updates from useSupplier hook
  useEffect(() => {
    if (activeOrder && activeOrder.id === orderId) {
      setOrder(activeOrder);
    }
  }, [activeOrder, orderId]);

  // --------------------------------------------------------------------------
  // GPS broadcast: navigator.geolocation.watchPosition → POST /api/tracking
  // --------------------------------------------------------------------------
  const broadcastLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!order || !user) return;
      try {
        const res = await fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            supplierId: user.id,
            location: { lat, lng },
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          console.warn('[supplier-delivery] tracking POST failed:', res.status, detail);
        } else {
          setLastBroadcastMs(Date.now());
        }
      } catch (err) {
        console.warn('[supplier-delivery] tracking POST error:', err);
      }
    },
    [order, user]
  );

  useEffect(() => {
    // Only broadcast while delivery is active
    if (!order || !user) return;
    const trackableStatuses: OrderStatus[] = ['accepted', 'en_route', 'arriving'];
    if (!trackableStatuses.includes(order.status)) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsState('error');
      return;
    }

    setGpsState('requesting');

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState('active');
        const now = Date.now();
        // Throttle to once every 5s; coalescer further reduces Firestore writes
        if (now - lastBroadcastAt.current < 5000) return;
        lastBroadcastAt.current = now;
        broadcastLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('[supplier-delivery] geolocation error:', err);
        setGpsState('error');
        toast.error(`Location unavailable: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [order, user, broadcastLocation]);

  // --------------------------------------------------------------------------
  // Status update helpers (PUT /api/orders/:id with status transition)
  // --------------------------------------------------------------------------
  const updateOrderStatus = useCallback(
    async (next: OrderStatus): Promise<boolean> => {
      if (!order) return false;
      setIsStatusUpdating(true);
      try {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(detail || `update failed (${res.status})`);
        }
        const updated: Order = await res.json().catch(() => ({
          ...order,
          status: next,
        }));
        setOrder(updated);
        setActiveOrder(updated);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Status update failed');
        return false;
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [order, setActiveOrder]
  );

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  const handleStartNavigation = async () => {
    if (!order) return;
    // Bump to en_route on first navigation start
    if (order.status === 'accepted') {
      await updateOrderStatus('en_route');
    }
    const dest = order.deliveryLocation;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleCallCustomer = () => {
    // We don't currently denormalise customer phone onto the order; the
    // supplier can use in-app messaging or the customer can reach out.
    toast('Customer phone is hidden by privacy; use in-app chat.');
  };

  const handleMarkArrived = async () => {
    await updateOrderStatus('arriving');
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setDeliveryPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMarkDelivered = async () => {
    const ok = await updateOrderStatus('delivered');
    if (!ok) return;
    setShowDeliveredSuccess(true);
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTimeout(() => {
      setActiveOrder(null);
      router.replace('/supplier');
    }, 3000);
  };

  const handleGoBack = () => router.back();

  // --------------------------------------------------------------------------
  // Loading / error states
  // --------------------------------------------------------------------------
  if (loadingOrder) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-gray-500">Loading order…</p>
        </div>
      </div>
    );
  }

  if (orderError || !order) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white px-6">
        <div className="text-center space-y-3 max-w-sm">
          <X className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-base font-semibold text-gray-900">
            {orderError || 'Order not found'}
          </p>
          <Button variant="primary" onClick={() => router.replace('/supplier')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Delivered success overlay
  // --------------------------------------------------------------------------
  if (showDeliveredSuccess) {
    return (
      <div className="fixed inset-0 z-[100] bg-green-600 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center text-center text-white px-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle2 className="w-24 h-24 mb-6" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold mb-2"
          >
            Delivered!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-green-100 text-lg mb-4"
          >
            Order #{orderId.slice(-6)} completed
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-white/20 rounded-xl px-6 py-3"
          >
            <p className="text-sm text-green-100">You earned</p>
            <p className="text-3xl font-bold">
              {formatCurrency(order.price.supplierEarning)}
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-green-200 text-sm mt-6"
          >
            Redirecting to dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4">
        <button
          onClick={handleGoBack}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              gpsState === 'active'
                ? 'bg-green-500 animate-pulse'
                : gpsState === 'error'
                  ? 'bg-red-500'
                  : 'bg-yellow-500 animate-pulse'
            )}
          />
          <span className="text-sm font-semibold text-gray-900">
            {gpsState === 'active'
              ? `GPS live${lastBroadcastMs ? ` · ${Math.max(0, Math.round((Date.now() - lastBroadcastMs) / 1000))}s ago` : ''}`
              : gpsState === 'error'
                ? 'GPS denied'
                : gpsState === 'requesting'
                  ? 'GPS requesting…'
                  : 'GPS idle'}
          </span>
        </div>

        <button
          onClick={handleCallCustomer}
          className="w-10 h-10 rounded-full bg-green-500 shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
          aria-label="Contact customer"
        >
          <Phone className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Map area placeholder (deep-link to Google Maps) */}
      <div className="flex-1 relative bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
        {deliveryStatus === 'navigate' && (
          <NavigationInfoBar
            eta={order.tracking?.eta ?? null}
            distance={order.tracking?.distance ?? null}
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Navigation className="w-12 h-12 text-green-500" />
              </motion.div>
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent" />
              <div className="absolute top-36 left-1/2 -translate-x-1/2">
                <MapPin className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-500 mt-20">
              Open turn-by-turn navigation
            </span>
          </div>
        </div>

        {deliveryStatus === 'navigate' && (
          <button
            onClick={handleStartNavigation}
            className="absolute bottom-4 right-4 z-10 bg-blue-600 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-semibold">Open in Maps</span>
          </button>
        )}
      </div>

      {/* Bottom Sheet */}
      <motion.div className="bg-white rounded-t-3xl shadow-xl border-t border-gray-100 z-30">
        <div className="w-full flex justify-center py-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pb-6 max-h-[55vh] overflow-y-auto">
          {/* Stepper */}
          <div className="mb-4">
            <DeliveryStatusStepper currentStatus={deliveryStatus} />
          </div>

          {/* Customer summary */}
          <Card padding="md" shadow="sm" className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Customer</p>
                  <p className="text-xs text-gray-400 font-mono">
                    #{order.customerId.slice(0, 10)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCallCustomer}
                  className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Call customer"
                >
                  <Phone className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={handleCallCustomer}
                  className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Message customer"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </Card>

          {/* Address */}
          <Card padding="md" shadow="sm" className="mb-3">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.deliveryLocation.address ||
                    `${order.deliveryLocation.lat.toFixed(5)}, ${order.deliveryLocation.lng.toFixed(5)}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Drop coordinates broadcast live
                </p>
              </div>
            </div>
          </Card>

          {/* Order details */}
          <Card padding="md" shadow="sm" className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {WATER_TYPE_LABELS[order.waterType]}
                  </p>
                  <p className="text-xs text-gray-400">
                    {order.quantityLitres.toLocaleString()} Litres
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(order.price.supplierEarning)}
                </p>
                <p className="text-[10px] text-gray-400">Your earning</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
              <span>Total: {formatCurrency(order.price.total)}</span>
              <span>Payment: {order.payment.method.toUpperCase()}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full font-medium',
                  order.payment.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                )}
              >
                {order.payment.status === 'paid' ? 'Paid' : 'COD'}
              </span>
            </div>
          </Card>

          {/* Action area */}
          {deliveryStatus === 'navigate' && (
            <div className="space-y-3">
              <Button
                variant="secondary"
                size="xl"
                fullWidth
                onClick={handleStartNavigation}
                leftIcon={<Navigation className="w-6 h-6" />}
                loading={isStatusUpdating}
                className="text-lg"
              >
                Start Navigation
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleMarkArrived}
                loading={isStatusUpdating}
                leftIcon={<Flag className="w-5 h-5" />}
              >
                I Have Arrived
              </Button>
            </div>
          )}

          {deliveryStatus === 'arrived' && (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start gap-2">
                <Flag className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    You have arrived at the delivery location
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    Take a photo of the delivery and confirm completion
                  </p>
                </div>
              </div>

              <DeliveryPhotoUpload
                photo={deliveryPhoto}
                onUpload={handlePhotoUpload}
                onRemove={() => setDeliveryPhoto(null)}
              />

              <Button
                variant="secondary"
                size="xl"
                fullWidth
                onClick={handleMarkDelivered}
                disabled={!deliveryPhoto}
                loading={isStatusUpdating}
                leftIcon={!isStatusUpdating ? <PackageCheck className="w-6 h-6" /> : undefined}
                className="text-lg"
              >
                Mark as Delivered
              </Button>

              {!deliveryPhoto && (
                <p className="text-center text-xs text-gray-400">
                  Please take a delivery photo to confirm
                </p>
              )}
            </div>
          )}

          {deliveryStatus === 'delivered' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">Delivery Confirmed!</p>
              <p className="text-sm text-gray-500 mt-1">Redirecting to dashboard...</p>
            </div>
          )}
        </div>

        <div className="h-safe-area-inset-bottom bg-white" />
      </motion.div>
    </div>
  );
}
