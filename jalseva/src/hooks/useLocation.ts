'use client';

// =============================================================================
// JalSeva - Geolocation Hook
// =============================================================================
// Wraps the browser Geolocation API and provides:
//  - Current GPS coordinates (lat/lng)
//  - Reverse-geocoded address string via Google Maps Geocoding API
//  - Real-time position watching
//  - A manual `refresh` trigger
//
// All state is local to the component that mounts this hook.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeoLocation } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseLocationReturn {
  /** Current GPS location with optional reverse-geocoded address */
  location: GeoLocation | null;
  /** Human-readable address from reverse geocoding */
  address: string | null;
  /** True while the initial position is being acquired */
  loading: boolean;
  /** Error message if geolocation fails */
  error: string | null;
  /** Call to re-acquire position manually */
  refresh: () => void;
}

interface UseLocationOptions {
  /** If true, watch position continuously (default: false) */
  watch?: boolean;
  /** Enable high accuracy mode (default: true) */
  highAccuracy?: boolean;
  /** Maximum cached position age in ms (default: 30 000) */
  maxAge?: number;
  /** Timeout for position acquisition in ms (default: 15 000) */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Reverse Geocode Helper
// ---------------------------------------------------------------------------

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn(
      '[useLocation] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set; skipping reverse geocode.'
    );
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=en`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('[useLocation] Geocoding request failed:', res.status);
      return null;
    }

    const data = await res.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      return data.results[0].formatted_address as string;
    }

    return null;
  } catch (err) {
    console.error('[useLocation] Reverse geocode error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    watch = false,
    highAccuracy = true,
    maxAge = 30_000,
    timeout = 15_000,
  } = options;

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to track the watch ID so we can clean it up
  const watchIdRef = useRef<number | null>(null);

  // Ref to debounce reverse geocoding (avoid hammering the API while the
  // watch fires rapidly)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------------------------------------------------------------------
  // Position success handler
  // --------------------------------------------------------------------------

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = position.coords;

      const newLocation: GeoLocation = { lat, lng };
      setLocation(newLocation);
      setError(null);
      setLoading(false);

      // Debounced reverse geocode (max once per 3 s while watching)
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
      }

      geocodeTimerRef.current = setTimeout(async () => {
        const addr = await reverseGeocode(lat, lng);
        if (addr) {
          setAddress(addr);
          setLocation((prev) =>
            prev ? { ...prev, address: addr } : prev
          );
        }
      }, watch ? 3_000 : 0);
    },
    [watch]
  );

  // --------------------------------------------------------------------------
  // Position error handler
  // --------------------------------------------------------------------------

  const handleError = useCallback((err: GeolocationPositionError) => {
    let message: string;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access in your browser settings.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please try again.';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = 'An unknown error occurred while fetching your location.';
    }

    setError(message);
    setLoading(false);
  }, []);

  // --------------------------------------------------------------------------
  // Geolocation options
  // --------------------------------------------------------------------------

  const geoOptions: PositionOptions = {
    enableHighAccuracy: highAccuracy,
    maximumAge: maxAge,
    timeout,
  };

  // --------------------------------------------------------------------------
  // Start / stop geolocation
  // --------------------------------------------------------------------------

  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (watch) {
      // Clear any previous watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, geoOptions, handleError, handleSuccess]);

  // --------------------------------------------------------------------------
  // Effect: mount / unmount
  // --------------------------------------------------------------------------

  useEffect(() => {
    startGeolocation();

    return () => {
      // Cleanup watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      // Cleanup debounce timer
      if (geocodeTimerRef.current) {
        clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = null;
      }
    };
  }, [startGeolocation]);

  // --------------------------------------------------------------------------
  // Manual refresh
  // --------------------------------------------------------------------------

  const refresh = useCallback(() => {
    // Always do a one-shot position request, regardless of watch mode
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSuccess, handleError, geoOptions]);

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  return { location, address, loading, error, refresh };
}
