'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Mountain,
  Truck,
  Calendar,
  Clock,
  Plus,
  Pause,
  Play,
  X,
  ChevronDown,
  CreditCard,
  Wallet,
  Banknote,
  IndianRupee,
  CalendarDays,
  Repeat,
  TrendingDown,
  CheckCircle2,
  Home,
  ClipboardList,
  ScrollText,
  User,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type {
  WaterType,
  PaymentMethod,
  SubscriptionFrequency,
  SubscriptionPlan,
} from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WATER_TYPES: {
  key: WaterType;
  label: string;
  hindi: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}[] = [
  {
    key: 'ro',
    label: 'RO Water',
    hindi: 'आरओ पानी',
    icon: <Droplets className="w-6 h-6" />,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-500',
  },
  {
    key: 'mineral',
    label: 'Mineral',
    hindi: 'मिनरल',
    icon: <Mountain className="w-6 h-6" />,
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
  },
  {
    key: 'tanker',
    label: 'Tanker',
    hindi: 'टैंकर',
    icon: <Truck className="w-6 h-6" />,
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
  },
];

const QUANTITY_OPTIONS: { litres: number; label: string }[] = [
  { litres: 20, label: '20L' },
  { litres: 50, label: '50L' },
  { litres: 200, label: '200L' },
  { litres: 500, label: '500L' },
  { litres: 1000, label: '1000L' },
];

const FREQUENCY_OPTIONS: {
  key: SubscriptionFrequency;
  label: string;
  hindi: string;
  desc: string;
}[] = [
  { key: 'daily', label: 'Daily', hindi: 'रोज़ाना', desc: 'Every day' },
  { key: 'weekly', label: 'Weekly', hindi: 'साप्ताहिक', desc: 'Once a week' },
  { key: 'biweekly', label: 'Biweekly', hindi: 'पाक्षिक', desc: 'Every 2 weeks' },
  { key: 'monthly', label: 'Monthly', hindi: 'मासिक', desc: 'Once a month' },
];

const PAYMENT_OPTIONS: {
  key: PaymentMethod;
  label: string;
  hindi: string;
  icon: React.ReactNode;
}[] = [
  { key: 'upi', label: 'UPI', hindi: 'यूपीआई', icon: <Wallet className="w-5 h-5" /> },
  { key: 'card', label: 'Card', hindi: 'कार्ड', icon: <CreditCard className="w-5 h-5" /> },
  { key: 'cash', label: 'Cash', hindi: 'नकद', icon: <Banknote className="w-5 h-5" /> },
];

const BASE_PRICES: Record<WaterType, number> = {
  ro: 150,
  mineral: 200,
  tanker: 500,
};

const SUBSCRIPTION_DISCOUNT = 0.10;

