'use client';
export const dynamic = 'force-dynamic';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { clearAuthCookie } from '@/actions/auth';
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  Star,
  LogOut,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  X,
  Save,
  Home,
  ClipboardList,
  ScrollText,
  Shield,
  Bell,
  HelpCircle,
  Droplets,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import type { GeoLocation } from '@/types';
import { LANGUAGES, getLanguage } from '@/lib/languages';

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
// Edit Profile Modal
// ---------------------------------------------------------------------------

function EditProfileModal({
  isOpen,
  onClose,
  currentName,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name.\nकृपया अपना नाम डालें।');
      return;
    }
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
    onClose();
  };

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
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-400 -mt-4 mb-5">प्रोफाइल बदलें</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Name / नाम
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name / अपना नाम डालें"
              className="input-field"
            />
          </div>
        </div>

        <Button
          variant="primary"
          size="xl"
          fullWidth
          loading={saving}
          onClick={handleSave}
          leftIcon={<Save className="w-5 h-5" />}
          className="mt-5 rounded-2xl"
        >
          Save / सहेजें
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Saved Addresses Section
// ---------------------------------------------------------------------------

function SavedAddresses({
  addresses,
  onAdd,
  onDelete,
}: {
  addresses: { label: string; address: string; location?: GeoLocation }[];
  onAdd: () => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">
            Saved Addresses
          </p>
          <p className="text-xs text-gray-400">सहेजे गए पते</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-sm text-blue-600 font-medium px-3 py-2 rounded-xl hover:bg-blue-50 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Add / जोड़ें
        </button>
      </div>

      {addresses.length === 0 ? (
        <Card shadow="sm">
          <div className="text-center py-4">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No saved addresses</p>
            <p className="text-xs text-gray-400">कोई सहेजा हुआ पता नहीं</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: addresses lack unique IDs
            <Card key={index} shadow="sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {addr.label}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {addr.address}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(index)}
                  className="p-2 rounded-lg hover:bg-red-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Language Selector
// ---------------------------------------------------------------------------

function LanguageSelector({
  current,
  onChange,
}: {
  current: string;
  onChange: (lang: string) => void;
}) {
  const selected = getLanguage(current);

  return (
    <div>
      <div className="mb-3">
        <p className="font-semibold text-gray-900 text-sm">Language</p>
        <p className="text-xs text-gray-400">भाषा चुनें</p>
      </div>
      <div className="relative">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-base py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          aria-label="Select language"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.native} — {lang.label}
            </option>
          ))}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 rotate-90 pointer-events-none" />
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        Currently: {selected.native} ({selected.label})
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu Item Component
// ---------------------------------------------------------------------------

function MenuItem({
  icon: Icon,
  label,
  hindi,
  onClick,
  danger,
  value,
}: {
  icon: React.ElementType;
  label: string;
  hindi: string;
  onClick: () => void;
  danger?: boolean;
  value?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors min-h-[52px] ${
        danger
          ? 'hover:bg-red-50 active:bg-red-100'
          : 'hover:bg-gray-50 active:bg-gray-100'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          danger ? 'bg-red-50' : 'bg-gray-100'
        }`}
      >
        <Icon
          className={`w-4.5 h-4.5 ${danger ? 'text-red-500' : 'text-gray-500'}`}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p
          className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}
        >
          {label}
        </p>
        <p
          className={`text-[10px] ${danger ? 'text-red-400' : 'text-gray-400'}`}
        >
          {hindi}
        </p>
      </div>
      {value ? (
        <span className="text-sm text-gray-500 shrink-0">{value}</span>
      ) : (
        <ChevronRight
          className={`w-5 h-5 shrink-0 ${danger ? 'text-red-300' : 'text-gray-300'}`}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add Address Modal
// ---------------------------------------------------------------------------

function AddAddressModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string, address: string) => void;
}) {
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!address.trim()) {
      toast.error('Please enter an address.\nकृपया पता डालें।');
      return;
    }
    onSave(label.trim() || 'Address', address.trim());
    setLabel('Home');
    setAddress('');
    onClose();
  };

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
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Add Address</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-400 -mt-4 mb-5">नया पता जोड़ें</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="address-label" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Label / लेबल
            </label>
            <div className="flex gap-2">
              {['Home', 'Office', 'Other'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setLabel(opt)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                    label === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="address-text" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Address / पता
            </label>
            <textarea
              id="address-text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter full address / पूरा पता डालें"
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={handleSave}
          leftIcon={<Plus className="w-5 h-5" />}
          className="mt-5 rounded-2xl"
        >
          Save Address / पता सहेजें
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Profile Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout: authLogout } = useAuthStore();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [_showLanguage, _setShowLanguage] = useState(false);
  const [_showAddresses, _setShowAddresses] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<
    { label: string; address: string; location?: GeoLocation }[]
  >([]);
  const [language, setLanguage] = useState(user?.language || 'en');

  // --- Redirect if not logged in ---
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, router]);

  // --- Handle name save ---
  const handleSaveName = async (name: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name,
        updatedAt: serverTimestamp(),
      });
      setUser({ ...user, name });
      toast.success('Name updated!\nनाम अपडेट हो गया!');
    } catch {
      toast.error('Failed to update name.\nनाम अपडेट नहीं हो पाया।');
    }
  };

  // --- Handle language change ---
  const handleLanguageChange = async (lang: string) => {
    if (!user) return;
    setLanguage(lang);

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        language: lang,
        updatedAt: serverTimestamp(),
      });
      setUser({ ...user, language: lang });
      toast.success('Language updated!\nभाषा बदल गई!');
    } catch {
      // Silent
    }
  };

  // --- Handle add address ---
  const handleAddAddress = () => {
    setShowAddAddress(true);
  };

  const handleSaveAddress = (label: string, address: string) => {
    setSavedAddresses((prev) => [...prev, { label, address }]);
    toast.success('Address saved!\nपता सहेज लिया!');
  };

  // --- Handle delete address ---
  const handleDeleteAddress = (index: number) => {
    setSavedAddresses((prev) => prev.filter((_, i) => i !== index));
    toast.success('Address removed.\nपता हटा दिया।');
  };

  // --- Handle logout (Server Action to clear auth cookie) ---
  const handleLogout = async () => {
    try {
      localStorage.removeItem('jalseva_demo_user');
    } catch {
      // localStorage might be unavailable
    }

    // Clear auth cookie via Server Action
    await clearAuthCookie();

    try {
      await signOut(auth);
    } catch {
      // Firebase signOut may fail for demo users
    }

    authLogout();
    toast.success('Logged out successfully.\nलॉगआउट हो गया।');
    router.push('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-water safe-top">
        <div className="px-4 pt-4 pb-8">
          {/* Top row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">Profile</h1>
            </div>
            <button
              onClick={() => setShowEditProfile(true)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Edit3 className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Profile info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-18 h-18 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={72}
                  height={72}
                  className="w-full h-full object-cover rounded-2xl"
                  unoptimized
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {user.name?.[0]?.toUpperCase() || user.phone?.slice(-2) || 'U'}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">
                {user.name || 'Set your name'}
              </h2>
              <p className="text-white/80 text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {user.phone || 'Phone not set'}
              </p>
              {user.rating && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-white/90 text-sm font-medium">
                    {user.rating.average.toFixed(1)}
                  </span>
                  <span className="text-white/60 text-xs">
                    ({user.rating.count} ratings / रेटिंग)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 -mt-4 space-y-4 app-container">
        {/* Quick stats */}
        <Card shadow="md" className="relative z-10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.rating?.count || 0}
              </p>
              <p className="text-xs text-gray-500">Orders</p>
              <p className="text-[10px] text-gray-400">ऑर्डर</p>
            </div>
            <div className="border-x border-gray-100">
              <p className="text-2xl font-bold text-gray-900">
                {user.rating?.average?.toFixed(1) || '5.0'}
              </p>
              <p className="text-xs text-gray-500">Rating</p>
              <p className="text-[10px] text-gray-400">रेटिंग</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.language?.toUpperCase() || 'EN'}
              </p>
              <p className="text-xs text-gray-500">Language</p>
              <p className="text-[10px] text-gray-400">भाषा</p>
            </div>
          </div>
        </Card>

        {/* Saved Addresses */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SavedAddresses
            addresses={savedAddresses}
            onAdd={handleAddAddress}
            onDelete={handleDeleteAddress}
          />
        </motion.div>

        {/* Language */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <LanguageSelector
            current={language}
            onChange={handleLanguageChange}
          />
        </motion.div>

        {/* Menu items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card shadow="sm" padding="sm">
            <MenuItem
              icon={CreditCard}
              label="Payment History"
              hindi="भुगतान इतिहास"
              onClick={() => router.push('/history')}
            />
            <div className="h-px bg-gray-100 mx-4" />
            <MenuItem
              icon={Bell}
              label="Notifications"
              hindi="सूचनाएं"
              onClick={() => toast.info('Push notifications are enabled. You will be notified for order updates.\nऑर्डर अपडेट के लिए पुश सूचनाएं चालू हैं।')}
            />
            <div className="h-px bg-gray-100 mx-4" />
            <MenuItem
              icon={Shield}
              label="Privacy & Security"
              hindi="गोपनीयता और सुरक्षा"
              onClick={() => toast.info('Your data is encrypted and secured with Firebase Auth.\nआपका डेटा एन्क्रिप्टेड और सुरक्षित है।')}
            />
            <div className="h-px bg-gray-100 mx-4" />
            <MenuItem
              icon={HelpCircle}
              label="Help & Support"
              hindi="सहायता"
              onClick={() => {
                window.open('mailto:support@jalseva.in?subject=Help%20Request', '_blank');
                toast.info('Opening email to support@jalseva.in\nसहायता ईमेल खोल रहे हैं');
              }}
            />
          </Card>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card shadow="sm" padding="sm">
            <MenuItem
              icon={LogOut}
              label="Logout"
              hindi="लॉगआउट"
              onClick={handleLogout}
              danger
            />
          </Card>
        </motion.div>

        {/* App version */}
        <p className="text-center text-xs text-gray-300 pt-2 pb-4">
          JalSeva v1.0.0 | Made with care for India
        </p>
      </main>

      {/* Bottom Nav */}
      <BottomNav active="profile" />

      {/* Edit Profile Modal */}
      <AnimatePresence>
        <EditProfileModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
          currentName={user.name || ''}
          onSave={handleSaveName}
        />
      </AnimatePresence>

      {/* Add Address Modal */}
      <AnimatePresence>
        <AddAddressModal
          isOpen={showAddAddress}
          onClose={() => setShowAddAddress(false)}
          onSave={handleSaveAddress}
        />
      </AnimatePresence>
    </div>
  );
}
