'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { GeoLocation } from '@/types';

export interface LocationPickerProps {
  value?: GeoLocation;
  onChange?: (location: GeoLocation) => void;
  placeholder?: string;
  className?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = 'Enter delivery address',
  className,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              address = data.display_name;
            }
          }
        } catch {
          // Use coordinate-based address as fallback
        }

        const location: GeoLocation = {
          lat: latitude,
          lng: longitude,
          address,
        };

        onChange?.(location);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. Please allow location access.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Please enter address manually.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Unable to get location. Please enter address manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [onChange]);

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) return;

    const location: GeoLocation = {
      lat: 0,
      lng: 0,
      address: manualInput.trim(),
    };

    onChange?.(location);
    setShowManual(false);
  }, [manualInput, onChange]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {value?.address && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <MapPin size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium">Delivery Location</p>
            <p className="text-sm text-gray-800 mt-0.5 leading-snug">
              {value.address}
            </p>
          </div>
          <button
            onClick={() => {
              onChange?.(undefined as unknown as GeoLocation);
              setManualInput('');
            }}
            className="text-xs text-blue-600 font-medium hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      )}

      {!value?.address && (
        <>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGetCurrentLocation}
            loading={isLocating}
            leftIcon={
              isLocating ? undefined : (
                <Navigation size={20} className="text-blue-600" />
              )
            }
          >
            {isLocating ? 'Getting location...' : 'Use Current Location'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors text-left"
            >
              <Search size={18} />
              <span className="text-sm">{placeholder}</span>
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={placeholder}
                  leftIcon={<MapPin size={18} />}
                  size="lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualSubmit();
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManual(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                  >
                    Confirm
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
          {error}
        </p>
      )}

      <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        {value?.lat && value?.lng && value.lat !== 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 left-4 w-16 h-8 bg-green-300 rounded-full" />
              <div className="absolute top-6 right-8 w-12 h-6 bg-green-200 rounded-full" />
              <div className="absolute bottom-4 left-8 w-20 h-10 bg-gray-200 rounded" />
              <div className="absolute bottom-2 right-4 w-14 h-7 bg-gray-300 rounded" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <MapPin size={28} className="text-red-500 -mb-1" fill="currentColor" />
              <div className="w-2 h-2 bg-red-500/30 rounded-full" />
            </div>
            <span className="absolute bottom-2 right-2 text-[10px] text-gray-400">
              Map preview
            </span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
              <MapPin size={24} className="text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">
                Select location to preview map
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

LocationPicker.displayName = 'LocationPicker';

export { LocationPicker };
