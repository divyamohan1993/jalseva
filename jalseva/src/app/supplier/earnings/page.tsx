'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Droplets,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Wallet,
  Receipt,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn, formatCurrency } from '@/lib/utils';
import type { WaterType } from '@/types';

// =============================================================================
// Types
// =============================================================================

type EarningsPeriod = 'today' | 'week' | 'month';

interface EarningEntry {
  id: string;
  orderId: string;
  waterType: WaterType;
  quantityLitres: number;
  total: number;
  commission: number;
  earning: number;
  time: Date;
  customerArea: string;
}

interface PayoutEntry {
  id: string;
  amount: number;
  date: Date;
  status: 'completed' | 'processing' | 'failed';
  bankRef?: string;
  accountLast4: string;
}

// =============================================================================
// Constants
// =============================================================================

const WATER_TYPE_LABELS: Record<WaterType, string> = {
  ro: 'RO Purified',
  mineral: 'Mineral Water',
  tanker: 'Water Tanker',
};

const PERIOD_LABELS: Record<EarningsPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

// =============================================================================
// Mock Data
// =============================================================================

const MOCK_SUMMARY: Record<
  EarningsPeriod,
  { total: number; orders: number; commission: number; trend: number }
> = {
  today: { total: 2450, orders: 7, commission: 245, trend: 18 },
  week: { total: 14800, orders: 42, commission: 1480, trend: 12 },
  month: { total: 58200, orders: 168, commission: 5820, trend: 8 },
};

const MOCK_DAILY_EARNINGS = [
  { day: 'Mon', amount: 1800 },
  { day: 'Tue', amount: 2400 },
  { day: 'Wed', amount: 2100 },
  { day: 'Thu', amount: 3200 },
  { day: 'Fri', amount: 2800 },
  { day: 'Sat', amount: 1900 },
  { day: 'Sun', amount: 2450 },
];

const MOCK_EARNINGS: EarningEntry[] = [
  {
    id: 'e1',
    orderId: 'ord_001',
    waterType: 'tanker',
    quantityLitres: 5000,
    total: 950,
    commission: 95,
    earning: 855,
    time: new Date(Date.now() - 30 * 60000),
    customerArea: 'Sector 15, Vasundhara',
  },
  {
    id: 'e2',
    orderId: 'ord_002',
    waterType: 'ro',
    quantityLitres: 2000,
    total: 630,
    commission: 63,
    earning: 567,
    time: new Date(Date.now() - 2 * 3600000),
    customerArea: 'Lajpat Nagar',
  },
  {
    id: 'e3',
    orderId: 'ord_003',
    waterType: 'mineral',
    quantityLitres: 1000,
    total: 460,
    commission: 46,
    earning: 414,
    time: new Date(Date.now() - 3.5 * 3600000),
    customerArea: 'DLF Phase 3, Gurugram',
  },
  {
    id: 'e4',
    orderId: 'ord_004',
    waterType: 'tanker',
    quantityLitres: 10000,
    total: 1900,
    commission: 190,
    earning: 1710,
    time: new Date(Date.now() - 5 * 3600000),
    customerArea: 'Civil Lines, Delhi',
  },
  {
    id: 'e5',
    orderId: 'ord_005',
    waterType: 'ro',
    quantityLitres: 500,
    total: 280,
    commission: 28,
    earning: 252,
    time: new Date(Date.now() - 7 * 3600000),
    customerArea: 'Nehru Place',
  },
];

