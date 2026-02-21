'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Phone,
  Truck,
  FileText,
  MapPin,
  Landmark,
  Camera,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Droplets,
  ArrowRight,
  Hash,
  Gauge,
  CreditCard,
  Building,
  X,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

// =============================================================================
// Types
// =============================================================================

type RegistrationStep = 1 | 2 | 3 | 4 | 5 | 6;

interface PersonalInfo {
  name: string;
  phone: string;
}

interface VehicleDetails {
  type: string;
  capacity: string;
  number: string;
}

interface DocumentUpload {
  file: File | null;
  preview: string | null;
  name: string;
}

interface DocumentUploads {
  aadhaarFront: DocumentUpload;
  aadhaarBack: DocumentUpload;
  license: DocumentUpload;
  vehicleRC: DocumentUpload;
  fssai: DocumentUpload;
  waterQuality: DocumentUpload;
}

interface ServiceAreaInfo {
  pincode: string;
  area: string;
  radiusKm: string;
}

interface BankDetailsInfo {
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
  holderName: string;
}

// =============================================================================
// Constants
// =============================================================================

const VEHICLE_TYPES = [
  { value: 'mini_truck', label: 'Mini Truck (1000-2000L)' },
  { value: 'truck', label: 'Truck (5000-10000L)' },
  { value: 'tanker', label: 'Tanker (10000-20000L)' },
  { value: 'auto', label: 'Auto/3-wheeler (500-1000L)' },
  { value: 'cart', label: 'Cart/2-wheeler (200-500L)' },
];

const STEPS: { step: RegistrationStep; label: string; icon: typeof User }[] = [
  { step: 1, label: 'Personal', icon: User },
  { step: 2, label: 'Vehicle', icon: Truck },
  { step: 3, label: 'Documents', icon: FileText },
  { step: 4, label: 'Area', icon: MapPin },
  { step: 5, label: 'Bank', icon: Landmark },
  { step: 6, label: 'Review', icon: CheckCircle2 },
];

const INITIAL_DOCUMENTS: DocumentUploads = {
  aadhaarFront: { file: null, preview: null, name: 'Aadhaar Card (Front)' },
  aadhaarBack: { file: null, preview: null, name: 'Aadhaar Card (Back)' },
  license: { file: null, preview: null, name: 'Driving License' },
  vehicleRC: { file: null, preview: null, name: 'Vehicle RC' },
  fssai: { file: null, preview: null, name: 'FSSAI Certificate (Optional)' },
  waterQuality: { file: null, preview: null, name: 'Water Quality Certificate (Optional)' },
};

// =============================================================================
// File Upload Component
// =============================================================================

interface FileUploadAreaProps {
  docKey: string;
  doc: DocumentUpload;
  required?: boolean;
  onUpload: (key: string, file: File) => void;
  onRemove: (key: string) => void;
}

function FileUploadArea({
  docKey,
  doc,
  required = true,
  onUpload,
  onRemove,
}: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(docKey, file);
    }
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id={`upload-${docKey}`}
      />

      {doc.preview ? (
        // Preview uploaded document
        <div className="relative group">
          <div className="h-32 rounded-xl overflow-hidden border-2 border-green-200 bg-green-50">
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-xs font-medium">{doc.file?.name || 'Uploaded'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onRemove(docKey)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 font-medium truncate">
              {doc.name}
            </span>
          </div>
        </div>
      ) : (
        // Upload prompt
        <label
          htmlFor={`upload-${docKey}`}
          className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-green-400 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:shadow-md transition-shadow">
            <Camera className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors" />
          </div>
          <p className="text-sm font-medium text-gray-600 group-hover:text-green-600 transition-colors">
            {doc.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Tap to capture or upload {!required && '(optional)'}
          </p>
        </label>
      )}
    </div>
  );
}

// =============================================================================
// Progress Indicator
// =============================================================================

function ProgressIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: RegistrationStep;
  onStepClick: (step: RegistrationStep) => void;
}) {
  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((s, i) => {
        const isCompleted = currentStep > s.step;
        const isCurrent = currentStep === s.step;
        const Icon = s.icon;

        return (
          <React.Fragment key={s.step}>
            <button
              onClick={() => {
                if (isCompleted || isCurrent) onStepClick(s.step);
              }}
              disabled={!isCompleted && !isCurrent}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-green-100 text-green-600 ring-2 ring-green-400 ring-offset-2'
                    : 'bg-gray-100 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] font-medium',
                  isCurrent
                    ? 'text-green-600'
                    : isCompleted
                    ? 'text-green-500'
                    : 'text-gray-400'
                )}
              >
                {s.label}
              </span>
            </button>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300',
                  currentStep > s.step ? 'bg-green-400' : 'bg-gray-200'
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
// Supplier Registration Page
// =============================================================================

export default function SupplierRegisterPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // --------------------------------------------------------------------------
  // Form State
  // --------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [personal, setPersonal] = useState<PersonalInfo>({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [vehicle, setVehicle] = useState<VehicleDetails>({
    type: '',
    capacity: '',
    number: '',
  });

  const [documents, setDocuments] = useState<DocumentUploads>(INITIAL_DOCUMENTS);

  const [serviceArea, setServiceArea] = useState<ServiceAreaInfo>({
    pincode: '',
    area: '',
    radiusKm: '10',
  });

  const [bank, setBank] = useState<BankDetailsInfo>({
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    holderName: '',
  });

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------
  const validateStep = (step: RegistrationStep): boolean => {
    switch (step) {
      case 1:
        return personal.name.trim().length >= 2 && personal.phone.trim().length >= 10;
      case 2:
        return (
          vehicle.type !== '' &&
          vehicle.capacity !== '' &&
          parseInt(vehicle.capacity, 10) > 0 &&
          vehicle.number.trim().length >= 4
        );
      case 3:
        // At minimum, Aadhaar front, license, and RC are required
        return (
          documents.aadhaarFront.file !== null &&
          documents.license.file !== null &&
          documents.vehicleRC.file !== null
        );
      case 4:
        return (
          serviceArea.pincode.trim().length === 6 &&
          serviceArea.area.trim().length >= 2
        );
      case 5:
        return (
          bank.accountNumber.trim().length >= 8 &&
          bank.accountNumber === bank.confirmAccountNumber &&
          bank.ifsc.trim().length === 11 &&
          bank.holderName.trim().length >= 2
        );
      case 6:
        return true;
      default:
        return false;
    }
  };

  const isStepValid = validateStep(currentStep);

  // --------------------------------------------------------------------------
  // Document Upload Handlers
  // --------------------------------------------------------------------------
  const handleDocUpload = useCallback((key: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments((prev) => ({
        ...prev,
        [key]: {
          ...prev[key as keyof DocumentUploads],
          file,
          preview: reader.result as string,
        },
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDocRemove = useCallback((key: string) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: {
        ...prev[key as keyof DocumentUploads],
        file: null,
        preview: null,
      },
    }));
  }, []);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------
  const goNext = () => {
    if (currentStep < 6 && isStepValid) {
      setCurrentStep((s) => (s + 1) as RegistrationStep);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as RegistrationStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    // Navigate to supplier dashboard
    router.replace('/supplier');
  };

  // --------------------------------------------------------------------------
  // Step Content
  // --------------------------------------------------------------------------
  const renderStep = () => {
    switch (currentStep) {
      // ======================================================================
      // Step 1: Personal Info
      // ======================================================================
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tell us about yourself to get started
              </p>
            </div>

            <Card padding="lg" shadow="sm">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={personal.name}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Enter your full name"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={personal.phone}
                      onChange={(e) =>
                        setPersonal((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    This number will be used for customer communication
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );

      // ======================================================================
      // Step 2: Vehicle Details
      // ======================================================================
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Vehicle Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Information about your water delivery vehicle
              </p>
            </div>

            <Card padding="lg" shadow="sm">
              <div className="space-y-4">
                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={vehicle.type}
                      onChange={(e) =>
                        setVehicle((v) => ({ ...v, type: e.target.value }))
                      }
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base appearance-none bg-white transition-all"
                    >
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map((vt) => (
                        <option key={vt.value} value={vt.value}>
                          {vt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90" />
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tank Capacity (Litres) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={vehicle.capacity}
                      onChange={(e) =>
                        setVehicle((v) => ({ ...v, capacity: e.target.value }))
                      }
                      placeholder="e.g. 5000"
                      min="100"
                      max="50000"
                      className="w-full pl-11 pr-16 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                      Litres
                    </span>
                  </div>
                </div>

                {/* Vehicle Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle Registration Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={vehicle.number}
                      onChange={(e) =>
                        setVehicle((v) => ({
                          ...v,
                          number: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="DL 01 AB 1234"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base uppercase transition-all"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );

      // ======================================================================
      // Step 3: Document Uploads
      // ======================================================================
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Document Upload</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload clear photos of required documents for verification
              </p>
            </div>

            {/* Required documents */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Required Documents
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FileUploadArea
                  docKey="aadhaarFront"
                  doc={documents.aadhaarFront}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
                <FileUploadArea
                  docKey="aadhaarBack"
                  doc={documents.aadhaarBack}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
                <FileUploadArea
                  docKey="license"
                  doc={documents.license}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
                <FileUploadArea
                  docKey="vehicleRC"
                  doc={documents.vehicleRC}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
              </div>
            </div>

            {/* Optional documents */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Optional Documents
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FileUploadArea
                  docKey="fssai"
                  doc={documents.fssai}
                  required={false}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
                <FileUploadArea
                  docKey="waterQuality"
                  doc={documents.waterQuality}
                  required={false}
                  onUpload={handleDocUpload}
                  onRemove={handleDocRemove}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Your documents are securely stored and used only for
                verification purposes. They will not be shared with customers.
              </p>
            </div>
          </motion.div>
        );

      // ======================================================================
      // Step 4: Service Area
      // ======================================================================
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Service Area</h2>
              <p className="text-sm text-gray-500 mt-1">
                Define the area where you want to receive delivery requests
              </p>
            </div>

            <Card padding="lg" shadow="sm">
              <div className="space-y-4">
                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={serviceArea.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setServiceArea((s) => ({ ...s, pincode: val }));
                      }}
                      placeholder="Enter 6-digit pincode"
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                </div>

                {/* Area Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Area / Locality <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={serviceArea.area}
                      onChange={(e) =>
                        setServiceArea((s) => ({ ...s, area: e.target.value }))
                      }
                      placeholder="e.g. Vasundhara, Ghaziabad"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                </div>

                {/* Radius */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Service Radius (km)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={serviceArea.radiusKm}
                      onChange={(e) =>
                        setServiceArea((s) => ({ ...s, radiusKm: e.target.value }))
                      }
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                    <span className="text-sm font-bold text-green-600 min-w-[40px] text-right">
                      {serviceArea.radiusKm} km
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    You will receive orders within this radius from your base location
                  </p>
                </div>
              </div>
            </Card>

            {/* Map placeholder */}
            <div className="h-40 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-gray-100 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <MapPin className="w-8 h-8 text-green-400" />
                <span className="text-xs font-medium">
                  Map view - select area
                </span>
              </div>
            </div>
          </motion.div>
        );

      // ======================================================================
      // Step 5: Bank Details
      // ======================================================================
      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bank Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Where should we send your earnings?
              </p>
            </div>

            <Card padding="lg" shadow="sm">
              <div className="space-y-4">
                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={bank.accountNumber}
                      onChange={(e) =>
                        setBank((b) => ({
                          ...b,
                          accountNumber: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Enter account number"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                </div>

                {/* Confirm Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={bank.confirmAccountNumber}
                      onChange={(e) =>
                        setBank((b) => ({
                          ...b,
                          confirmAccountNumber: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      placeholder="Re-enter account number"
                      className={cn(
                        'w-full pl-11 pr-4 py-3 rounded-xl border outline-none text-gray-900 text-base transition-all',
                        bank.confirmAccountNumber &&
                          bank.accountNumber !== bank.confirmAccountNumber
                          ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                      )}
                    />
                  </div>
                  {bank.confirmAccountNumber &&
                    bank.accountNumber !== bank.confirmAccountNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        Account numbers do not match
                      </p>
                    )}
                </div>

                {/* IFSC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={bank.ifsc}
                      onChange={(e) =>
                        setBank((b) => ({
                          ...b,
                          ifsc: e.target.value.toUpperCase().slice(0, 11),
                        }))
                      }
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base uppercase transition-all"
                    />
                  </div>
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={bank.holderName}
                      onChange={(e) =>
                        setBank((b) => ({ ...b, holderName: e.target.value }))
                      }
                      placeholder="As per bank records"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none text-gray-900 text-base transition-all"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">
                Your bank details are encrypted and securely stored. Payouts are
                processed weekly via IMPS/NEFT.
              </p>
            </div>
          </motion.div>
        );

      // ======================================================================
      // Step 6: Review & Submit
      // ======================================================================
      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Review & Submit
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Please review all details before submitting
              </p>
            </div>

            {/* Personal Info Review */}
            <Card padding="md" shadow="sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  Personal Info
                </h4>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span className="text-gray-900 font-medium">
                    {personal.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-gray-900 font-medium">
                    {personal.phone}
                  </span>
                </div>
              </div>
            </Card>

            {/* Vehicle Review */}
            <Card padding="md" shadow="sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400" />
                  Vehicle
                </h4>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className="text-gray-900 font-medium">
                    {VEHICLE_TYPES.find((v) => v.value === vehicle.type)?.label ||
                      vehicle.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capacity</span>
                  <span className="text-gray-900 font-medium">
                    {parseInt(vehicle.capacity, 10).toLocaleString()}L
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Number</span>
                  <span className="text-gray-900 font-medium">
                    {vehicle.number}
                  </span>
                </div>
              </div>
            </Card>

            {/* Documents Review */}
            <Card padding="md" shadow="sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Documents
                </h4>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5">
                {Object.entries(documents).map(([key, doc]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {doc.file ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span
                      className={cn(
                        doc.file ? 'text-gray-900' : 'text-gray-400'
                      )}
                    >
                      {doc.name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Service Area Review */}
            <Card padding="md" shadow="sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  Service Area
                </h4>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Area</span>
                  <span className="text-gray-900 font-medium">
                    {serviceArea.area}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pincode</span>
                  <span className="text-gray-900 font-medium">
                    {serviceArea.pincode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Radius</span>
                  <span className="text-gray-900 font-medium">
                    {serviceArea.radiusKm} km
                  </span>
                </div>
              </div>
            </Card>

            {/* Bank Review */}
            <Card padding="md" shadow="sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-gray-400" />
                  Bank Details
                </h4>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="text-xs text-green-600 font-medium"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Account</span>
                  <span className="text-gray-900 font-medium">
                    ****{bank.accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">IFSC</span>
                  <span className="text-gray-900 font-medium">{bank.ifsc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holder</span>
                  <span className="text-gray-900 font-medium">
                    {bank.holderName}
                  </span>
                </div>
              </div>
            </Card>

            {/* Terms */}
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 leading-relaxed">
              By submitting, you agree to JalSeva's{' '}
              <span className="text-green-600 font-medium">
                Supplier Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-green-600 font-medium">Privacy Policy</span>.
              Your documents will be verified within 24-48 hours.
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================================================================ */}
      {/* Header                                                           */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={goBack}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-green-600" />
              <span className="font-bold text-gray-900">
                Supplier Registration
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Step {currentStep}/6
          </span>
        </div>
      </header>

      {/* ================================================================ */}
      {/* Progress Indicator                                               */}
      {/* ================================================================ */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <ProgressIndicator
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step < currentStep) setCurrentStep(step);
          }}
        />
      </div>

      {/* ================================================================ */}
      {/* Step Content                                                     */}
      {/* ================================================================ */}
      <div className="max-w-lg mx-auto px-4 pb-32">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>

      {/* ================================================================ */}
      {/* Bottom Action Bar                                                */}
      {/* ================================================================ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={goBack}
              leftIcon={<ChevronLeft className="w-5 h-5" />}
              className="border border-gray-200"
            >
              Back
            </Button>
          )}
          {currentStep < 6 ? (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={goNext}
              disabled={!isStepValid}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Save & Continue
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
              loading={isSubmitting}
              leftIcon={
                !isSubmitting ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : undefined
              }
            >
              Submit for Verification
            </Button>
          )}
        </div>
        <div className="h-safe-area-inset-bottom bg-white" />
      </div>
    </div>
  );
}
