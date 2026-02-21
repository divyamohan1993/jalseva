'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Phone,
  X,
  Star,
  Truck,
  MapPin,
  CheckCircle2,
  Package,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useOrderStore } from '@/store/orderStore';
import { cancelOrder } from '@/actions/orders';
import { submitRating } from '@/actions/ratings';
import { formatCurrency } from '@/lib/utils';
import type { Order, OrderStatus, TrackingInfo } from '@/types';

// ---------------------------------------------------------------------------
// Status step definitions
// ---------------------------------------------------------------------------

interface StatusStep {
  key: OrderStatus;
  label: string;
  hindi: string;
  icon: React.ReactNode;
}

const STATUS_STEPS: StatusStep[] = [
  {
    key: 'accepted',
    label: 'Accepted',
    hindi: 'स्वीकार',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  {
    key: 'en_route',
    label: 'Picked Up',
    hindi: 'उठा लिया',
    icon: <Package className="w-5 h-5" />,
  },
  {
    key: 'arriving',
    label: 'On the Way',
    hindi: 'रास्ते में',
    icon: <Truck className="w-5 h-5" />,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    hindi: 'पहुंच गया',
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
];

const STATUS_ORDER: OrderStatus[] = [
  'accepted',
  'en_route',
  'arriving',
  'delivered',
];

function getStatusIndex(status: OrderStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

// ---------------------------------------------------------------------------
// Status Progress Bar
// ---------------------------------------------------------------------------

function StatusProgress({ status }: { status: OrderStatus }) {
  const currentIdx = getStatusIndex(status);

  return (
    <div className="px-2">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-200" />
        {/* Progress line */}
        <motion.div
          className="absolute top-4 left-8 h-0.5 bg-blue-600"
          initial={{ width: '0%' }}
          animate={{
            width: `${(currentIdx / (STATUS_STEPS.length - 1)) * (100 - 16)}%`,
          }}
          transition={{ duration: 0.5 }}
        />

        {STATUS_STEPS.map((step, index) => {
          const isCompleted = index <= currentIdx;
          const isCurrent = index === currentIdx;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center gap-1.5"
            >
              <motion.div
                animate={
                  isCurrent
                    ? { scale: [1, 1.15, 1] }
                    : {}
                }
                transition={
                  isCurrent
                    ? { duration: 1.5, repeat: Infinity }
                    : {}
                }
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
              >
                {step.icon}
              </motion.div>
              <div className="text-center">
                <p
                  className={`text-[10px] font-medium ${isCompleted ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-[9px] ${isCompleted ? 'text-blue-400' : 'text-gray-300'}`}
                >
                  {step.hindi}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map Component (Google Maps placeholder + real integration ready)
// ---------------------------------------------------------------------------

function TrackingMap({
  supplierLocation,
  customerLocation,
  className,
}: {
  supplierLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const supplierMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || !customerLocation) return;

    const initMap = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        });

        await (loader as any).importLibrary('maps');
        const g = (window as any).google;
        const map = new g.maps.Map(mapRef.current!, {
          center: customerLocation,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry.fill',
              stylers: [{ color: '#c8e8ff' }],
            },
          ],
        });

        googleMapRef.current = map;

        // Customer marker
        customerMarkerRef.current = new g.maps.Marker({
          map,
          position: customerLocation,
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#EF4444',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
          title: 'Your Location',
        });

        setMapLoaded(true);
      } catch {
        // Maps API not available, show placeholder
        setMapLoaded(false);
      }
    };

    initMap();
  }, [customerLocation]);

  // Update supplier marker position
  useEffect(() => {
    if (!googleMapRef.current || !supplierLocation || !mapLoaded) return;

    const google = window.google;
    if (!google) return;

    if (supplierMarkerRef.current) {
      supplierMarkerRef.current.setPosition(supplierLocation);
    } else {
      supplierMarkerRef.current = new google.maps.Marker({
        map: googleMapRef.current,
        position: supplierLocation,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#0066FF',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
          rotation: 0,
        },
        title: 'Supplier',
      });
    }

    // Draw route polyline
    if (customerLocation && supplierLocation) {
      if (polylineRef.current) {
        polylineRef.current.setPath([supplierLocation, customerLocation]);
      } else {
        polylineRef.current = new google.maps.Polyline({
          map: googleMapRef.current,
          path: [supplierLocation, customerLocation],
          strokeColor: '#0066FF',
          strokeOpacity: 0.7,
          strokeWeight: 4,
          geodesic: true,
        });
      }

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(supplierLocation);
      bounds.extend(customerLocation);
      googleMapRef.current.fitBounds(bounds, 60);
    }
  }, [supplierLocation, customerLocation, mapLoaded]);

  return (
    <div ref={mapRef} className={`bg-gray-100 ${className || ''}`}>
      {!mapLoaded && (
        <div className="h-full flex flex-col items-center justify-center gap-3 p-6">
          {/* Fallback placeholder map */}
          <div className="relative w-full h-full bg-gradient-to-b from-blue-50 to-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Grid lines to simulate map */}
            <div className="absolute inset-0 opacity-10">
              {[...Array(10)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed visual grid lines
                <React.Fragment key={i}>
                  <div
                    className="absolute h-px bg-gray-400 w-full"
                    style={{ top: `${i * 10}%` }}
                  />
                  <div
                    className="absolute w-px bg-gray-400 h-full"
                    style={{ left: `${i * 10}%` }}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* Customer pin */}
            {customerLocation && (
              <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <MapPin className="w-8 h-8 text-red-500 -mb-1" />
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-[9px] mt-1 bg-white px-1.5 py-0.5 rounded font-medium text-gray-600 shadow-sm">
                    You
                  </span>
                </div>
              </div>
            )}

            {/* Supplier pin */}
            {supplierLocation && (
              <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex flex-col items-center">
                  <Truck className="w-8 h-8 text-blue-600 -mb-1" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  <span className="text-[9px] mt-1 bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium shadow-sm">
                    Supplier
                  </span>
                </div>
              </motion.div>
            )}

            {/* Dashed route line */}
            <svg className="absolute inset-0 w-full h-full">
              <line
                x1="50%"
                y1="33%"
                x2="50%"
                y2="66%"
                stroke="#0066FF"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating Modal
// ---------------------------------------------------------------------------

function RatingModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-center text-gray-900 mb-1">
          Rate your delivery
        </h3>
        <p className="text-sm text-center text-gray-500 mb-5">
          डिलीवरी को रेट करें
        </p>

        {/* Stars */}
        <div className="flex justify-center gap-3 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="p-1 min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Feedback */}
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Any feedback? (Optional) / कोई सुझाव?"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
        />

        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={() => onSubmit(rating, feedback)}
          className="mt-4 rounded-2xl"
        >
          Submit Rating / रेटिंग दें
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Tracking Page
// ---------------------------------------------------------------------------

export default function TrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const { currentOrder, setCurrentOrder, updateOrderStatus, updateTracking } =
    useOrderStore();

  const [order, setOrder] = useState<Order | null>(currentOrder);
  const [loading, setLoading] = useState(!currentOrder);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [isCancelling, startCancelTransition] = useTransition();
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  // --- Fetch order if not in store ---
  useEffect(() => {
    if (currentOrder && currentOrder.id === orderId) {
      setOrder(currentOrder);
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
          setCurrentOrder(data);
        } else {
          toast.error('Order not found.\nऑर्डर नहीं मिला।');
          router.push('/');
        }
      } catch {
        toast.error('Failed to load order.\nऑर्डर लोड नहीं हो पाया।');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, currentOrder, setCurrentOrder, router]);

  // --- Real-time tracking updates via polling ---
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled')
      return;

    const pollTracking = async () => {
      try {
        const res = await fetch(`/api/tracking/${order.id}`);
        if (res.ok) {
          const data = await res.json();

          if (data.tracking) {
            const trackingInfo: TrackingInfo = {
              supplierLocation: data.tracking.supplierLocation,
              eta: data.tracking.eta,
              distance: data.tracking.distance,
              polyline: data.tracking.polyline,
            };
            updateTracking(trackingInfo);
            setEtaMinutes(Math.ceil(data.tracking.eta / 60));
          }

          if (data.status && data.status !== order.status) {
            updateOrderStatus(order.id, data.status);
            setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));

            if (data.status === 'delivered') {
              toast.success(
                'Water delivered! Please rate.\nपानी पहुंच गया! कृपया रेट करें।'
              );
              setShowRating(true);
            }
          }
        }
      } catch {
        // Silent fail
      }
    };

    const interval = setInterval(pollTracking, 5000);
    return () => clearInterval(interval);
  }, [order, updateTracking, updateOrderStatus]);

  // --- Simulate tracking updates for demo ---
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled')
      return;

    const simulateProgress = () => {
      const statusFlow: OrderStatus[] = [
        'accepted',
        'en_route',
        'arriving',
        'delivered',
      ];
      const currentIdx = statusFlow.indexOf(order.status);

      if (currentIdx >= 0 && currentIdx < statusFlow.length - 1) {
        const nextStatus = statusFlow[currentIdx + 1];
        setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));

        if (nextStatus === 'delivered') {
          setTimeout(() => setShowRating(true), 1000);
        }
      }
    };

    // Auto-progress every 15s for demo
    const timeout = setTimeout(simulateProgress, 15000);
    return () => clearTimeout(timeout);
  }, [order?.status, order]);

  // --- ETA countdown ---
  useEffect(() => {
    if (!order?.tracking?.eta) {
      setEtaMinutes(null);
      return;
    }
    setEtaMinutes(Math.ceil(order.tracking.eta / 60));
  }, [order?.tracking?.eta]);

  // --- Cancel handler (React 19 useTransition + Server Action) ---
  const handleCancel = () => {
    if (!order) return;

    // Only allow cancel before en_route
    if (order.status !== 'accepted') {
      toast.error(
        'Cannot cancel now. Water is already on the way.\nअभी रद्द नहीं कर सकते। पानी रास्ते में है।'
      );
      return;
    }

    startCancelTransition(async () => {
      // Use Server Action instead of fetch
      await cancelOrder(order.id);
      updateOrderStatus(order.id, 'cancelled');
      setCurrentOrder(null);
      toast.success('Order cancelled.\nऑर्डर रद्द हो गया।');
      router.push('/');
    });
  };

  // --- Submit rating (Server Action) ---
  const handleSubmitRating = async (rating: number, feedback: string) => {
    if (order?.id) {
      await submitRating({
        orderId: order.id,
        rating,
        feedback,
        type: 'customer',
      });
    }

    setShowRating(false);
    toast.success('Thanks for your rating!\nरेटिंग के लिए धन्यवाद!');
    router.push('/');
  };

  // --- Status text helper ---
  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'accepted':
        return {
          en: 'Supplier accepted your order',
          hi: 'सप्लायर ने ऑर्डर स्वीकार किया',
        };
      case 'en_route':
        return {
          en: 'Water picked up, on the way',
          hi: 'पानी उठा लिया, रास्ते में',
        };
      case 'arriving':
        return { en: 'Arriving soon!', hi: 'जल्द पहुंचने वाला है!' };
      case 'delivered':
        return { en: 'Water delivered!', hi: 'पानी पहुंच गया!' };
      case 'cancelled':
        return { en: 'Order cancelled', hi: 'ऑर्डर रद्द' };
      default:
        return { en: 'Processing...', hi: 'प्रोसेस हो रहा है...' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          Order not found / ऑर्डर नहीं मिला
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/')}
          className="mt-4"
        >
          Go Home / होम जाएं
        </Button>
      </div>
    );
  }

  const statusText = getStatusText(order.status);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* --- Top bar overlay --- */}
      <div className="absolute top-0 left-0 right-0 z-30 safe-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="bg-white rounded-full shadow-md px-4 py-2 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                order.status === 'delivered'
                  ? 'bg-green-500'
                  : order.status === 'cancelled'
                    ? 'bg-red-500'
                    : 'bg-blue-500 animate-pulse'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {statusText.en}
            </span>
          </div>

          {/* Call button */}
          <button
            onClick={() =>
              toast('Calling supplier...\nसप्लायर को कॉल कर रहे हैं...')
            }
            className="w-10 h-10 rounded-full bg-green-500 shadow-md flex items-center justify-center"
          >
            <Phone className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* --- Map --- */}
      <div className="flex-1 relative">
        <TrackingMap
          supplierLocation={order.tracking?.supplierLocation}
          customerLocation={order.deliveryLocation}
          className="w-full h-full"
        />

        {/* ETA overlay */}
        {etaMinutes && order.status !== 'delivered' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-2xl px-5 py-3 shadow-water text-center z-20"
          >
            <p className="text-2xl font-bold">{etaMinutes} min</p>
            <p className="text-xs text-blue-200">
              {etaMinutes === 1 ? 'minute away' : 'minutes away'} / मिनट
            </p>
          </motion.div>
        )}
      </div>

      {/* --- Bottom Sheet --- */}
      <motion.div
        className="bg-white rounded-t-3xl shadow-lg relative z-20"
        animate={{
          height: sheetExpanded ? 'auto' : '120px',
        }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {/* Drag handle */}
        <button
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="w-full flex justify-center pt-3 pb-2"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </button>

        <div className="px-5 pb-6 overflow-hidden">
          {/* Status progress */}
          {order.status !== 'cancelled' && (
            <div className="mb-4">
              <StatusProgress status={order.status} />
            </div>
          )}

          {/* Status text */}
          <div className="text-center mb-4">
            <p className="font-semibold text-gray-900">{statusText.en}</p>
            <p className="text-sm text-gray-500">{statusText.hi}</p>
          </div>

          <AnimatePresence>
            {sheetExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Supplier info */}
                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      Water Supplier
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.supplierId
                        ? `Vehicle: ${order.supplierId.slice(0, 8)}`
                        : 'Assigned'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                    <button
                      onClick={() =>
                        toast(
                          'Calling supplier...\nसप्लायर को कॉल कर रहे हैं...'
                        )
                      }
                      className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <Phone className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Order details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Order Details / ऑर्डर विवरण
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Water Type / पानी</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {order.waterType}
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
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-700">
                      Total / कुल
                    </span>
                    <span className="font-bold text-gray-900 text-base">
                      {formatCurrency(order.price.total)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                {order.status === 'accepted' && (
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    loading={isCancelling}
                    onClick={handleCancel}
                    leftIcon={<X className="w-5 h-5" />}
                    className="rounded-2xl"
                  >
                    Cancel Order / ऑर्डर रद्द करें
                  </Button>
                )}

                {order.status === 'delivered' && (
                  <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    onClick={() => setShowRating(true)}
                    leftIcon={<Star className="w-5 h-5" />}
                    className="rounded-2xl"
                  >
                    Rate Delivery / रेटिंग दें
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse/Expand toggle */}
          <button
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="w-full flex items-center justify-center gap-1 mt-3 text-sm text-gray-400 min-h-[44px]"
          >
            {sheetExpanded ? (
              <>
                <ChevronDown className="w-4 h-4" /> Less
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" /> More details
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleSubmitRating}
      />
    </div>
  );
}