const MOCK_PAYOUTS: PayoutEntry[] = [
  {
    id: 'p1',
    amount: 12500,
    date: new Date(Date.now() - 2 * 86400000),
    status: 'completed',
    bankRef: 'IMPS/234567890',
    accountLast4: '4521',
  },
  {
    id: 'p2',
    amount: 8200,
    date: new Date(Date.now() - 5 * 86400000),
    status: 'completed',
    bankRef: 'IMPS/234567889',
    accountLast4: '4521',
  },
  {
    id: 'p3',
    amount: 15600,
    date: new Date(Date.now() - 9 * 86400000),
    status: 'completed',
    bankRef: 'IMPS/234567788',
    accountLast4: '4521',
  },
  {
    id: 'p4',
    amount: 3400,
    date: new Date(Date.now() - 1 * 86400000),
    status: 'processing',
    accountLast4: '4521',
  },
];

// =============================================================================
// CSS-only Bar Chart Component
// =============================================================================

function EarningsChart({
  data,
}: {
  data: { day: string; amount: number }[];
}) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
  const todayIndex = new Date().getDay(); // 0=Sun ... 6=Sat
  // Map to Mon=0 ... Sun=6
  const adjustedToday = todayIndex === 0 ? 6 : todayIndex - 1;

  return (
    <Card padding="md" shadow="sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Weekly Overview</h3>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {data.map((entry, i) => {
          const heightPercent = maxAmount > 0 ? (entry.amount / maxAmount) * 100 : 0;
          const isToday = i === adjustedToday;

          return (
            <div key={entry.day} className="flex-1 flex flex-col items-center gap-1">
              {/* Amount label */}
              <span
                className={cn(
                  'text-[9px] font-medium',
                  isToday ? 'text-green-600' : 'text-gray-400'
                )}
              >
                {(entry.amount / 1000).toFixed(1)}k
              </span>

              {/* Bar */}
              <motion.div
                className={cn(
                  'w-full max-w-[32px] rounded-t-md transition-colors duration-200',
                  isToday
                    ? 'bg-gradient-to-t from-green-600 to-green-400'
                    : 'bg-gray-200 hover:bg-gray-300'
                )}
                initial={{ height: 0 }}
                animate={{ height: `${heightPercent}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              />

              {/* Day label */}
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isToday ? 'text-green-600 font-bold' : 'text-gray-400'
                )}
              >
                {entry.day}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// =============================================================================
// EarningRow Component
// =============================================================================

function EarningRow({ entry }: { entry: EarningEntry }) {
  const [expanded, setExpanded] = useState(false);

  const timeStr = new Date(entry.time).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Droplets className="w-4 h-4 text-blue-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {WATER_TYPE_LABELS[entry.waterType]} - {entry.quantityLitres.toLocaleString()}L
          </p>
          <p className="text-xs text-gray-400">
            {entry.customerArea} &middot; {timeStr}
          </p>
        </div>

        {/* Earning */}
        <div className="text-right shrink-0 flex items-center gap-1">
          <div>
            <p className="text-sm font-bold text-green-600">
              +{formatCurrency(entry.earning)}
            </p>
            <p className="text-[10px] text-gray-400">of {formatCurrency(entry.total)}</p>
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1 ml-12 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Order Total</span>
                <span className="text-gray-700 font-medium">
                  {formatCurrency(entry.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1">
                  Commission (10%)
                  <Info className="w-3 h-3 text-gray-300" />
                </span>
                <span className="text-red-500 font-medium">
                  -{formatCurrency(entry.commission)}
                </span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-semibold">Your Earning</span>
                <span className="text-green-600 font-bold">
                  {formatCurrency(entry.earning)}
                </span>
              </div>
              <p className="text-[10px] text-gray-300 mt-1">
                Order #{entry.orderId}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// PayoutCard Component
// =============================================================================

function PayoutCard({ payout }: { payout: PayoutEntry }) {
  const dateStr = new Date(payout.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const statusConfig = {
    completed: {
      label: 'Completed',
      color: 'text-green-700',
      bg: 'bg-green-100',
      icon: CheckCircle2,
    },
    processing: {
      label: 'Processing',
      color: 'text-yellow-700',
      bg: 'bg-yellow-100',
      icon: Clock,
    },
    failed: {
      label: 'Failed',
      color: 'text-red-700',
      bg: 'bg-red-100',
      icon: Info,
    },
  };

  const cfg = statusConfig[payout.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
        <Landmark className="w-4 h-4 text-purple-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          Bank Transfer &middot; ****{payout.accountLast4}
        </p>
        <p className="text-xs text-gray-400">
          {dateStr}
          {payout.bankRef && ` | ${payout.bankRef}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900">
          {formatCurrency(payout.amount)}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
            cfg.bg,
            cfg.color
          )}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Supplier Earnings Page
// =============================================================================

export default function SupplierEarningsPage() {
  const [period, setPeriod] = useState<EarningsPeriod>('today');

  const summary = MOCK_SUMMARY[period];
  const trendUp = summary.trend >= 0;

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Earnings</h1>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Period Selector                                                   */}
      {/* ================================================================ */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {(Object.keys(PERIOD_LABELS) as EarningsPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex-1 relative py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200',
              period === p
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {period === p && (
              <motion.div
                layoutId="earnings-period-tab"
                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <span className="relative z-10">{PERIOD_LABELS[p]}</span>
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Summary Cards                                                    */}
      {/* ================================================================ */}
      <Card padding="lg" shadow="md" className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-200 text-sm font-medium">
              {PERIOD_LABELS[period]} Earnings
            </p>
            <p className="text-3xl font-bold text-white mt-1">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <div
            className={cn(
              'flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold',
              trendUp
                ? 'bg-green-500/30 text-green-100'
                : 'bg-red-500/30 text-red-200'
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(summary.trend)}%
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-white">{summary.orders}</p>
            <p className="text-[10px] text-green-200 font-medium">Orders</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary.commission)}
            </p>
            <p className="text-[10px] text-green-200 font-medium">Commission</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5 text-center">
            <p className="text-xl font-bold text-white">
              {formatCurrency(Math.round(summary.total / (summary.orders || 1)))}
            </p>
            <p className="text-[10px] text-green-200 font-medium">Avg/Order</p>
          </div>
        </div>
      </Card>

      {/* ================================================================ */}
      {/* Commission Transparency Note                                     */}
      {/* ================================================================ */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-50 rounded-xl border border-yellow-100">
        <Info className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-yellow-800 font-medium">
            Platform Commission: 10%
          </p>
          <p className="text-[10px] text-yellow-600 mt-0.5">
            Commission of {formatCurrency(summary.commission)} has been deducted
            from {summary.orders} orders this {period === 'today' ? 'day' : period}.
          </p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Weekly Bar Chart                                                 */}
      {/* ================================================================ */}
      <EarningsChart data={MOCK_DAILY_EARNINGS} />

      {/* ================================================================ */}
      {/* Order-by-Order Breakdown                                         */}
      {/* ================================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-gray-400" />
            Order Breakdown
          </h2>
          <span className="text-xs text-gray-400">
            {MOCK_EARNINGS.length} orders
          </span>
        </div>

        <Card padding="sm" shadow="sm">
          {MOCK_EARNINGS.map((entry) => (
            <EarningRow key={entry.id} entry={entry} />
          ))}
        </Card>
      </section>

      {/* ================================================================ */}
      {/* Payout History                                                   */}
      {/* ================================================================ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-gray-400" />
            Payout History
          </h2>
        </div>

        <Card padding="sm" shadow="sm">
          {MOCK_PAYOUTS.map((payout) => (
            <PayoutCard key={payout.id} payout={payout} />
          ))}
        </Card>

        {/* Total Paid Out */}
        <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">
              Total Paid Out
            </span>
          </div>
          <span className="text-lg font-bold text-purple-700">
            {formatCurrency(
              MOCK_PAYOUTS.filter((p) => p.status === 'completed').reduce(
                (s, p) => s + p.amount,
                0
              )
            )}
          </span>
        </div>
      </section>
    </div>
  );
}
