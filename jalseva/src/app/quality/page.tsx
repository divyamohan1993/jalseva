'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Shield,
  Star,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Beaker,
  Send,
  Home,
  ClipboardList,
  ScrollText,
  User,
  Info,
  Award,
  FlaskConical,
  ThermometerSun,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useT } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Constants & Demo Data
// ---------------------------------------------------------------------------

const AREA_QUALITY_SCORE = 87;
const PH_VALUE = 7.2;
const TDS_VALUE = 180;
const LAST_TESTED = '3 days ago';
const FSSAI_COMPLIANT = true;

const SUPPLIERS = [
  {
    id: 1,
    name: 'AquaPure Suppliers',
    nameHi: 'एक्वाप्योर सप्लायर्स',
    score: 92,
    badge: 'Premium',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    ph: 7.0,
    tds: 150,
    rating: 4.8,
  },
  {
    id: 2,
    name: 'JalDhara Water Co.',
    nameHi: 'जलधारा वाटर कं.',
    score: 85,
    badge: 'Verified',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ph: 7.3,
    tds: 200,
    rating: 4.5,
  },
  {
    id: 3,
    name: 'SwiftWater Delivery',
    nameHi: 'स्विफ्टवाटर डिलीवरी',
    score: 71,
    badge: 'Basic',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-300',
    ph: 7.6,
    tds: 280,
    rating: 3.9,
  },
];

const ISSUE_TYPES = [
  { key: 'taste', label: 'Bad Taste', labelHi: 'खराब स्वाद' },
  { key: 'odor', label: 'Odor', labelHi: 'बदबू' },
  { key: 'color', label: 'Color', labelHi: 'रंग' },
  { key: 'sediment', label: 'Sediment', labelHi: 'तलछट' },
];

const QUALITY_TIPS = [
  {
    key: 'tds',
    question: 'What is TDS?',
    questionHi: 'TDS क्या है?',
    answer:
      'Total Dissolved Solids (TDS) measures the combined content of all organic and inorganic substances in water. Ideal drinking water TDS is between 50-300 ppm. Higher TDS may indicate hard water or contamination.',
    answerHi:
      'कुल घुलित ठोस (TDS) पानी में सभी कार्बनिक और अकार्बनिक पदार्थों की मात्रा मापता है। पीने के पानी का आदर्श TDS 50-300 ppm के बीच होता है।',
  },
  {
    key: 'ph',
    question: 'Safe pH Levels',
    questionHi: 'सुरक्षित pH स्तर',
    answer:
      'The pH scale ranges from 0-14, with 7 being neutral. Safe drinking water should have a pH between 6.5-8.5. Water below 6.5 is acidic and may corrode pipes, while above 8.5 it may taste bitter.',
    answerHi:
      'pH पैमाना 0-14 तक होता है, 7 तटस्थ है। सुरक्षित पीने के पानी का pH 6.5-8.5 के बीच होना चाहिए।',
  },
  {
    key: 'verify',
    question: 'How We Verify Quality',
    questionHi: 'हम गुणवत्ता कैसे सत्यापित करते हैं',
    answer:
      'Every supplier on JalSeva undergoes rigorous quality testing. We check pH, TDS, bacterial contamination, and heavy metals. Suppliers are re-tested monthly and must maintain FSSAI compliance to stay on our platform.',
    answerHi:
      'JalSeva पर हर सप्लायर की कड़ी गुणवत्ता जांच होती है। हम pH, TDS, बैक्टीरियल संदूषण और भारी धातुओं की जांच करते हैं।',
  },
];

// ---------------------------------------------------------------------------
// Helper: Score Color
// ---------------------------------------------------------------------------

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score > 80) return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 60) return { stroke: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-50' };
  return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-50' };
}

function getScoreLabel(score: number): { en: string; hi: string } {
  if (score > 80) return { en: 'Excellent', hi: 'उत्कृष्ट' };
  if (score >= 60) return { en: 'Good', hi: 'अच्छा' };
  return { en: 'Poor', hi: 'खराब' };
}

// ---------------------------------------------------------------------------
// Bottom Navigation (shared)
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
// Circular Score Indicator (SVG)
// ---------------------------------------------------------------------------