const FREQUENCY_DAYS: Record<SubscriptionFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextDeliveryDate(frequency: SubscriptionFrequency, daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

function generateUpcomingDeliveries(subscriptions: SubscriptionPlan[]): {
  date: Date;
  waterType: WaterType;
  quantity: number;
  status: 'scheduled' | 'completed';
  subscriptionId: string;
}[] {
  const deliveries: {
    date: Date;
    waterType: WaterType;
    quantity: number;
    status: 'scheduled' | 'completed';
    subscriptionId: string;
  }[] = [];

  for (const sub of subscriptions) {
    if (!sub.isActive) continue;
    const days = FREQUENCY_DAYS[sub.frequency];
    for (let i = 0; i < 5; i++) {
      const d = new Date(sub.nextDeliveryDate);
      d.setDate(d.getDate() + days * i);
      deliveries.push({
        date: d,
        waterType: sub.waterType,
        quantity: sub.quantityLitres,
        status: 'scheduled',
        subscriptionId: sub.id,
      });
    }
  }

  deliveries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return deliveries.slice(0, 5);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getWaterTypeConfig(type: WaterType) {
  return WATER_TYPES.find((w) => w.key === type) || WATER_TYPES[0];
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

function createDemoSubscriptions(): SubscriptionPlan[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  threeDays.setHours(9, 0, 0, 0);

  return [
    {
      id: 'sub_demo_001',
      customerId: 'demo_user',
      waterType: 'ro',
      quantityLitres: 20,
      frequency: 'daily',
      deliveryLocation: { lat: 28.6139, lng: 77.209, address: 'Connaught Place, New Delhi' },
      nextDeliveryDate: tomorrow,
      isActive: true,
      paymentMethod: 'upi',
      pricePerDelivery: 135,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'sub_demo_002',
      customerId: 'demo_user',
      waterType: 'mineral',
      quantityLitres: 50,
      frequency: 'weekly',
      deliveryLocation: { lat: 28.6139, lng: 77.209, address: 'Connaught Place, New Delhi' },
      nextDeliveryDate: threeDays,
      isActive: true,
      paymentMethod: 'card',
      pricePerDelivery: 180,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ];
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
// Subscription Card
// ---------------------------------------------------------------------------

function SubscriptionCard({
  subscription,
  onToggle,
  onEditFrequency,
  onCancel,
}: {
  subscription: SubscriptionPlan;
  onToggle: (id: string) => void;
  onEditFrequency: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const waterConfig = getWaterTypeConfig(subscription.waterType);
  const freqConfig = FREQUENCY_OPTIONS.find((f) => f.key === subscription.frequency);
  const originalPrice = BASE_PRICES[subscription.waterType];

  return (
    <Card shadow="sm" className="overflow-hidden">
      {/* Active/Paused indicator bar */}
      <div
        className={`h-1 -mx-4 -mt-4 mb-4 ${
          subscription.isActive
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-gray-300 to-gray-400'
        }`}
      />

      <div className="flex items-start gap-3">
        {/* Water type icon */}
        <div
          className={`w-12 h-12 ${waterConfig.bgColor} rounded-xl flex items-center justify-center shrink-0`}
        >
          <span className={waterConfig.iconColor}>{waterConfig.icon}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {waterConfig.label}
              </p>
              <p className="text-[11px] text-gray-400">{waterConfig.hindi}</p>
            </div>

            {/* Toggle switch */}
            <button
              onClick={() => onToggle(subscription.id)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                subscription.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              aria-label={
                subscription.isActive ? 'Pause subscription' : 'Resume subscription'
              }
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                animate={{ left: subscription.isActive ? '22px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Quantity and frequency */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg font-medium">
              {subscription.quantityLitres}L
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {freqConfig?.label || subscription.frequency}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-lg font-medium ${
                subscription.isActive
                  ? 'bg-green-50 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {subscription.isActive ? 'Active' : 'Paused'}
            </span>
          </div>

          {/* Next delivery and price */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Next:{' '}
                {subscription.isActive
                  ? formatDate(new Date(subscription.nextDeliveryDate))
                  : 'Paused'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(originalPrice)}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(subscription.pricePerDelivery)}
              </span>
              <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
                -10%
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onToggle(subscription.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[36px] ${
                subscription.isActive
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {subscription.isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </>
              )}
            </button>
            <button
              onClick={() => onEditFrequency(subscription.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors min-h-[36px]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => onCancel(subscription.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create Subscription Modal (Bottom Sheet)
// ---------------------------------------------------------------------------

function CreateSubscriptionModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sub: Omit<SubscriptionPlan, 'id' | 'customerId' | 'createdAt'>) => void;
}) {
  const { t } = useT();
  const [waterType, setWaterType] = useState<WaterType>('ro');
  const [quantity, setQuantity] = useState<number>(20);
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('weekly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [creating, setCreating] = useState(false);

  const originalPrice = BASE_PRICES[waterType];
  const discountedPrice = Math.round(originalPrice * (1 - SUBSCRIPTION_DISCOUNT));
  const savings = originalPrice - discountedPrice;

  const handleCreate = async () => {
    setCreating(true);

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + FREQUENCY_DAYS[frequency]);

    await new Promise((resolve) => setTimeout(resolve, 800));

    onCreate({
      waterType,
      quantityLitres: quantity,
      frequency,
      deliveryLocation: { lat: 28.6139, lng: 77.209, address: 'Current Location' },
      nextDeliveryDate: nextDate,
      isActive: true,
      paymentMethod,
      pricePerDelivery: discountedPrice,
    });

    setCreating(false);
    onClose();

    // Reset form
    setWaterType('ro');
    setQuantity(20);
    setFrequency('weekly');
    setPaymentMethod('upi');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Create Subscription
                </h3>
                <p className="text-xs text-gray-400">
                  सब्सक्रिप्शन बनाएं
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Water type selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Water Type / पानी का प्रकार
              </p>
              <div className="grid grid-cols-3 gap-2">
                {WATER_TYPES.map((type) => {
                  const isSelected = waterType === type.key;
                  return (
                    <button
                      key={type.key}
                      onClick={() => setWaterType(type.key)}
                      className={`rounded-xl p-3 border-2 transition-all duration-200 active:scale-[0.97] flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className={isSelected ? 'text-blue-600' : 'text-gray-400'}>
                        {type.icon}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity picker */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Quantity / मात्रा
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {QUANTITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.litres}
                    onClick={() => setQuantity(opt.litres)}
                    className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      quantity === opt.litres
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Frequency / आवृत्ति
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const isSelected = frequency === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setFrequency(opt.key)}
                      className={`rounded-xl p-3 border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p
                        className={`text-[11px] ${
                          isSelected ? 'text-blue-500' : 'text-gray-400'
                        }`}
                      >
                        {opt.hindi} - {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery address */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Delivery Address / डिलीवरी पता
              </p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    Current Location
                  </p>
                  <p className="text-xs text-gray-400">
                    Using your detected location
                  </p>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Payment Method / भुगतान विधि
              </p>
              <div className="flex gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const isSelected = paymentMethod === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setPaymentMethod(opt.key)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 transition-all text-sm font-medium min-h-[44px] ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className={isSelected ? 'text-blue-600' : 'text-gray-400'}>
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-800">
                  Price Summary / मूल्य सारांश
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Original price</span>
                  <span className="text-gray-500 line-through">
                    {formatCurrency(originalPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 font-medium">
                    Subscription discount (10%)
                  </span>
                  <span className="text-green-600 font-medium">
                    -{formatCurrency(savings)}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-2 flex justify-between">
                  <span className="font-bold text-gray-900">Per delivery</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {formatCurrency(discountedPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscribe button */}
            <Button
              variant="primary"
              size="xl"
              fullWidth
              loading={creating}
              onClick={handleCreate}
              className="rounded-2xl text-lg font-bold min-h-[60px] shadow-water"
            >
              {creating ? 'Creating...' : 'Subscribe / सब्सक्राइब करें'}
            </Button>

            <p className="text-xs text-center text-gray-400">
              You can pause or cancel anytime
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Edit Frequency Modal
// ---------------------------------------------------------------------------

function EditFrequencyModal({
  isOpen,
  onClose,
  currentFrequency,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentFrequency: SubscriptionFrequency;
  onSave: (frequency: SubscriptionFrequency) => void;
}) {
  const [selected, setSelected] = useState<SubscriptionFrequency>(currentFrequency);

  if (!isOpen) return null;

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
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Change Frequency
            </h3>
            <p className="text-xs text-gray-400">आवृत्ति बदलें</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-2">
          {FREQUENCY_OPTIONS.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className={`w-full rounded-xl p-4 border-2 transition-all text-left flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {opt.label}{' '}
                    <span className="font-normal text-xs opacity-70">
                      ({opt.hindi})
                    </span>
                  </p>
                  <p
                    className={`text-xs ${
                      isSelected ? 'text-blue-500' : 'text-gray-400'
                    }`}
                  >
                    {opt.desc}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => {
            onSave(selected);
            onClose();
          }}
          className="mt-5 rounded-2xl"
        >
          Save Changes / बदलाव सहेजें
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Subscriptions Page
// ---------------------------------------------------------------------------

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useT();

  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>(
    createDemoSubscriptions
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // --- Upcoming deliveries ---
  const upcomingDeliveries = useMemo(
    () => generateUpcomingDeliveries(subscriptions),
    [subscriptions]
  );

  // --- Savings calculation ---
  const savingsData = useMemo(() => {
    const activeSubs = subscriptions.filter((s) => s.isActive);
    const totalSavingsPerDelivery = activeSubs.reduce((sum, sub) => {
      const original = BASE_PRICES[sub.waterType];
      return sum + (original - sub.pricePerDelivery);
    }, 0);
    // Simulate 30 days of savings
    const deliveriesCompleted = 42;
    const totalSavings = totalSavingsPerDelivery * 15;
    const activeSinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      totalSavings,
      deliveriesCompleted,
      activeSince: activeSinceDate,
    };
  }, [subscriptions]);

  // --- Handlers ---
  const handleToggle = useCallback(
    (id: string) => {
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.id !== id) return sub;
          const newActive = !sub.isActive;
          if (newActive) {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + FREQUENCY_DAYS[sub.frequency]);
            toast.success('Subscription resumed!\nसब्सक्रिप्शन फिर शुरू!');
            return { ...sub, isActive: true, nextDeliveryDate: nextDate };
          }
          toast.info('Subscription paused.\nसब्सक्रिप्शन रोका गया।');
          return { ...sub, isActive: false };
        })
      );
    },
    []
  );

  const handleEditFrequency = useCallback((id: string) => {
    setEditingSubId(id);
  }, []);

  const handleSaveFrequency = useCallback(
    (newFrequency: SubscriptionFrequency) => {
      if (!editingSubId) return;
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.id !== editingSubId) return sub;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + FREQUENCY_DAYS[newFrequency]);
          return { ...sub, frequency: newFrequency, nextDeliveryDate: nextDate };
        })
      );
      toast.success('Frequency updated!\nआवृत्ति अपडेट हो गई!');
      setEditingSubId(null);
    },
    [editingSubId]
  );

  const handleCancel = useCallback((id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));
    toast.success('Subscription cancelled.\nसब्सक्रिप्शन रद्द हो गया।');
  }, []);

  const handleCreate = useCallback(
    (newSub: Omit<SubscriptionPlan, 'id' | 'customerId' | 'createdAt'>) => {
      const subscription: SubscriptionPlan = {
        ...newSub,
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        customerId: user?.id || 'demo_user',
        createdAt: new Date(),
      };
      setSubscriptions((prev) => [subscription, ...prev]);
      toast.success('Subscription created!\nसब्सक्रिप्शन बन गया!');
    },
    [user]
  );

  const editingSub = subscriptions.find((s) => s.id === editingSubId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ============== Header ============== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-water rounded-lg flex items-center justify-center">
              <Repeat className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Subscriptions
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                सब्सक्रिप्शन
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px] shadow-sm"
            aria-label="Create new subscription"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </header>

      {/* ============== Main Content ============== */}
      <main className="px-4 pt-4 space-y-4 app-container">
        {/* --- Subscription Banner --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-5 shadow-lg shadow-blue-200">
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-2 top-10 w-16 h-16 bg-white/10 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <span className="text-white/90 text-xs font-medium uppercase tracking-wider">
                  Smart Subscription
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                Save 10% on every delivery
              </h2>
              <p className="text-white/80 text-sm mb-1">
                हर डिलीवरी पर 10% की बचत
              </p>
              <p className="text-white/70 text-xs mb-4">
                Never run out of water / पानी कभी खत्म न हो
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors active:scale-[0.97] shadow-sm min-h-[44px]"
              >
                Create Subscription / सब्सक्रिप्शन बनाएं
              </button>
            </div>
          </div>
        </motion.div>

        {/* --- Active Subscriptions --- */}
        {subscriptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Your Subscriptions
                </p>
                <p className="text-[11px] text-gray-400">
                  आपकी सब्सक्रिप्शन
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {subscriptions.length}{' '}
                {subscriptions.length === 1 ? 'plan' : 'plans'}
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {subscriptions.map((sub, index) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <SubscriptionCard
                      subscription={sub}
                      onToggle={handleToggle}
                      onEditFrequency={handleEditFrequency}
                      onCancel={handleCancel}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* --- Empty State --- */}
        {subscriptions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-8"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-10 h-10 text-blue-300" />
            </div>
            <p className="text-gray-500 font-medium">No subscriptions yet</p>
            <p className="text-sm text-gray-400 mt-1">
              अभी तक कोई सब्सक्रिप्शन नहीं
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowCreateModal(true)}
              className="mt-6"
            >
              Create Your First / पहला बनाएं
            </Button>
          </motion.div>
        )}

        {/* --- Upcoming Deliveries Timeline --- */}
        {upcomingDeliveries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Upcoming Deliveries
              </p>
              <p className="text-[11px] text-gray-400">
                आगामी डिलीवरी
              </p>
            </div>

            <Card shadow="sm">
              <div className="space-y-0">
                {upcomingDeliveries.map((delivery, index) => {
                  const waterConfig = getWaterTypeConfig(delivery.waterType);
                  const isLast = index === upcomingDeliveries.length - 1;
                  return (
                    <div key={`${delivery.subscriptionId}-${index}`} className="flex gap-3">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                            index === 0
                              ? 'bg-blue-500 ring-4 ring-blue-100'
                              : 'bg-gray-300'
                          }`}
                        />
                        {!isLast && (
                          <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={`flex-1 flex items-center justify-between pb-4 ${
                          !isLast ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 ${waterConfig.bgColor} rounded-lg flex items-center justify-center`}
                          >
                            <span className={`${waterConfig.iconColor} [&>svg]:w-4 [&>svg]:h-4`}>
                              {waterConfig.icon}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {waterConfig.label} - {delivery.quantity}L
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(delivery.date)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            index === 0
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-50 text-gray-400'
                          }`}
                        >
                          {index === 0 ? 'Next' : 'Scheduled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* --- Savings Summary Card --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="pb-4"
        >
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Your Savings
            </p>
            <p className="text-[11px] text-gray-400">
              आपकी बचत
            </p>
          </div>

          <Card
            shadow="md"
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100"
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Total savings */}
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <IndianRupee className="w-4 h-4 text-green-600" />
                </div>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="text-xl font-bold text-green-700"
                >
                  {formatCurrency(savingsData.totalSavings)}
                </motion.p>
                <p className="text-[10px] text-green-600 font-medium mt-0.5">
                  Total Saved
                </p>
                <p className="text-[10px] text-green-500">कुल बचत</p>
              </div>

              {/* Deliveries */}
              <div className="border-x border-green-200">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="text-xl font-bold text-green-700"
                >
                  {savingsData.deliveriesCompleted}
                </motion.p>
                <p className="text-[10px] text-green-600 font-medium mt-0.5">
                  Deliveries
                </p>
                <p className="text-[10px] text-green-500">डिलीवरी</p>
              </div>

              {/* Active since */}
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                  className="text-xl font-bold text-green-700"
                >
                  {savingsData.activeSince.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </motion.p>
                <p className="text-[10px] text-green-600 font-medium mt-0.5">
                  Active Since
                </p>
                <p className="text-[10px] text-green-500">शुरू से</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* ============== Bottom Navigation ============== */}
      <BottomNav active="" />

      {/* ============== Modals ============== */}
      <CreateSubscriptionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      <AnimatePresence>
        {editingSubId && editingSub && (
          <EditFrequencyModal
            isOpen={!!editingSubId}
            onClose={() => setEditingSubId(null)}
            currentFrequency={editingSub.frequency}
            onSave={handleSaveFrequency}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
