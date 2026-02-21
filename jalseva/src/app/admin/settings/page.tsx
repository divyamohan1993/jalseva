'use client';
export const dynamic = 'force-dynamic';

// =============================================================================
// JalSeva - Admin Settings Page
// =============================================================================
// Platform configuration: commission rate, surge pricing thresholds,
// delivery radius, default language, zone pricing management, platform fees.
// =============================================================================

import type React from 'react';
import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  DollarSign,
  MapPin,
  Globe,
  Save,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  Percent,
  Zap,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AdminSettings, PricingZone, WaterType } from '@/types';

// =============================================================================
// Language options
// =============================================================================

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'bn', label: 'Bengali' },
];

// =============================================================================
// Settings Section Sub-component
// =============================================================================

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

// =============================================================================
// Settings Page Component
// =============================================================================

export default function SettingsPage() {
  // --------------------------------------------------------------------------
  // State - Admin Settings
  // --------------------------------------------------------------------------
  const [settings, setSettings] = useState<AdminSettings>({
    commissionPercent: 15,
    surgeThresholds: { high: 10, surge: 20 },
    maxDeliveryRadius: 25,
    defaultLanguage: 'en',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Platform fee
  const [platformFee, setPlatformFee] = useState(20);
  const [savingPlatformFee, setSavingPlatformFee] = useState(false);

  // Surge multiplier
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.5);

  // --------------------------------------------------------------------------
  // State - Zone Pricing
  // --------------------------------------------------------------------------
  const [zones, setZones] = useState<PricingZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<PricingZone | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [savingZone, setSavingZone] = useState(false);
  const [deleteConfirmZone, setDeleteConfirmZone] = useState<string | null>(null);

  // New zone form
  const [newZone, setNewZone] = useState<Partial<PricingZone>>({
    name: '',
    basePrice: { ro: 0, mineral: 0, tanker: 0 },
    perKmRate: 10,
    surgeMultiplier: 1.5,
    demandLevel: 'normal',
  });

  // --------------------------------------------------------------------------
  // Load settings from Firestore
  // --------------------------------------------------------------------------
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'config', 'adminSettings'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as AdminSettings;
          setSettings(data);
        }

        const feeDoc = await getDoc(doc(db, 'config', 'platformFees'));
        if (feeDoc.exists()) {
          setPlatformFee(feeDoc.data().baseFee || 20);
          setSurgeMultiplier(feeDoc.data().surgeMultiplier || 1.5);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // --------------------------------------------------------------------------
  // Load zones from Firestore (real-time)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'pricingZones'),
      (snapshot) => {
        const zoneList: PricingZone[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          zoneList.push({
            id: docSnap.id,
            name: data.name || '',
            basePrice: data.basePrice || { ro: 0, mineral: 0, tanker: 0 },
            perKmRate: data.perKmRate || 10,
            surgeMultiplier: data.surgeMultiplier || 1.5,
            demandLevel: data.demandLevel || 'normal',
          });
        });
        setZones(zoneList);
        setZonesLoading(false);
      },
      (error) => {
        console.error('Error loading zones:', error);
        setZonesLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // Save Admin Settings
  // --------------------------------------------------------------------------
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'config', 'adminSettings'), settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // --------------------------------------------------------------------------
  // Save Platform Fee
  // --------------------------------------------------------------------------
  const handleSavePlatformFee = async () => {
    setSavingPlatformFee(true);
    try {
      await setDoc(doc(db, 'config', 'platformFees'), {
        baseFee: platformFee,
        surgeMultiplier,
      });
      toast.success('Platform fees saved');
    } catch (error) {
      console.error('Error saving platform fees:', error);
      toast.error('Failed to save platform fees');
    } finally {
      setSavingPlatformFee(false);
    }
  };

  // --------------------------------------------------------------------------
  // Zone CRUD
  // --------------------------------------------------------------------------
  const handleSaveZone = async () => {
    setSavingZone(true);
    try {
      if (editingZone) {
        // Update existing zone
        await updateDoc(doc(db, 'pricingZones', editingZone.id), {
          name: editingZone.name,
          basePrice: editingZone.basePrice,
          perKmRate: editingZone.perKmRate,
          surgeMultiplier: editingZone.surgeMultiplier,
          demandLevel: editingZone.demandLevel,
        });
        toast.success('Zone updated successfully');
      } else {
        // Create new zone
        await addDoc(collection(db, 'pricingZones'), {
          name: newZone.name,
          basePrice: newZone.basePrice,
          perKmRate: newZone.perKmRate,
          surgeMultiplier: newZone.surgeMultiplier,
          demandLevel: newZone.demandLevel || 'normal',
        });
        toast.success('Zone created successfully');
        setNewZone({
          name: '',
          basePrice: { ro: 0, mineral: 0, tanker: 0 },
          perKmRate: 10,
          surgeMultiplier: 1.5,
          demandLevel: 'normal',
        });
      }
      setZoneModalOpen(false);
      setEditingZone(null);
    } catch (error) {
      console.error('Error saving zone:', error);
      toast.error('Failed to save zone');
    } finally {
      setSavingZone(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      await deleteDoc(doc(db, 'pricingZones', zoneId));
      toast.success('Zone deleted');
      setDeleteConfirmZone(null);
    } catch (error) {
      console.error('Error deleting zone:', error);
      toast.error('Failed to delete zone');
    }
  };

  const openEditZone = (zone: PricingZone) => {
    setEditingZone({ ...zone });
    setZoneModalOpen(true);
  };

  const openNewZone = () => {
    setEditingZone(null);
    setNewZone({
      name: '',
      basePrice: { ro: 0, mineral: 0, tanker: 0 },
      perKmRate: 10,
      surgeMultiplier: 1.5,
      demandLevel: 'normal',
    });
    setZoneModalOpen(true);
  };

  // Current zone form data (edit or new)
  const zoneForm = editingZone || newZone;
  const setZoneForm = (updates: Partial<PricingZone>) => {
    if (editingZone) {
      setEditingZone({ ...editingZone, ...updates });
    } else {
      setNewZone({ ...newZone, ...updates });
    }
  };

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure platform parameters and pricing
        </p>
      </div>

      {/* ================================================================== */}
      {/* Commission Rate                                                    */}
      {/* ================================================================== */}
      <SettingsSection
        title="Commission Rate"
        description="Percentage of each order taken as platform commission"
        icon={<Percent className="w-5 h-5 text-blue-600" />}
      >
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Input
              label="Commission (%)"
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={settings.commissionPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  commissionPercent: parseFloat(e.target.value) || 0,
                })
              }
              size="md"
            />
          </div>
          <div className="pb-0.5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              loading={savingSettings}
              onClick={handleSaveSettings}
            >
              Save
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Current: {settings.commissionPercent}% commission on every completed order
        </p>
      </SettingsSection>

      {/* ================================================================== */}
      {/* Surge Pricing Thresholds                                           */}
      {/* ================================================================== */}
      <SettingsSection
        title="Surge Pricing Thresholds"
        description="Configure when demand levels trigger higher pricing"
        icon={<Zap className="w-5 h-5 text-blue-600" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Input
                label="High Demand Threshold"
                type="number"
                min={1}
                max={100}
                value={settings.surgeThresholds.high}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    surgeThresholds: {
                      ...settings.surgeThresholds,
                      high: parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
                hint="Orders/hour for High demand"
                size="md"
              />
            </div>
            <div>
              <Input
                label="Surge Threshold"
                type="number"
                min={1}
                max={200}
                value={settings.surgeThresholds.surge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    surgeThresholds: {
                      ...settings.surgeThresholds,
                      surge: parseInt(e.target.value, 10) || 0,
                    },
                  })
                }
                hint="Orders/hour for Surge pricing"
                size="md"
              />
            </div>
            <div>
              <Input
                label="Surge Multiplier"
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={surgeMultiplier}
                onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value) || 1)}
                hint="Price multiplier during surge"
                size="md"
              />
            </div>
          </div>

          {/* Visual indicator */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Pricing Levels</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="h-2 bg-green-400 rounded-l-full" />
                <p className="text-[10px] text-gray-500 mt-1 text-center">Normal</p>
                <p className="text-[10px] text-gray-400 text-center">
                  &lt; {settings.surgeThresholds.high} orders/hr
                </p>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-amber-400" />
                <p className="text-[10px] text-gray-500 mt-1 text-center">High</p>
                <p className="text-[10px] text-gray-400 text-center">
                  {settings.surgeThresholds.high} - {settings.surgeThresholds.surge} orders/hr
                </p>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-red-400 rounded-r-full" />
                <p className="text-[10px] text-gray-500 mt-1 text-center">Surge</p>
                <p className="text-[10px] text-gray-400 text-center">
                  &gt; {settings.surgeThresholds.surge} orders/hr ({surgeMultiplier}x)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              loading={savingSettings}
              onClick={handleSaveSettings}
            >
              Save Thresholds
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* Delivery & Language Settings                                       */}
      {/* ================================================================== */}
      <SettingsSection
        title="Delivery & Language"
        description="Maximum delivery radius and default platform language"
        icon={<Globe className="w-5 h-5 text-blue-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Max Delivery Radius (km)"
            type="number"
            min={1}
            max={100}
            value={settings.maxDeliveryRadius}
            onChange={(e) =>
              setSettings({
                ...settings,
                maxDeliveryRadius: parseInt(e.target.value, 10) || 1,
              })
            }
            hint="Maximum distance a supplier can deliver"
            size="md"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="default-language" className="text-sm font-medium text-gray-700">
              Default Language
            </label>
            <select
              id="default-language"
              value={settings.defaultLanguage}
              onChange={(e) =>
                setSettings({ ...settings, defaultLanguage: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 text-base py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-0.5">
              Default language for new users
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Save className="w-4 h-4" />}
            loading={savingSettings}
            onClick={handleSaveSettings}
          >
            Save
          </Button>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* Platform Fee                                                       */}
      {/* ================================================================== */}
      <SettingsSection
        title="Platform Fee"
        description="Fixed fee added to every order"
        icon={<DollarSign className="w-5 h-5 text-blue-600" />}
      >
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <Input
              label="Platform Fee (INR)"
              type="number"
              min={0}
              max={500}
              value={platformFee}
              onChange={(e) => setPlatformFee(parseInt(e.target.value, 10) || 0)}
              hint={`Currently ${formatCurrency(platformFee)} per order`}
              size="md"
            />
          </div>
          <div className="pb-0.5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              loading={savingPlatformFee}
              onClick={handleSavePlatformFee}
            >
              Save
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* Zone Pricing Management                                            */}
      {/* ================================================================== */}
      <SettingsSection
        title="Zone Pricing"
        description="Manage base prices and per-km rates for different delivery zones"
        icon={<MapPin className="w-5 h-5 text-blue-600" />}
      >
        <div className="space-y-4">
          {/* Add Zone Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openNewZone}
            >
              Add Zone
            </Button>
          </div>

          {/* Zones Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                    RO (base)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">
                    Mineral (base)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">
                    Tanker (base)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Per km</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                    Demand
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zonesLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading zones...
                    </td>
                  </tr>
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                      No zones configured. Add your first zone.
                    </td>
                  </tr>
                ) : (
                  zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {zone.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
                        {formatCurrency(zone.basePrice.ro)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden sm:table-cell">
                        {formatCurrency(zone.basePrice.mineral)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                        {formatCurrency(zone.basePrice.tanker)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatCurrency(zone.perKmRate)}/km
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            zone.demandLevel === 'low'
                              ? 'bg-blue-100 text-blue-700'
                              : zone.demandLevel === 'normal'
                              ? 'bg-green-100 text-green-700'
                              : zone.demandLevel === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {zone.demandLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditZone(zone)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmZone(zone.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SettingsSection>

      {/* ================================================================== */}
      {/* Zone Edit / Create Modal                                           */}
      {/* ================================================================== */}
      <Modal
        isOpen={zoneModalOpen}
        onClose={() => {
          setZoneModalOpen(false);
          setEditingZone(null);
        }}
        title={editingZone ? 'Edit Zone' : 'Create New Zone'}
        size="lg"
      >
        <div className="space-y-5">
          {/* Zone Name */}
          <Input
            label="Zone Name"
            placeholder="e.g., Mumbai Central, Delhi NCR..."
            value={zoneForm.name || ''}
            onChange={(e) => setZoneForm({ name: e.target.value })}
            size="md"
          />

          {/* Base Prices */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Base Prices (INR)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="RO Water"
                type="number"
                min={0}
                value={zoneForm.basePrice?.ro || 0}
                onChange={(e) =>
                  setZoneForm({
                    basePrice: {
                      ...zoneForm.basePrice!,
                      ro: parseInt(e.target.value, 10) || 0,
                    } as Record<WaterType, number>,
                  })
                }
                size="sm"
              />
              <Input
                label="Mineral"
                type="number"
                min={0}
                value={zoneForm.basePrice?.mineral || 0}
                onChange={(e) =>
                  setZoneForm({
                    basePrice: {
                      ...zoneForm.basePrice!,
                      mineral: parseInt(e.target.value, 10) || 0,
                    } as Record<WaterType, number>,
                  })
                }
                size="sm"
              />
              <Input
                label="Tanker"
                type="number"
                min={0}
                value={zoneForm.basePrice?.tanker || 0}
                onChange={(e) =>
                  setZoneForm({
                    basePrice: {
                      ...zoneForm.basePrice!,
                      tanker: parseInt(e.target.value, 10) || 0,
                    } as Record<WaterType, number>,
                  })
                }
                size="sm"
              />
            </div>
          </div>

          {/* Per KM Rate & Surge Multiplier */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Per KM Rate (INR)"
              type="number"
              min={0}
              step={1}
              value={zoneForm.perKmRate || 0}
              onChange={(e) =>
                setZoneForm({ perKmRate: parseFloat(e.target.value) || 0 })
              }
              size="md"
            />
            <Input
              label="Surge Multiplier"
              type="number"
              min={1}
              max={5}
              step={0.1}
              value={zoneForm.surgeMultiplier || 1.5}
              onChange={(e) =>
                setZoneForm({
                  surgeMultiplier: parseFloat(e.target.value) || 1,
                })
              }
              size="md"
            />
          </div>

          {/* Demand Level */}
          <div>
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">
              Current Demand Level
            </span>
            <div className="flex gap-2">
              {(['low', 'normal', 'high', 'surge'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setZoneForm({ demandLevel: level })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                    zoneForm.demandLevel === level
                      ? level === 'low'
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                        : level === 'normal'
                        ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                        : level === 'high'
                        ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                        : 'bg-red-100 text-red-700 ring-1 ring-red-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setZoneModalOpen(false);
                setEditingZone(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Save className="w-4 h-4" />}
              loading={savingZone}
              onClick={handleSaveZone}
              disabled={!zoneForm.name?.trim()}
            >
              {editingZone ? 'Update Zone' : 'Create Zone'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* Delete Zone Confirmation                                           */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!deleteConfirmZone}
        onClose={() => setDeleteConfirmZone(null)}
        title="Delete Zone"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50">
            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
            <p className="text-sm text-gray-700">
              Are you sure you want to delete this pricing zone? This action cannot be
              undone and may affect active orders in this zone.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setDeleteConfirmZone(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => deleteConfirmZone && handleDeleteZone(deleteConfirmZone)}
            >
              Delete Zone
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