function CircularScore({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Background ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        {/* Progress ring */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-bold ${colors.text}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-gray-500 font-medium">
          {label.en} / {label.hi}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// pH Bar Indicator
// ---------------------------------------------------------------------------

function PhBar({ value }: { value: number }) {
  const percentage = (value / 14) * 100;
  // Safe zone: 6.5 - 8.5 out of 14
  const safeStart = (6.5 / 14) * 100;
  const safeEnd = (8.5 / 14) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">pH Level</span>
          <span className="text-xs text-gray-400">/ pH स्तर</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {/* pH gradient background */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
          }}
        />
        {/* Safe zone overlay */}
        <div
          className="absolute top-0 h-full border-2 border-white/80 rounded-full"
          style={{
            left: `${safeStart}%`,
            width: `${safeEnd - safeStart}%`,
            boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.4)',
          }}
        />
        {/* Value indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-800"
          initial={{ left: '0%' }}
          animate={{ left: `calc(${percentage}% - 8px)` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0 (Acidic)</span>
        <span className="text-green-600 font-medium">6.5 - 8.5 Safe</span>
        <span>14 (Alkaline)</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TDS Bar Indicator
// ---------------------------------------------------------------------------

function TdsBar({ value }: { value: number }) {
  const maxTds = 600;
  const percentage = Math.min((value / maxTds) * 100, 100);
  // Ideal zone: 50 - 300 ppm
  const idealStart = (50 / maxTds) * 100;
  const idealEnd = (300 / maxTds) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">TDS Level</span>
          <span className="text-xs text-gray-400">/ TDS स्तर</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{value} ppm</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        {/* Gradient bar */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(to right, #93c5fd, #3b82f6, #22c55e, #22c55e, #eab308, #ef4444)',
          }}
        />
        {/* Ideal zone highlight */}
        <div
          className="absolute top-0 h-full border-2 border-white/80 rounded-full"
          style={{
            left: `${idealStart}%`,
            width: `${idealEnd - idealStart}%`,
            boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.4)',
          }}
        />
        {/* Value indicator */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-800"
          initial={{ left: '0%' }}
          animate={{ left: `calc(${percentage}% - 8px)` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0 ppm</span>
        <span className="text-green-600 font-medium">50 - 300 Ideal</span>
        <span>600+ ppm</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier Card
// ---------------------------------------------------------------------------

function SupplierCard({
  supplier,
  rank,
}: {
  supplier: (typeof SUPPLIERS)[number];
  rank: number;
}) {
  const colors = getScoreColor(supplier.score);

  return (
    <Card shadow="sm" className="relative overflow-hidden">
      {/* Rank badge */}
      <div className="absolute top-3 right-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${supplier.badgeColor}`}
        >
          <Award className="w-3 h-3" />
          {supplier.badge}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {/* Rank number */}
        <div
          className={`w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center shrink-0`}
        >
          <span className={`text-sm font-bold ${colors.text}`}>#{rank}</span>
        </div>

        <div className="flex-1 min-w-0 pr-16">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {supplier.name}
          </p>
          <p className="text-[10px] text-gray-400 truncate">
            {supplier.nameHi}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-bold ${colors.text}`}>
              {supplier.score}/100
            </span>
            <span className="text-xs text-gray-400">
              pH {supplier.ph}
            </span>
            <span className="text-xs text-gray-400">
              TDS {supplier.tds}
            </span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1 mt-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.floor(supplier.rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : star === Math.ceil(supplier.rating) &&
                        supplier.rating % 1 >= 0.25
                      ? 'text-yellow-300 fill-yellow-300'
                      : 'text-gray-200 fill-gray-200'
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              {supplier.rating}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Accordion Tip Card
// ---------------------------------------------------------------------------

function TipAccordion({
  tip,
  isOpen,
  onToggle,
}: {
  tip: (typeof QUALITY_TIPS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Card shadow="sm" padding="none" className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left min-h-[52px]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{tip.question}</p>
            <p className="text-[10px] text-gray-400">{tip.questionHi}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="bg-blue-50/50 rounded-xl p-3">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {tip.answer}
                </p>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {tip.answerHi}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Quality Page
// ---------------------------------------------------------------------------

export default function QualityPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useT();

  // Report issue state
  const [issueType, setIssueType] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Accordion state
  const [openTip, setOpenTip] = useState<string | null>(null);

  // Handle issue submission
  const handleSubmitIssue = async () => {
    if (!issueType) {
      toast.error('Please select an issue type.\nकृपया समस्या का प्रकार चुनें।');
      return;
    }
    if (!issueDescription.trim()) {
      toast.error('Please describe the issue.\nकृपया समस्या का वर्णन करें।');
      return;
    }

    setSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSubmitting(false);

    toast.success('Issue reported successfully!\nसमस्या सफलतापूर्वक दर्ज हो गई!');
    setIssueType('');
    setIssueDescription('');
  };

  const scoreColors = getScoreColor(AREA_QUALITY_SCORE);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-water rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Water Quality
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                जल गुणवत्ता
              </p>
            </div>
          </div>

          {/* FSSAI badge */}
          {FSSAI_COMPLIANT && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
              <Shield className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-semibold text-green-700">
                FSSAI
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-5 space-y-5 app-container">
        {/* ---- Quality Overview Card ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card shadow="md" padding="lg">
            <div className="text-center mb-4">
              <h2 className="text-base font-bold text-gray-900">
                Area Quality Score
              </h2>
              <p className="text-xs text-gray-400">
                क्षेत्र गुणवत्ता स्कोर
              </p>
            </div>

            <CircularScore score={AREA_QUALITY_SCORE} />

            {/* Meta row */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-gray-600">FSSAI Compliant</span>
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5">
                <ThermometerSun className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs text-gray-500">
                  Tested {LAST_TESTED}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ---- Water Parameters ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card shadow="sm" padding="lg">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Water Parameters
              </h3>
              <p className="text-[10px] text-gray-400">
                जल मापदंड
              </p>
            </div>

            <div className="space-y-5">
              <PhBar value={PH_VALUE} />
              <div className="border-t border-gray-100" />
              <TdsBar value={TDS_VALUE} />
            </div>

            {/* FSSAI / Last tested row */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Shield className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-green-700">
                  FSSAI Compliant
                </p>
                <p className="text-[10px] text-green-600">
                  अनुपालित
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <ThermometerSun className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-blue-700">
                  Last Tested
                </p>
                <p className="text-[10px] text-blue-600">
                  {LAST_TESTED}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ---- Quality Comparison ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Supplier Quality Ranking
            </h3>
            <p className="text-[10px] text-gray-400">
              सप्लायर गुणवत्ता रैंकिंग
            </p>
          </div>

          <div className="space-y-2.5">
            {SUPPLIERS.map((supplier, index) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <SupplierCard supplier={supplier} rank={index + 1} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ---- Report Issue ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card shadow="sm" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Report Quality Issue
                </h3>
                <p className="text-[10px] text-gray-400">
                  गुणवत्ता समस्या की रिपोर्ट करें
                </p>
              </div>
            </div>

            {/* Issue type selector */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 mb-2 block">
                Issue Type / समस्या का प्रकार
              </label>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map((issue) => (
                  <button
                    key={issue.key}
                    onClick={() => setIssueType(issue.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all min-h-[40px] ${
                      issueType === issue.key
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {issue.label}
                    <span className="block text-[9px] opacity-70">
                      {issue.labelHi}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label
                htmlFor="issue-description"
                className="text-xs font-medium text-gray-600 mb-1.5 block"
              >
                Description / विवरण
              </label>
              <textarea
                id="issue-description"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe the quality issue you noticed..."
                rows={3}
                className="input-field resize-none text-sm"
              />
            </div>

            {/* Submit */}
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={submitting}
              onClick={handleSubmitIssue}
              leftIcon={<Send className="w-5 h-5" />}
              className="rounded-2xl"
            >
              Submit Report / रिपोर्ट दर्ज करें
            </Button>
          </Card>
        </motion.div>

        {/* ---- Quality Tips ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Quality Tips
            </h3>
            <p className="text-[10px] text-gray-400">
              गुणवत्ता सुझाव
            </p>
          </div>

          <div className="space-y-2">
            {QUALITY_TIPS.map((tip, index) => (
              <motion.div
                key={tip.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.55 + index * 0.08 }}
              >
                <TipAccordion
                  tip={tip}
                  isOpen={openTip === tip.key}
                  onToggle={() =>
                    setOpenTip(openTip === tip.key ? null : tip.key)
                  }
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer text */}
        <p className="text-center text-xs text-gray-300 pt-2 pb-4">
          Data sourced from certified labs / प्रमाणित प्रयोगशालाओं से डेटा
        </p>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="" />
    </div>
  );
}
