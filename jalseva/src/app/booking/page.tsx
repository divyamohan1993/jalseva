'use client';

import { useState, useEffect, } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  MapPin,
  Phone,
  Star,
  Truck,
  X,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { formatCurrency } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';

// ---------------------------------------------------------------------------
// Searching animation component
// ---------------------------------------------------------------------------

function WaterDropAnimation() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Central water drop */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <Droplets className="w-10 h-10 text-blue-600" />
        </div>
      </motion.div>

      {/* Ripple rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-blue-300"
          initial={{ scale: 0.5, opacity: 0.6 }}
          animate={{
            scale: [0.5, 1.5],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier Found Card
// ---------------------------------------------------------------------------

function SupplierFoundCard({
  order,
  onTrack,
}: {
  order: Order;
  onTrack: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <Card shadow="lg" padding="lg" className="border-green-200">
        {/* Success header */}
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900">
            Supplier Found!
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            सप्लायर मिल गया!
          </p>
        </div>

        {/* Supplier info */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Water Supplier</p>
              <p className="text-sm text-gray-500">
                {order.supplierId ? `ID: ${order.supplierId.slice(0, 8)}...` : 'Assigned'}
              </p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-yellow-700">4.8</span>
            </div>
          </div>

          {/* Order details */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-400">Water Type / पानी</p>
              <p className="text-sm font-medium text-gray-700 capitalize">
                {order.waterType}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Quantity / मात्रा</p>
              <p className="text-sm font-medium text-gray-700">
                {order.quantityLitres}L
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Price / कीमत</p>
              <p className="text-sm font-medium text-gray-700">
                {formatCurrency(order.price.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">ETA / समय</p>
              <p className="text-sm font-medium text-gray-700">
                {order.tracking?.eta
                  ? `${Math.ceil(order.tracking.eta / 60)} min`
                  : 'Calculating...'}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={onTrack}
          className="mt-4 rounded-2xl"
        >
          Track Delivery / डिलीवरी ट्रैक करें
        </Button>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Booking Page
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentOrder, setCurrentOrder, updateOrderStatus } = useOrderStore();

  const [searching, setSearching] = useState(true);
  const [supplierFound, setSupplierFound] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // --- Redirect if no active order or not logged in ---
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/booking');
      return;
    }
  }, [user, router]);

  // --- Poll for order status updates ---
  useEffect(() => {
    if (!currentOrder) {
      // No order - might have just navigated here; check if we should go back
      const timer = setTimeout(() => {
        if (!currentOrder) {
          toast.error('No active booking found.\nकोई बुकिंग नहीं मिली।');
          router.push('/');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (currentOrder.status !== 'searching') {
      setSearching(false);
      setSupplierFound(true);
      return;
    }

    // Poll for updates
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${currentOrder.id}`);
        if (res.ok) {
          const updatedOrder: Order = await res.json();
          setCurrentOrder(updatedOrder);

          if (updatedOrder.status !== 'searching') {
            setSearching(false);
            setSupplierFound(true);
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Silent fail - will retry on next interval
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentOrder, setCurrentOrder, router]);

  // --- Search timer ---
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [searching]);

  // --- Simulate finding a supplier (for demo/dev) ---
  useEffect(() => {
    if (!searching || !currentOrder) return;

    // After 8 seconds, if still searching and in dev, simulate finding
    const timeout = setTimeout(() => {
      if (searching && currentOrder?.status === 'searching') {
        const updated: Order = {
          ...currentOrder,
          status: 'accepted' as OrderStatus,
          supplierId: 'supplier_demo_123',
          acceptedAt: new Date(),
          tracking: {
            supplierLocation: {
              lat: (currentOrder.deliveryLocation?.lat || 28.6) + 0.01,
              lng: (currentOrder.deliveryLocation?.lng || 77.2) + 0.01,
            },
            eta: 900,
            distance: 3200,
          },
        };
        setCurrentOrder(updated);
        setSearching(false);
        setSupplierFound(true);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [searching, currentOrder, setCurrentOrder]);

  // --- Cancel order ---
  const handleCancel = async () => {
    if (!currentOrder) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/cancel`, {
        method: 'POST',
      });

      if (res.ok) {
        updateOrderStatus(currentOrder.id, 'cancelled');
        setCurrentOrder(null);
        toast.success('Order cancelled.\nऑर्डर रद्द हो गया।');
        router.push('/');
      } else {
        toast.error('Could not cancel order.\nऑर्डर रद्द नहीं हो पाया।');
      }
    } catch {
      // Fallback: cancel locally
      setCurrentOrder(null);
      toast.success('Order cancelled.\nऑर्डर रद्द हो गया।');
      router.push('/');
    } finally {
      setCancelling(false);
    }
  };

  // --- Go to tracking ---
  const handleTrack = () => {
    if (currentOrder) {
      router.push(`/tracking/${currentOrder.id}`);
    }
  };

  // --- Format search time ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-water rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">
              {searching ? 'Finding Supplier' : 'Supplier Found'}
            </h1>
          </div>
          {searching && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{formatTime(searchTime)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-6 pb-8 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Animated water drop */}
              <div className="pt-8">
                <WaterDropAnimation />
              </div>

              {/* Status text */}
              <div className="text-center space-y-2">
                <motion.h2
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xl font-bold text-gray-900"
                >
                  Searching for nearest supplier...
                </motion.h2>
                <p className="text-gray-500">
                  निकटतम सप्लायर ढूंढ रहे हैं...
                </p>
                <p className="text-sm text-gray-400 mt-3">
                  This usually takes less than a minute
                </p>
                <p className="text-xs text-gray-400">
                  आमतौर पर एक मिनट से कम समय लगता है
                </p>
              </div>

              {/* Map placeholder */}
              {currentOrder?.deliveryLocation && (
                <Card shadow="sm" className="overflow-hidden">
                  <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center relative">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">
                        Your delivery location
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {currentOrder.deliveryLocation.address ||
                          `${currentOrder.deliveryLocation.lat.toFixed(4)}, ${currentOrder.deliveryLocation.lng.toFixed(4)}`}
                      </p>
                    </div>
                    {/* Scanning radar effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background:
                          'radial-gradient(circle at center, transparent 30%, rgba(0,102,255,0.05) 60%, transparent 70%)',
                      }}
                      animate={{ scale: [0.8, 1.3], opacity: [0.5, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                  </div>
                </Card>
              )}

              {/* Order summary */}
              {currentOrder && (
                <Card shadow="sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Your Order</p>
                      <p className="text-sm font-semibold text-gray-800 capitalize">
                        {currentOrder.waterType} Water -{' '}
                        {currentOrder.quantityLitres}L
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(currentOrder.price.total)}
                    </p>
                  </div>
                </Card>
              )}

              {/* Cancel button */}
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                loading={cancelling}
                onClick={handleCancel}
                leftIcon={<X className="w-5 h-5" />}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                Cancel Order / ऑर्डर रद्द करें
              </Button>
            </motion.div>
          ) : supplierFound && currentOrder ? (
            <motion.div
              key="found"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-4"
            >
              <SupplierFoundCard order={currentOrder} onTrack={handleTrack} />

              {/* Call / Cancel row */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  leftIcon={<Phone className="w-5 h-5" />}
                  onClick={() => {
                    // In production, fetch supplier's phone
                    toast('Calling supplier...\nसप्लायर को कॉल कर रहे हैं...');
                  }}
                >
                  Call / कॉल
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  loading={cancelling}
                  onClick={handleCancel}
                  className="text-red-500 hover:bg-red-50 shrink-0 px-6"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center pt-24"
            >
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
