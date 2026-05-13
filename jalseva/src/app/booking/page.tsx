'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useTransition } from 'react';
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
  Radio,
  Network,
  ScanSearch,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { cancelOrder } from '@/actions/orders';
import { formatCurrency } from '@/lib/utils';
import type { Order, GeoLocation } from '@/types';

// ---------------------------------------------------------------------------
// ONDC simulation stages
// ---------------------------------------------------------------------------

type SearchStage =
  | 'idle'
  | 'broadcasting'
  | 'matching'
  | 'selecting'
  | 'initializing'
  | 'confirming'
  | 'done'
  | 'error';

const STAGE_META: Record<
  SearchStage,
  { en: string; hi: string; icon: typeof Radio; beckn: string }
> = {
  idle: {
    en: 'Preparing your order…',
    hi: 'आपका ऑर्डर तैयार किया जा रहा है…',
    icon: Loader2,
    beckn: '',
  },
  broadcasting: {
    en: 'Broadcasting on the ONDC network…',
    hi: 'ONDC नेटवर्क पर भेजा जा रहा है…',
    icon: Radio,
    beckn: 'beckn: search',
  },
  matching: {
    en: 'Suppliers responded. Picking best match…',
    hi: 'सप्लायर मिले। सबसे अच्छा चुना जा रहा है…',
    icon: ScanSearch,
    beckn: 'beckn: on_search',
  },
  selecting: {
    en: 'Confirming availability with supplier…',
    hi: 'सप्लायर से उपलब्धता पुष्टि…',
    icon: Network,
    beckn: 'beckn: select / on_select',
  },
  initializing: {
    en: 'Locking delivery and payment terms…',
    hi: 'डिलीवरी और भुगतान तय किए जा रहे हैं…',
    icon: FileCheck2,
    beckn: 'beckn: init / on_init',
  },
  confirming: {
    en: 'Confirming your booking on ONDC…',
    hi: 'आपकी बुकिंग ONDC पर पुष्टि…',
    icon: ShieldCheck,
    beckn: 'beckn: confirm / on_confirm',
  },
  done: {
    en: 'Supplier confirmed!',
    hi: 'सप्लायर की पुष्टि हो गई!',
    icon: CheckCircle2,
    beckn: 'beckn: order.state=Accepted',
  },
  error: {
    en: 'No supplier responded. Please try again.',
    hi: 'कोई सप्लायर नहीं मिला। कृपया फिर से कोशिश करें।',
    icon: X,
    beckn: 'beckn: NACK',
  },
};

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
                {order.supplierId
                  ? `ID: ${order.supplierId.slice(0, 8)}...`
                  : 'Assigned'}
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
  const { currentOrder, setCurrentOrder, addOrder } = useOrderStore();

  const [searching, setSearching] = useState(true);
  const [supplierFound, setSupplierFound] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [stage, setStage] = useState<SearchStage>('idle');
  const [matchedCount, setMatchedCount] = useState(0);
  const [isCancelling, startCancelTransition] = useTransition();

  // Track which orderId has already been simulated so we don't restart on
  // every state update inside the effect.
  const simulatedRef = useRef<string | null>(null);

  // --- Redirect if no order or not logged in ---
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/booking');
      return;
    }
  }, [user, router]);

  // --- ONDC simulation chain (search → select → init → confirm) ---
  useEffect(() => {
    if (!user) return;
    if (!currentOrder) {
      // No active order; nudge user back home shortly.
      const fallback = setTimeout(() => {
        if (!useOrderStore.getState().currentOrder) {
          toast.error('No active booking found.\nकोई बुकिंग नहीं मिली।');
          router.push('/');
        }
      }, 2000);
      return () => clearTimeout(fallback);
    }

    // If we revisit /booking after acceptance, short-circuit.
    if (currentOrder.status !== 'searching') {
      setSearching(false);
      setSupplierFound(true);
      setStage('done');
      return;
    }

    // Only run the chain once per orderId.
    if (simulatedRef.current === currentOrder.id) return;
    simulatedRef.current = currentOrder.id;

    const orderId = currentOrder.id;
    const txnId = `txn-${orderId}`;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    const baseCtx = (action: string, msgSuffix: string) => ({
      domain: 'nic2004:65111',
      country: 'IND',
      city: 'std:011',
      action,
      core_version: '1.1.0',
      bap_id: 'jalseva-sim.in',
      bap_uri: 'https://jalseva-sim.in/api/beckn',
      bpp_id: 'jalseva-bpp-sim.in',
      bpp_uri: 'https://jalseva-sim.in/api/beckn',
      transaction_id: txnId,
      message_id: `msg-${msgSuffix}-${orderId}`,
      timestamp: new Date().toISOString(),
    });

    let cancelled = false;

    (async () => {
      try {
        // ─── 1. SEARCH ────────────────────────────────────────────────
        setStage('broadcasting');
        await wait(800);
        const searchRes = await fetch('/api/beckn/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: baseCtx('search', 'search'),
            message: {
              intent: {
                item: { descriptor: { name: currentOrder.waterType } },
                fulfillment: {
                  end: {
                    location: {
                      gps: `${currentOrder.deliveryLocation.lat},${currentOrder.deliveryLocation.lng}`,
                    },
                  },
                },
              },
            },
          }),
        });
        if (cancelled) return;
        if (!searchRes.ok) throw new Error('search_failed');
        const searchJson = await searchRes.json();
        const providers: Array<{
          id: string;
          descriptor?: { name?: string };
          locations?: Array<{
            gps?: string;
            address?: { street?: string };
          }>;
          items?: Array<{
            id?: string;
            descriptor?: { name?: string; code?: string };
            price?: { value?: string };
          }>;
          rating?: string;
        }> = searchJson?.message?.catalog?.['bpp/providers'] || [];
        if (providers.length === 0) throw new Error('no_providers');
        setMatchedCount(providers.length);

        // ─── 2. MATCH (rank by rating descending) ─────────────────────
        setStage('matching');
        await wait(800);
        const ranked = providers
          .slice()
          .sort(
            (a, b) =>
              parseFloat(b.rating || '0') - parseFloat(a.rating || '0'),
          );
        const best = ranked[0];
        const supplierId = best.id;
        const supplierItem =
          (best.items || []).find(
            (it) => it.descriptor?.code === currentOrder.waterType,
          ) || best.items?.[0];
        const supplierLocRaw = best.locations?.[0];
        const supplierGps =
          supplierLocRaw?.gps?.split(',').map(Number) || [];

        // ─── 3. SELECT ────────────────────────────────────────────────
        setStage('selecting');
        await wait(700);
        const selectRes = await fetch('/api/beckn/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: baseCtx('select', 'select'),
            message: {
              order: {
                provider: { id: supplierId },
                items: [
                  {
                    id: supplierItem?.id,
                    descriptor: supplierItem?.descriptor,
                    price: {
                      currency: 'INR',
                      value: currentOrder.price.total.toString(),
                    },
                    quantity: { selected: { count: '1' } },
                  },
                ],
              },
            },
          }),
        });
        if (cancelled) return;
        if (!selectRes.ok) throw new Error('select_failed');
        await selectRes.json();

        // ─── 4. INIT ──────────────────────────────────────────────────
        setStage('initializing');
        await wait(700);
        const initRes = await fetch('/api/beckn/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: baseCtx('init', 'init'),
            message: {
              order: {
                provider: { id: supplierId },
                items: [
                  {
                    id: supplierItem?.id,
                    descriptor: supplierItem?.descriptor,
                    price: {
                      currency: 'INR',
                      value: currentOrder.price.total.toString(),
                    },
                  },
                ],
                billing: {
                  name: user.name || 'Customer',
                  phone: user.phone || '',
                },
                fulfillment: {
                  type: 'Delivery',
                  end: {
                    location: {
                      gps: `${currentOrder.deliveryLocation.lat},${currentOrder.deliveryLocation.lng}`,
                      address: {
                        street: currentOrder.deliveryLocation.address || '',
                        country: 'IND',
                      },
                    },
                  },
                },
                payment: { type: 'POST-FULFILLMENT' },
              },
            },
          }),
        });
        if (cancelled) return;
        if (!initRes.ok) throw new Error('init_failed');
        await initRes.json();

        // ─── 5. CONFIRM ───────────────────────────────────────────────
        setStage('confirming');
        await wait(800);
        const confirmRes = await fetch('/api/beckn/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: baseCtx('confirm', 'confirm'),
            message: {
              order: {
                provider: { id: supplierId },
                items: [
                  {
                    id: supplierItem?.id,
                    descriptor: supplierItem?.descriptor,
                    price: {
                      currency: 'INR',
                      value: currentOrder.price.total.toString(),
                    },
                    quantity: {
                      count: Math.max(
                        1,
                        Math.round(currentOrder.quantityLitres / 500),
                      ).toString(),
                    },
                  },
                ],
                billing: {
                  name: user.name || 'Customer',
                  phone: user.phone || '',
                },
                fulfillment: {
                  type: 'Delivery',
                  end: {
                    location: {
                      gps: `${currentOrder.deliveryLocation.lat},${currentOrder.deliveryLocation.lng}`,
                      address: {
                        street: currentOrder.deliveryLocation.address || '',
                        country: 'IND',
                      },
                    },
                  },
                },
                payment: { type: 'POST-FULFILLMENT' },
                quote: {
                  price: {
                    currency: 'INR',
                    value: currentOrder.price.total.toString(),
                  },
                },
              },
            },
          }),
        });
        if (cancelled) return;
        if (!confirmRes.ok) throw new Error('confirm_failed');
        await confirmRes.json();

        // ─── 6. PATCH LOCAL ORDER ────────────────────────────────────
        // Always anchor the supplier ~1.5 km north-east of the customer's
        // delivery location. The Beckn catalog's supplier GPS is a hint —
        // using it verbatim breaks the demo when the customer is outside
        // the supplier's hardcoded city (e.g. customer in Mumbai but the
        // simulated supplier is "in" Delhi → 1000+ km ETA).
        void supplierGps;
        const supplierLocation: GeoLocation = {
          lat: currentOrder.deliveryLocation.lat + 0.013,
          lng: currentOrder.deliveryLocation.lng + 0.013,
          address: supplierLocRaw?.address?.street || 'Nearby tanker hub',
        };

        // Approximate distance (haversine) and ETA.
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(
          currentOrder.deliveryLocation.lat - supplierLocation.lat,
        );
        const dLng = toRad(
          currentOrder.deliveryLocation.lng - supplierLocation.lng,
        );
        const aHav =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(supplierLocation.lat)) *
            Math.cos(toRad(currentOrder.deliveryLocation.lat)) *
            Math.sin(dLng / 2) ** 2;
        const distance = 2 * R * Math.atan2(Math.sqrt(aHav), Math.sqrt(1 - aHav));
        const etaSec = Math.max(60, Math.round(distance / 8.33));

        if (cancelled) return;

        const updated: Order = {
          ...currentOrder,
          status: 'accepted',
          supplierId,
          supplierLocation,
          tracking: {
            supplierLocation,
            eta: etaSec,
            distance: Math.round(distance),
          },
          beckn: {
            transactionId: txnId,
            messageId: `msg-confirm-${orderId}`,
            bapId: 'jalseva-sim.in',
            bppId: 'jalseva-bpp-sim.in',
          },
          acceptedAt: new Date(),
        };

        setCurrentOrder(updated);
        addOrder(updated);
        setStage('done');
        setSearching(false);
        setSupplierFound(true);
      } catch (err) {
        if (cancelled) return;
        console.error('[ONDC sim] failed:', err);
        setStage('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder?.id, user?.id]);

  // --- Search timer ---
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [searching]);

  // --- Cancel order (React 19 useTransition + Server Action) ---
  const handleCancel = () => {
    if (!currentOrder) return;

    startCancelTransition(async () => {
      await cancelOrder(currentOrder.id);
      setCurrentOrder(null);
      toast.success('Order cancelled.\nऑर्डर रद्द हो गया।');
      router.push('/');
    });
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

  const StageIcon = STAGE_META[stage].icon;
  const stageEn = STAGE_META[stage].en;
  const stageHi = STAGE_META[stage].hi;
  const stageBeckn = STAGE_META[stage].beckn;

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
      <main className="px-4 pt-6 pb-8 app-container">
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

              {/* Stage text */}
              <div className="text-center space-y-2">
                <motion.h2
                  key={stage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xl font-bold ${stage === 'error' ? 'text-red-600' : 'text-gray-900'}`}
                >
                  {stageEn}
                </motion.h2>
                <p
                  className={`text-sm ${stage === 'error' ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {stageHi}
                </p>

                {/* Beckn protocol indicator */}
                {stageBeckn && (
                  <div className="flex items-center justify-center gap-1.5 pt-2">
                    <StageIcon
                      className={`w-3.5 h-3.5 ${stage === 'error' ? 'text-red-400' : 'text-blue-500'} ${stage !== 'done' && stage !== 'error' ? 'animate-pulse' : ''}`}
                    />
                    <span className="text-[11px] font-mono uppercase tracking-wide text-gray-400">
                      {stageBeckn}
                    </span>
                  </div>
                )}

                {matchedCount > 0 && stage !== 'error' && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    {matchedCount} supplier{matchedCount === 1 ? '' : 's'}{' '}
                    responded
                  </p>
                )}
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

              {/* Retry button on error */}
              {stage === 'error' && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    simulatedRef.current = null;
                    setStage('idle');
                    setSearchTime(0);
                    // Bump key so the orchestration effect re-runs.
                    if (currentOrder) {
                      setCurrentOrder({ ...currentOrder });
                    }
                  }}
                  className="rounded-2xl"
                >
                  Retry / फिर से कोशिश करें
                </Button>
              )}

              {/* Cancel button */}
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                loading={isCancelling}
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
                    window.open('tel:+919876543210', '_self');
                  }}
                >
                  Call / कॉल
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  loading={isCancelling}
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
