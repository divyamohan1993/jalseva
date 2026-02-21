'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Mic,
  MicOff,
  Droplets,
  Mountain,
  Truck,
  Minus,
  Plus,
  ChevronDown,
  Home,
  ClipboardList,
  ScrollText,
  User,
  Globe,
  X,
  Loader2,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { createOrder } from '@/actions/orders';
import { formatCurrency } from '@/lib/utils';
import type { WaterType, GeoLocation, CreateOrderRequest } from '@/types';
import { LANGUAGES, getLanguage, getSpeechLocale } from '@/lib/languages';
import { useT } from '@/lib/i18n';
import { VoiceConversation } from '@/components/shared/VoiceConversation';
import { useAccessibility } from '@/components/shared/AccessibilityProvider';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WATER_TYPES: {
  key: WaterType;
  labelKey: string;
  descKey: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'ro',
    labelKey: 'water.ro',
    descKey: 'water.roDesc',
    icon: <Droplets className="w-7 h-7" />,
  },
  {
    key: 'mineral',
    labelKey: 'water.mineral',
    descKey: 'water.mineralDesc',
    icon: <Mountain className="w-7 h-7" />,
  },
  {
    key: 'tanker',
    labelKey: 'water.tanker',
    descKey: 'water.tankerDesc',
    icon: <Truck className="w-7 h-7" />,
  },
];

const QUANTITY_OPTIONS: { litres: number; label: string }[] = [
  { litres: 20, label: '20L' },
  { litres: 50, label: '50L' },
  { litres: 200, label: '200L' },
  { litres: 500, label: '500L' },
  { litres: 1000, label: '1000L' },
  { litres: 2000, label: '2000L' },
  { litres: 5000, label: '5kL' },
  { litres: 10000, label: '10kL' },
];

// Base prices (per litre approximation) for estimation
const BASE_PRICES: Record<WaterType, number> = {
  ro: 1.5,
  mineral: 3.0,
  tanker: 0.8,
};

// ---------------------------------------------------------------------------
// Voice recognition hook
// ---------------------------------------------------------------------------

function useVoiceRecognition(onResult: (text: string) => void, locale: string) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input not supported on this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getSpeechLocale(locale);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult, locale]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return { isListening, isSupported, startListening, stopListening };
}

// ---------------------------------------------------------------------------
// Login Modal Component
// ---------------------------------------------------------------------------

function LoginPromptModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('home.loginToBook')}
            </h2>
          </div>

          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={() => router.push('/login')}
            className="mb-3"
          >
            {t('home.loginWithPhone')}
          </Button>

          <p className="text-xs text-center text-gray-400 mt-3">
            {t('common.termsAgree')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Price Breakdown Modal
// ---------------------------------------------------------------------------

function PriceBreakdownModal({
  isOpen,
  onClose,
  waterType,
  quantity,
  price,
}: {
  isOpen: boolean;
  onClose: () => void;
  waterType: WaterType;
  quantity: number;
  price: { base: number; delivery: number; surge: number; total: number };
}) {
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              {t('home.priceBreakdown')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>
                {t(WATER_TYPES.find((w) => w.key === waterType)?.labelKey ?? 'water.ro')} x{' '}
                {quantity}L
              </span>
              <span>{formatCurrency(price.base)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>{t('home.deliveryFee')}</span>
              <span>{formatCurrency(price.delivery)}</span>
            </div>
            {price.surge > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>{t('home.surge')}</span>
                <span>+{formatCurrency(price.surge)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-lg">
              <span>{t('home.total')}</span>
              <span>{formatCurrency(price.total)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-5"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Bottom Navigation
// ---------------------------------------------------------------------------

function BottomNav({ active }: { active: string }) {
  const router = useRouter();
  const { t } = useT();

  const navItems = [
    { key: 'home', icon: Home, path: '/' },
    { key: 'booking', icon: ClipboardList, path: '/booking' },
    { key: 'history', icon: ScrollText, path: '/history' },
    { key: 'profile', icon: User, path: '/profile' },
  ];

  return (
    <nav className="bottom-nav shadow-lg" role="navigation" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            aria-label={t(`nav.${item.key}`)}
            aria-current={isActive ? 'page' : undefined}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon
              className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            />
            <span
              className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {t(`nav.${item.key}`)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main Home Page Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setCurrentOrder, addOrder } = useOrderStore();
  const { locale, setLocale, t } = useT();
  const { announce, haptic } = useAccessibility();

  // --- Booking state ---
  const [waterType, setWaterType] = useState<WaterType>('ro');
  const [quantity, setQuantity] = useState<number>(20);
  const [quantityIndex, setQuantityIndex] = useState<number>(0);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [nearbySuppliers, setNearbySuppliers] = useState<number>(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [isBooking, startBookingTransition] = useTransition();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [showVoiceConversation, setShowVoiceConversation] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // --- Calculated price ---
  const basePrice = BASE_PRICES[waterType] * quantity;
  const deliveryFee = quantity <= 200 ? 30 : quantity <= 1000 ? 50 : 100;
  const surgeAmount = 0; // Will come from API in production
  const totalPrice = basePrice + deliveryFee + surgeAmount;

  // --- Voice recognition ---
  const handleVoiceResult = useCallback(
    async (transcript: string) => {
      toast.loading(t('toast.voiceProcessing'), {
        id: 'voice-processing',
      });

      try {
        const response = await fetch('/api/ai/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, language: locale }),
        });

        if (response.ok) {
          const data = await response.json();
          const intent = data.intent || data;
          if (intent.waterType) {
            setWaterType(intent.waterType);
          }
          if (intent.quantity) {
            setQuantity(intent.quantity);
            const idx = QUANTITY_OPTIONS.findIndex(
              (q) => q.litres === intent.quantity
            );
            if (idx >= 0) setQuantityIndex(idx);
          }
          announce(t('toast.voiceUnderstood'), 'assertive');
          haptic([50, 30, 50]);
          toast.success(t('toast.voiceUnderstood'), {
            id: 'voice-processing',
          });
        } else {
          toast.error(t('toast.voiceFailed'), {
            id: 'voice-processing',
          });
        }
      } catch {
        toast.error(t('toast.voiceError'), {
          id: 'voice-processing',
        });
      }
    },
    [waterType, quantity, t, locale]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useVoiceRecognition(handleVoiceResult, locale);

  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        toast.error(t('toast.locationNotAvailable'));
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const geo: GeoLocation = { lat: latitude, lng: longitude };
          setLocation(geo);

          // Reverse geocode to get address
          try {
            const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${mapsKey}&language=en`
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.results?.[0]?.formatted_address || t('home.locationDetected');
              setLocationAddress(addr);
              geo.address = addr;
              setLocation({ ...geo });
            } else {
              setLocationAddress(t('home.locationDetected'));
            }
          } catch {
            setLocationAddress(t('home.locationDetected'));
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error(t('toast.cantAccessLocation'));
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    } catch {
      setLocationLoading(false);
    }
  }, [t]);

  // --- Get user location on mount ---
  useEffect(() => {
    getCurrentLocation();
    // Simulate nearby suppliers count
    setNearbySuppliers(Math.floor(Math.random() * 8) + 3);
  }, [getCurrentLocation]);

  // --- Quantity controls ---
  const decreaseQuantity = () => {
    if (quantityIndex > 0) {
      const newIndex = quantityIndex - 1;
      setQuantityIndex(newIndex);
      setQuantity(QUANTITY_OPTIONS[newIndex].litres);
    }
  };

  const increaseQuantity = () => {
    if (quantityIndex < QUANTITY_OPTIONS.length - 1) {
      const newIndex = quantityIndex + 1;
      setQuantityIndex(newIndex);
      setQuantity(QUANTITY_OPTIONS[newIndex].litres);
    }
  };

  // --- Book now handler (React 19 useTransition + Server Action) ---
  const handleBookNow = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!location) {
      toast.error(t('toast.enableLocation'));
      getCurrentLocation();
      return;
    }

    startBookingTransition(async () => {
      try {
        const orderRequest: CreateOrderRequest = {
          customerId: user.id,
          waterType,
          quantityLitres: quantity,
          deliveryLocation: location,
          paymentMethod: 'cash',
        };

        // Use Server Action instead of fetch('/api/orders')
        const result = await createOrder(orderRequest);
        let order = result.success ? result.order : null;

        // Demo fallback: create order client-side if server action unavailable
        if (!order?.id) {
          const demoId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          order = {
            id: demoId,
            customerId: user.id,
            waterType,
            quantityLitres: quantity,
            price: {
              base: basePrice,
              distance: deliveryFee,
              surge: surgeAmount,
              total: totalPrice,
              commission: Math.round(totalPrice * 0.15),
              supplierEarning: totalPrice - Math.round(totalPrice * 0.15),
            },
            status: 'searching',
            deliveryLocation: location,
            payment: {
              method: 'cash',
              status: 'pending',
              amount: totalPrice,
            },
            createdAt: new Date(),
          } as any;
        }

        if (order) {
          setCurrentOrder(order);
          addOrder(order);
        }
        toast.success(t('toast.orderPlaced'));
        router.push('/booking');
      } catch {
        toast.error(t('toast.somethingWrong'));
      }
    });
  };

  // --- Conversational voice order handler ---
  const handleVoiceOrderConfirmed = useCallback(
    (order: { waterType: WaterType; quantity: number }) => {
      setWaterType(order.waterType);
      setQuantity(order.quantity);
      const idx = QUANTITY_OPTIONS.findIndex((q) => q.litres === order.quantity);
      if (idx >= 0) setQuantityIndex(idx);
      setShowVoiceConversation(false);
      haptic([100, 50, 100]);
      announce(t('voice.orderConfirmed'), 'assertive');
      toast.success(t('voice.orderConfirmed'));
    },
    [t, haptic, announce]
  );

  // --- Close language dropdown on outside click ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ============== Navbar ============== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top" role="banner">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-water rounded-xl flex items-center justify-center" aria-hidden="true">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                JalSeva
              </h1>
              <p className="text-[10px] text-gray-400 leading-none -mt-0.5" aria-hidden="true">
                जलसेवा
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setLangDropdownOpen((o) => !o)}
                aria-label="Select language"
                aria-expanded={langDropdownOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {getLanguage(locale).short}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[170px] max-h-[320px] overflow-y-auto z-50" role="listbox">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLocale(lang.code);
                        setLangDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={lang.code === locale}
                      className={`w-full text-left px-3 py-2 min-h-[44px] text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                        lang.code === locale
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>{lang.native} <span className="text-gray-400 text-xs">{lang.label}</span></span>
                      {lang.code === locale && (
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile / Login */}
            <button
              onClick={() =>
                user ? router.push('/profile') : setShowLoginModal(true)
              }
              aria-label={user ? 'View profile' : 'Login'}
              className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors"
            >
              {user ? (
                <span className="text-sm font-bold text-blue-600">
                  {user.name?.[0]?.toUpperCase() || user.phone?.slice(-2)}
                </span>
              ) : (
                <User className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============== Main Content ============== */}
      <main id="main-content" className="px-4 pt-4 space-y-4 app-container" role="main">
        {/* --- Location Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card shadow="sm" className="overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('home.yourLocation')}
                </p>
                {locationLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500">
                      {t('home.detectingLocation')}
                    </span>
                  </div>
                ) : locationAddress ? (
                  <p className="text-sm font-medium text-gray-800 mt-0.5 line-clamp-2">
                    {locationAddress}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t('home.tapToDetect')}
                  </p>
                )}
              </div>
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="shrink-0 p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
              </button>
            </div>
            {nearbySuppliers > 0 && location && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {t('home.suppliersNearby', { count: nearbySuppliers })}
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* --- Conversational Voice Order Button --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowVoiceConversation(true)}
            className="w-full rounded-2xl p-6 transition-all duration-300 active:scale-[0.98] bg-water shadow-lg shadow-blue-200"
            aria-label={t('voice.startConversation')}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                }}
                className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Mic className="w-8 h-8 text-white" />
              </motion.div>

              <div className="text-center">
                <p className="text-white font-bold text-lg">
                  {t('voice.startConversation')}
                </p>
                <p className="text-white/80 text-sm mt-1">
                  {t('voice.startConversationDesc')}
                </p>
              </div>
            </div>
          </button>
        </motion.div>

        {/* --- Quick Voice (legacy single-shot) --- */}
        {isSupported && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-full rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] ${
                isListening
                  ? 'bg-red-500 shadow-md shadow-red-200'
                  : 'bg-white border-2 border-dashed border-blue-200'
              }`}
              aria-label={isListening ? t('home.voiceListening') : t('home.voiceOrder')}
            >
              <div className="flex items-center justify-center gap-3">
                {isListening ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-blue-500" />
                )}
                <span className={`font-semibold text-sm ${isListening ? 'text-white' : 'text-blue-600'}`}>
                  {isListening ? t('home.voiceListening') : t('home.voiceOrder')}
                </span>
                {isListening && (
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [1, 2.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-0.5 h-3 bg-white/70 rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>
            </button>
          </motion.div>
        )}

        {/* --- Divider --- */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {t('home.orSelectBelow')}
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* --- Water Type Selector --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {t('home.waterType')}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {WATER_TYPES.map((type) => {
              const isSelected = waterType === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setWaterType(type.key)}
                  className={`relative rounded-2xl p-4 border-2 transition-all duration-200 active:scale-[0.97] min-h-[100px] flex flex-col items-center justify-center gap-2 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                  >
                    {type.icon}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}
                    >
                      {t(type.labelKey)}
                    </p>
                    <p
                      className={`text-[11px] ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}
                    >
                      {t(type.descKey)}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId="water-type-indicator"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* --- Quantity Picker --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {t('home.quantity')}
          </p>
          <Card shadow="sm">
            <div className="flex items-center justify-between">
              <button
                onClick={decreaseQuantity}
                disabled={quantityIndex === 0}
                className="w-14 h-14 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
              >
                <Minus className="w-6 h-6 text-gray-700" />
              </button>

              <div className="text-center px-4">
                <motion.p
                  key={quantity}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-gray-900"
                >
                  {QUANTITY_OPTIONS[quantityIndex].label}
                </motion.p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('home.litres', { count: quantity })}
                </p>
              </div>

              <button
                onClick={increaseQuantity}
                disabled={quantityIndex === QUANTITY_OPTIONS.length - 1}
                className="w-14 h-14 rounded-xl bg-blue-50 hover:bg-blue-100 disabled:opacity-30 disabled:hover:bg-blue-50 flex items-center justify-center transition-colors active:scale-95"
              >
                <Plus className="w-6 h-6 text-blue-600" />
              </button>
            </div>

            {/* Quantity quick-select pills */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {QUANTITY_OPTIONS.map((opt, idx) => (
                  <button
                    key={opt.litres}
                    onClick={() => {
                      setQuantityIndex(idx);
                      setQuantity(opt.litres);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      quantityIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* --- Price Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card
            shadow="md"
            className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  {t('home.estimatedPrice')}
                </p>
                <motion.p
                  key={totalPrice}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold text-gray-900 mt-0.5"
                >
                  {formatCurrency(totalPrice)}
                </motion.p>
              </div>
              <button
                onClick={() => setShowPriceBreakdown(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/80 hover:bg-white transition-colors text-sm font-medium text-blue-600 min-h-[44px]"
              >
                {t('home.viewBreakdown')}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </motion.div>

        {/* --- Book Now Button --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pb-4"
        >
          <Button
            variant="primary"
            size="xl"
            fullWidth
            loading={isBooking}
            onClick={handleBookNow}
            className="rounded-2xl text-lg font-bold min-h-[60px] shadow-water"
          >
            {isBooking ? t('home.placingOrder') : t('home.bookNow')}
          </Button>
          {!user && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {t('home.needLogin')}
            </p>
          )}
        </motion.div>
      </main>

      {/* ============== Bottom Navigation ============== */}
      <BottomNav active="home" />

      {/* ============== Modals ============== */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <PriceBreakdownModal
        isOpen={showPriceBreakdown}
        onClose={() => setShowPriceBreakdown(false)}
        waterType={waterType}
        quantity={quantity}
        price={{
          base: basePrice,
          delivery: deliveryFee,
          surge: surgeAmount,
          total: totalPrice,
        }}
      />

      {/* ============== Conversational Voice Ordering ============== */}
      <VoiceConversation
        isOpen={showVoiceConversation}
        onClose={() => setShowVoiceConversation(false)}
        onOrderConfirmed={handleVoiceOrderConfirmed}
        locale={locale}
      />
    </div>
  );
}
