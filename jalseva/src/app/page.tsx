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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WATER_TYPES: {
  key: WaterType;
  label: string;
  hindi: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    key: 'ro',
    label: 'RO Water',
    hindi: 'आरओ पानी',
    icon: <Droplets className="w-7 h-7" />,
    description: 'Purified drinking water',
  },
  {
    key: 'mineral',
    label: 'Mineral',
    hindi: 'मिनरल पानी',
    icon: <Mountain className="w-7 h-7" />,
    description: 'Natural mineral water',
  },
  {
    key: 'tanker',
    label: 'Tanker',
    hindi: 'टैंकर',
    icon: <Truck className="w-7 h-7" />,
    description: 'Bulk water tanker',
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

function useVoiceRecognition(onResult: (text: string) => void) {
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
    recognition.lang = 'hi-IN'; // Hindi primary, falls back to English
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
      toast.error('Could not understand. Please try again.\nसमझ नहीं पाये। कृपया फिर से बोलें।');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onResult]);

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
              Login to Book Water
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              पानी बुक करने के लिए लॉगिन करें
            </p>
          </div>

          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={() => router.push('/login')}
            className="mb-3"
          >
            Login with Phone / फ़ोन से लॉगिन
          </Button>

          <p className="text-xs text-center text-gray-400 mt-3">
            By continuing you agree to our Terms of Service
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
              Price Breakdown
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">मूल्य विवरण</p>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>
                {WATER_TYPES.find((w) => w.key === waterType)?.label} x{' '}
                {quantity}L
              </span>
              <span>{formatCurrency(price.base)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery Fee / डिलीवरी शुल्क</span>
              <span>{formatCurrency(price.delivery)}</span>
            </div>
            {price.surge > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Surge / अधिक मांग शुल्क</span>
                <span>+{formatCurrency(price.surge)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900 text-lg">
              <span>Total / कुल</span>
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
            Close / बंद करें
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
// Main Home Page Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setCurrentOrder, addOrder } = useOrderStore();

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
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // --- Calculated price ---
  const basePrice = BASE_PRICES[waterType] * quantity;
  const deliveryFee = quantity <= 200 ? 30 : quantity <= 1000 ? 50 : 100;
  const surgeAmount = 0; // Will come from API in production
  const totalPrice = basePrice + deliveryFee + surgeAmount;

  // --- Voice recognition ---
  const handleVoiceResult = useCallback(
    async (transcript: string) => {
      toast.loading('Processing voice command...\nआवाज़ प्रोसेस हो रही है...', {
        id: 'voice-processing',
      });

      try {
        const response = await fetch('/api/ai/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript, language: 'hi' }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.waterType) {
            setWaterType(data.waterType);
          }
          if (data.quantity) {
            setQuantity(data.quantity);
            const idx = QUANTITY_OPTIONS.findIndex(
              (q) => q.litres === data.quantity
            );
            if (idx >= 0) setQuantityIndex(idx);
          }
          toast.success(
            `Understood: ${data.waterType || waterType} ${data.quantity || quantity}L\nसमझ गया!`,
            { id: 'voice-processing' }
          );
        } else {
          toast.error('Could not process voice. Please try again.\nफिर से बोलें।', {
            id: 'voice-processing',
          });
        }
      } catch {
        toast.error('Voice processing failed.\nआवाज़ प्रोसेस नहीं हो पायी।', {
          id: 'voice-processing',
        });
      }
    },
    [waterType, quantity]
  );

  const { isListening, isSupported, startListening, stopListening } =
    useVoiceRecognition(handleVoiceResult);

  const getCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        toast.error('Location not available on this device');
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
              const addr = data.results?.[0]?.formatted_address || 'Location detected';
              setLocationAddress(addr);
              geo.address = addr;
              setLocation({ ...geo });
            } else {
              setLocationAddress('Location detected');
            }
          } catch {
            setLocationAddress('Location detected');
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error(
            'Cannot access location. Please enable location services.\nलोकेशन चालू करें।'
          );
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
  }, []);

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
      toast.error(
        'Please enable location to book.\nकृपया अपनी लोकेशन चालू करें।'
      );
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
        toast.success('Order placed! Finding supplier...\nऑर्डर हो गया! सप्लायर ढूंढ रहे हैं...');
        router.push('/booking');
      } catch {
        toast.error(
          'Something went wrong. Please try again.\nकुछ गलत हो गया।'
        );
      }
    });
  };

  // --- Language toggle ---
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ============== Navbar ============== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-water rounded-xl flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                JalSeva
              </h1>
              <p className="text-[10px] text-gray-400 leading-none -mt-0.5">
                जलसेवा
              </p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px]"
            >
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                {language === 'en' ? 'हिंदी' : 'ENG'}
              </span>
            </button>

            {/* Profile / Login */}
            <button
              onClick={() =>
                user ? router.push('/profile') : setShowLoginModal(true)
              }
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
      <main className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
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
                  {language === 'en' ? 'Your Location' : 'आपकी लोकेशन'}
                </p>
                {locationLoading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500">
                      {language === 'en'
                        ? 'Detecting location...'
                        : 'लोकेशन ढूंढ रहे हैं...'}
                    </span>
                  </div>
                ) : locationAddress ? (
                  <p className="text-sm font-medium text-gray-800 mt-0.5 line-clamp-2">
                    {locationAddress}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {language === 'en'
                      ? 'Tap to detect location'
                      : 'लोकेशन के लिए टैप करें'}
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
                  {nearbySuppliers}{' '}
                  {language === 'en'
                    ? 'suppliers nearby'
                    : 'सप्लायर आपके पास उपलब्ध'}
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* --- Voice Order Button --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-full rounded-2xl p-6 transition-all duration-300 active:scale-[0.98] ${
                isListening
                  ? 'bg-red-500 shadow-lg shadow-red-200'
                  : 'bg-water shadow-lg shadow-blue-200'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={
                    isListening
                      ? {
                          scale: [1, 1.2, 1],
                          transition: { repeat: Infinity, duration: 1 },
                        }
                      : {}
                  }
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isListening ? 'bg-white/20' : 'bg-white/20'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </motion.div>

                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {isListening
                      ? language === 'en'
                        ? 'LISTENING... TAP TO STOP'
                        : 'सुन रहे हैं... रोकने के लिए टैप करें'
                      : language === 'en'
                        ? 'TAP TO ORDER BY VOICE'
                        : 'बोलकर ऑर्डर करें'}
                  </p>
                  <p className="text-white/80 text-sm mt-1">
                    {isListening
                      ? language === 'en'
                        ? 'Say what you need...'
                        : 'बताएं क्या चाहिए...'
                      : language === 'en'
                        ? '"20 litre RO paani chahiye"'
                        : '"बीस लीटर आरओ पानी चाहिए"'}
                  </p>
                </div>

                {isListening && (
                  <motion.div
                    className="flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scaleY: [1, 2.5, 1],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.5,
                          delay: i * 0.1,
                        }}
                        className="w-1 h-4 bg-white/70 rounded-full"
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            </button>
          )}
        </motion.div>

        {/* --- Divider --- */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {language === 'en' ? 'Or select below' : 'या नीचे से चुनें'}
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
            {language === 'en' ? 'Water Type' : 'पानी का प्रकार'}
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
                      {type.label}
                    </p>
                    <p
                      className={`text-[11px] ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}
                    >
                      {type.hindi}
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
            {language === 'en' ? 'Quantity' : 'मात्रा'}
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
                  {language === 'en'
                    ? `${quantity} litres`
                    : `${quantity} लीटर`}
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
                  {language === 'en' ? 'Estimated Price' : 'अनुमानित कीमत'}
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
                {language === 'en' ? 'View Breakdown' : 'विवरण देखें'}
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
            {isBooking
              ? language === 'en'
                ? 'Placing Order...'
                : 'ऑर्डर हो रहा है...'
              : language === 'en'
                ? 'BOOK NOW'
                : 'अभी बुक करें'}
          </Button>
          {!user && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {language === 'en'
                ? 'You need to login first'
                : 'पहले लॉगिन करें'}
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
    </div>
  );
}
