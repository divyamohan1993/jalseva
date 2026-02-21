'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Phone,
  Truck,
  FileText,
  MapPin,
  Droplets,
  Landmark,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Shield,
  Edit3,
  Settings,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Hash,
  Gauge,
  CreditCard,
  Building,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { VerificationStatus, WaterType } from '@/types';

// =============================================================================
// Constants
// =============================================================================

const WATER_TYPE_OPTIONS: { key: WaterType; label: string; description: string }[] = [
  { key: 'ro', label: 'RO Purified', description: 'Reverse osmosis purified water' },
  { key: 'mineral', label: 'Mineral Water', description: 'Packaged mineral water' },
  { key: 'tanker', label: 'Water Tanker', description: 'Bulk water tanker supply' },
];

const VERIFICATION_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  verified: {
    label: 'Verified',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: Clock,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
};

// =============================================================================
// Mock data (in production, pulled from supplierStore & authStore)
// =============================================================================

const MOCK_PROFILE = {
  name: 'Rajesh Kumar',
  phone: '+91 98765 43210',
  rating: 4.6,
  totalOrders: 342,
  memberSince: 'March 2024',
  vehicle: {
    type: 'Water Tanker Truck',
    capacity: 10000,
    number: 'DL 01 AB 1234',
  },
  documents: {
    aadhaar: { status: 'verified' as VerificationStatus, uploadedAt: '15 Jan 2024' },
    license: { status: 'verified' as VerificationStatus, uploadedAt: '15 Jan 2024' },
    vehicleRC: { status: 'verified' as VerificationStatus, uploadedAt: '15 Jan 2024' },
    fssai: { status: 'pending' as VerificationStatus, uploadedAt: '10 Feb 2024' },
    waterQuality: { status: 'rejected' as VerificationStatus, uploadedAt: '12 Feb 2024' },
  },
  serviceArea: 'Vasundhara, Ghaziabad',
  serviceRadius: 15,
  waterTypes: ['ro', 'tanker'] as WaterType[],
  bank: {
    accountNumber: '****4521',
    ifsc: 'SBIN0001234',
    holderName: 'Rajesh Kumar',
  },
};

// =============================================================================
// Section Components
// =============================================================================

function ProfileHeader() {
  return (
    <Card padding="lg" shadow="md" className="relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-green-600 to-green-500 rounded-t-2xl" />

      <div className="relative pt-6">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
            <User className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Name & Info */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h2 className="text-xl font-bold text-gray-900">
              {MOCK_PROFILE.name}
            </h2>
            <Shield className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {MOCK_PROFILE.phone}
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900">
                {MOCK_PROFILE.rating}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Rating</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {MOCK_PROFILE.totalOrders}
            </p>
            <p className="text-[10px] text-gray-400">Orders</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 text-sm">
              {MOCK_PROFILE.memberSince}
            </p>
            <p className="text-[10px] text-gray-400">Member Since</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function VehicleSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <Truck className="w-4 h-4 text-gray-400" />
        Vehicle Details
      </h3>
      <Card padding="md" shadow="sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Truck className="w-4 h-4" />
              Type
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.vehicle.type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Gauge className="w-4 h-4" />
              Capacity
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.vehicle.capacity.toLocaleString()} L
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Hash className="w-4 h-4" />
              Vehicle Number
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.vehicle.number}
            </span>
          </div>
        </div>
        <button className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1 text-sm text-green-600 font-medium hover:text-green-700 transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
          Edit Vehicle Details
        </button>
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------

