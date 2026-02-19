'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Navigation,
  Phone,
  MessageSquare,
  MapPin,
  Droplets,
  CheckCircle2,
  Circle,
  Camera,
  Upload,
  X,
  Clock,
  User,
  ChevronUp,
  Shield,
  ExternalLink,
  Truck,
  Flag,
  PackageCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatCurrency } from '@/lib/utils';
import { useSupplierStore } from '@/store/supplierStore';
import type { Order, WaterType } from '@/types';

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

// =============================================================================
// Mock Data (replaced by real data from store/API in production)
// =============================================================================

const MOCK_ORDER: Order = {
  id: 'ord_active_1',
  customerId: 'cust_2',
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
    address: '42, Sector 15, Vasundhara, Ghaziabad, UP 201012',
  },
  tracking: {
    supplierLocation: { lat: 28.62, lng: 77.21 },
    eta: 480,
    distance: 3200,
  },
  payment: { method: 'upi', status: 'paid', amount: 950 },
  createdAt: new Date(Date.now() - 20 * 60 * 1000),
  acceptedAt: new Date(Date.now() - 15 * 60 * 1000),
};

const MOCK_CUSTOMER = {
  name: 'Amit Sharma',
  phone: '+91 98765 43210',
  address: '42, Sector 15, Vasundhara, Ghaziabad, UP 201012',
  landmark: 'Near Water Tank, Gate No. 3',
};

// =============================================================================
// Navigation Info Bar
// =============================================================================

function NavigationInfoBar({
  eta,
  distance,
}: {
  eta: number | null;
  distance: number | null;
}) {
  const etaMinutes = eta ? Math.ceil(eta / 60) : null;
  const distanceKm = distance ? (distance / 1000).toFixed(1) : null;

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
      {etaMinutes && (
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-400">ETA</p>
              <p className="text-lg font-bold text-gray-900">
                {etaMinutes} min
              </p>
            </div>
          </div>
        </div>
      )}
      {distanceKm && (
        <div className="flex-1 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-400">Distance</p>
              <p className="text-lg font-bold text-gray-900">
                {distanceKm} km
              </p>
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

function DeliveryStatusStepper({
  currentStatus,
}: {
  currentStatus: DeliveryStatus;
}) {
  const currentIndex = DELIVERY_STEPS.findIndex(
    (s) => s.key === currentStatus
  );

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
                animate={
                  isCurrent
                    ? { scale: [1, 1.08, 1] }
                    : { scale: 1 }
                }
                transition={
                  isCurrent
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : {}
                }
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
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

            {/* Connector */}
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
          <p className="text-sm font-medium text-gray-600">
            Take delivery photo
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Required for delivery confirmation
          </p>
        </label>
      )}
    </div>
  );
}

// =============================================================================
// Active Delivery Page
// =============================================================================

export default function ActiveDeliveryPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const { activeOrder, setActiveOrder } = useSupplierStore();

  // Use store order or mock
  const order = activeOrder?.id === orderId ? activeOrder : MOCK_ORDER;

  // --------------------------------------------------------------------------
  // Local State
  // --------------------------------------------------------------------------
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('navigate');
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(true);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [showDeliveredSuccess, setShowDeliveredSuccess] = useState(false);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  const handleStartNavigation = () => {
    // Open Google Maps with directions
    const dest = order.deliveryLocation;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleCallCustomer = () => {
    window.open(`tel:${MOCK_CUSTOMER.phone}`, '_self');
  };

  const handleMarkArrived = () => {
    setDeliveryStatus('arrived');
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setDeliveryPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleMarkDelivered = async () => {
    setIsConfirmingDelivery(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setDeliveryStatus('delivered');
    setIsConfirmingDelivery(false);
    setShowDeliveredSuccess(true);

    // Clear active order and navigate back after success animation
    setTimeout(() => {
      setActiveOrder(null);
      router.replace('/supplier');
    }, 3000);
  };

  const handleGoBack = () => {
    router.back();
  };

  const etaMinutes = order.tracking?.eta
    ? Math.ceil(order.tracking.eta / 60)
    : null;
  const distanceKm = order.tracking?.distance
    ? (order.tracking.distance / 1000).toFixed(1)
    : null;

  // --------------------------------------------------------------------------
  // Delivered Success Overlay
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
      {/* ================================================================ */}
      {/* Top Bar                                                          */}
      {/* ================================================================ */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4">
        <button
          onClick={handleGoBack}
          className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              deliveryStatus === 'delivered' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
            )}
          />
          <span className="text-sm font-semibold text-gray-900">
            {deliveryStatus === 'navigate'
              ? 'Navigating'
              : deliveryStatus === 'arrived'
              ? 'At Location'
              : 'Delivered'}
          </span>
        </div>

        <button
          onClick={handleCallCustomer}
          className="w-10 h-10 rounded-full bg-green-500 shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
        >
          <Phone className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* ================================================================ */}
      {/* Map Area (placeholder)                                           */}
      {/* ================================================================ */}
      <div className="flex-1 relative bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
        {/* Navigation Info Overlay */}
        {deliveryStatus === 'navigate' && (
          <NavigationInfoBar
            eta={order.tracking?.eta || null}
            distance={order.tracking?.distance || null}
          />
        )}

        {/* Map placeholder content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Navigation className="w-12 h-12 text-green-500" />
              </motion.div>
              {/* Simulated route line */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-0.5 h-20 bg-gradient-to-b from-green-400 to-transparent" />
              <div className="absolute top-36 left-1/2 -translate-x-1/2">
                <MapPin className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-500 mt-20">
              Live map with route
            </span>
          </div>
        </div>

        {/* Open in Google Maps FAB */}
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

      {/* ================================================================ */}
      {/* Bottom Sheet                                                     */}
      {/* ================================================================ */}
      <motion.div
        className="bg-white rounded-t-3xl shadow-xl border-t border-gray-100 z-30"
        initial={{ y: 0 }}
        animate={{ y: 0 }}
      >
        {/* Drag Handle */}
        <button
          onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
          className="w-full flex justify-center py-2"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </button>

        <div className="px-4 pb-6 max-h-[55vh] overflow-y-auto">
          {/* Status Stepper */}
          <div className="mb-4">
            <DeliveryStatusStepper currentStatus={deliveryStatus} />
          </div>

          {/* Customer Info */}
          <Card padding="md" shadow="sm" className="mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {MOCK_CUSTOMER.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {MOCK_CUSTOMER.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCallCustomer}
                  className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
                >
                  <Phone className="w-4 h-4 text-green-600" />
                </button>
                <button className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          </Card>

          {/* Delivery Address */}
          <Card padding="md" shadow="sm" className="mb-3">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {MOCK_CUSTOMER.address}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Landmark: {MOCK_CUSTOMER.landmark}
                </p>
              </div>
            </div>
          </Card>

          {/* Order Details */}
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
              <span>
                Total: {formatCurrency(order.price.total)}
              </span>
              <span>
                Payment: {order.payment.method.toUpperCase()}
              </span>
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

          {/* ============================================================ */}
          {/* Action Area based on delivery status                         */}
          {/* ============================================================ */}

          {/* Navigate State */}
          {deliveryStatus === 'navigate' && (
            <div className="space-y-3">
              <Button
                variant="secondary"
                size="xl"
                fullWidth
                onClick={handleStartNavigation}
                leftIcon={<Navigation className="w-6 h-6" />}
                className="text-lg"
              >
                Start Navigation
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleMarkArrived}
                leftIcon={<Flag className="w-5 h-5" />}
              >
                I Have Arrived
              </Button>
            </div>
          )}

          {/* Arrived State */}
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

              {/* Photo Upload */}
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
                loading={isConfirmingDelivery}
                leftIcon={
                  !isConfirmingDelivery ? (
                    <PackageCheck className="w-6 h-6" />
                  ) : undefined
                }
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

          {/* Delivered State (brief, before redirect) */}
          {deliveryStatus === 'delivered' && (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">
                Delivery Confirmed!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Redirecting to dashboard...
              </p>
            </div>
          )}
        </div>

        {/* Safe area */}
        <div className="h-safe-area-inset-bottom bg-white" />
      </motion.div>
    </div>
  );
}