function DocumentsSection() {
  const docs = [
    { key: 'aadhaar', label: 'Aadhaar Card', ...MOCK_PROFILE.documents.aadhaar },
    { key: 'license', label: 'Driving License', ...MOCK_PROFILE.documents.license },
    { key: 'vehicleRC', label: 'Vehicle RC', ...MOCK_PROFILE.documents.vehicleRC },
    { key: 'fssai', label: 'FSSAI Certificate', ...MOCK_PROFILE.documents.fssai },
    {
      key: 'waterQuality',
      label: 'Water Quality Certificate',
      ...MOCK_PROFILE.documents.waterQuality,
    },
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-gray-400" />
        Documents Status
      </h3>
      <Card padding="sm" shadow="sm">
        {docs.map((doc, i) => {
          const cfg = VERIFICATION_CONFIG[doc.status];
          const StatusIcon = cfg.icon;

          return (
            <div
              key={doc.key}
              className={cn(
                'flex items-center justify-between py-3 px-2',
                i < docs.length - 1 && 'border-b border-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                  <p className="text-[10px] text-gray-400">
                    Uploaded: {doc.uploadedAt}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  cfg.bg,
                  cfg.color
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
          );
        })}

        {/* Re-upload warning for rejected */}
        {MOCK_PROFILE.documents.waterQuality.status === 'rejected' && (
          <div className="mx-2 mb-2 p-2.5 bg-red-50 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-red-700 font-medium">
                Water Quality Certificate rejected
              </p>
              <p className="text-[10px] text-red-600 mt-0.5">
                Please re-upload a valid certificate to continue receiving
                mineral water orders.
              </p>
              <button className="mt-1.5 text-[10px] text-red-700 font-bold underline">
                Re-upload Document
              </button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------

function ServiceAreaSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-gray-400" />
        Service Area
      </h3>
      <Card padding="md" shadow="sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.serviceArea}
            </p>
            <p className="text-xs text-gray-400">
              Radius: {MOCK_PROFILE.serviceRadius} km
            </p>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-green-600 transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Mini map placeholder */}
        <div className="mt-3 h-24 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <MapPin className="w-4 h-4" />
            Service area map
          </div>
        </div>
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------

function WaterTypesSection() {
  const [enabledTypes, setEnabledTypes] = useState<WaterType[]>(
    MOCK_PROFILE.waterTypes
  );

  const toggleType = (type: WaterType) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <Droplets className="w-4 h-4 text-gray-400" />
        Water Types Offered
      </h3>
      <Card padding="sm" shadow="sm">
        {WATER_TYPE_OPTIONS.map((wt, i) => {
          const enabled = enabledTypes.includes(wt.key);
          return (
            <button
              key={wt.key}
              onClick={() => toggleType(wt.key)}
              className={cn(
                'w-full flex items-center justify-between py-3 px-3 text-left transition-colors',
                i < WATER_TYPE_OPTIONS.length - 1 && 'border-b border-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    enabled ? 'bg-blue-100' : 'bg-gray-100'
                  )}
                >
                  <Droplets
                    className={cn(
                      'w-4 h-4',
                      enabled ? 'text-blue-500' : 'text-gray-300'
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      enabled ? 'text-gray-900' : 'text-gray-400'
                    )}
                  >
                    {wt.label}
                  </p>
                  <p className="text-[10px] text-gray-400">{wt.description}</p>
                </div>
              </div>
              {enabled ? (
                <ToggleRight className="w-7 h-7 text-green-500" />
              ) : (
                <ToggleLeft className="w-7 h-7 text-gray-300" />
              )}
            </button>
          );
        })}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------

function BankDetailsSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <Landmark className="w-4 h-4 text-gray-400" />
        Bank Details
      </h3>
      <Card padding="md" shadow="sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CreditCard className="w-4 h-4" />
              Account Number
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.bank.accountNumber}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building className="w-4 h-4" />
              IFSC Code
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.bank.ifsc}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-4 h-4" />
              Account Holder
            </div>
            <span className="text-sm font-medium text-gray-900">
              {MOCK_PROFILE.bank.holderName}
            </span>
          </div>
        </div>
        <button className="mt-3 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1 text-sm text-green-600 font-medium hover:text-green-700 transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
          Update Bank Details
        </button>
      </Card>
    </section>
  );
}

// =============================================================================
// Supplier Profile Page
// =============================================================================

export default function SupplierProfilePage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Profile Header */}
      <ProfileHeader />

      {/* Vehicle Details */}
      <VehicleSection />

      {/* Documents Status */}
      <DocumentsSection />

      {/* Service Area */}
      <ServiceAreaSection />

      {/* Water Types */}
      <WaterTypesSection />

      {/* Bank Details */}
      <BankDetailsSection />

      {/* ================================================================ */}
      {/* Settings & Logout                                                */}
      {/* ================================================================ */}
      <section className="space-y-2">
        <button className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 rounded-xl border border-red-100 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </section>

      {/* ================================================================ */}
      {/* Logout Confirmation Modal                                        */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl w-full max-w-lg p-6"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <LogOut className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Confirm Logout
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  You will stop receiving orders once you log out.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onClick={() => setShowLogoutConfirm(false)}
                  className="border border-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={handleLogout}
                  leftIcon={<LogOut className="w-5 h-5" />}
                >
                  Logout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
}
