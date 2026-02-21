'use client';

// =============================================================================
// JalSeva - Live Tracking Map with Real Google Maps
// =============================================================================
// Displays real-time vehicle tracking on an actual Google Maps instance.
// Features:
//   - Real customer marker (red pin) at delivery location
//   - Animated supplier vehicle marker (blue truck) with smooth transitions
//   - Real route polyline from Directions API
//   - Auto-fit bounds to show both markers
//   - Accessible: ARIA labels, screen reader status updates
//   - Real-time position updates via Firestore subscription
// =============================================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { MapPin, Truck, Navigation, Loader2, AlertCircle } from 'lucide-react';
import { useAccessibility } from './AccessibilityProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LatLng {
  lat: number;
  lng: number;
}

interface LiveTrackingMapProps {
  customerLocation: LatLng;
  supplierLocation?: LatLng;
  className?: string;
  etaMinutes?: number | null;
  distanceMeters?: number | null;
  onMapReady?: () => void;
}

// ---------------------------------------------------------------------------
// Custom marker SVGs
// ---------------------------------------------------------------------------

const CUSTOMER_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M20 0C9 0 0 9 0 20c0 15 20 28 20 28s20-13 20-28C40 9 31 0 20 0z" fill="#EF4444" filter="url(#shadow)"/>
  <circle cx="20" cy="18" r="8" fill="white"/>
  <circle cx="20" cy="18" r="4" fill="#EF4444"/>
</svg>`;

const SUPPLIER_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <filter id="truckShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="24" cy="24" r="22" fill="#0066FF" filter="url(#truckShadow)"/>
  <circle cx="24" cy="24" r="18" fill="white"/>
  <g transform="translate(12, 12)" fill="#0066FF">
    <rect x="2" y="8" width="14" height="10" rx="1"/>
    <rect x="16" y="11" width="6" height="7" rx="1"/>
    <circle cx="7" cy="20" r="2.5" fill="#0066FF"/>
    <circle cx="19" cy="20" r="2.5" fill="#0066FF"/>
    <rect x="4" y="5" width="10" height="4" rx="1" fill="#0066FF" opacity="0.5"/>
  </g>
</svg>`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveTrackingMap({
  customerLocation,
  supplierLocation,
  className = '',
  etaMinutes,
  distanceMeters,
  onMapReady,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const customerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const supplierMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevSupplierLocRef = useRef<LatLng | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const { announce } = useAccessibility();

  // -----------------------------------------------------------------------
  // Initialize Google Maps
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!mapRef.current || !customerLocation) return;

    let cancelled = false;

    const initMap = async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['marker'],
        });

        await (loader as any).importLibrary('maps');
        await (loader as any).importLibrary('marker');

        if (cancelled) return;

        const g = (window as any).google;

        const map = new g.maps.Map(mapRef.current!, {
          center: customerLocation,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            {
              featureType: 'water',
              elementType: 'geometry.fill',
              stylers: [{ color: '#c8e8ff' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ lightness: 20 }],
            },
          ],
        });

        googleMapRef.current = map;

        // Customer marker (red pin)
        const customerPin = document.createElement('div');
        customerPin.innerHTML = CUSTOMER_MARKER_SVG;
        customerPin.style.cursor = 'pointer';
        customerPin.title = 'Your delivery location';

        try {
          // Try AdvancedMarkerElement first
          customerMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({
            map,
            position: customerLocation,
            content: customerPin,
            title: 'Your delivery location',
          });
        } catch {
          // Fallback to regular Marker
          customerMarkerRef.current = new g.maps.Marker({
            map,
            position: customerLocation,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#EF4444',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            title: 'Your delivery location',
          });
        }

        // Directions renderer for route line
        directionsRendererRef.current = new g.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#0066FF',
            strokeOpacity: 0.8,
            strokeWeight: 5,
          },
        });

        setMapLoaded(true);
        onMapReady?.();
        announce('Map loaded. Tracking your delivery.', 'polite');
      } catch (err) {
        console.error('[LiveTrackingMap] Failed to initialize Google Maps:', err);
        if (!cancelled) {
          setMapError(true);
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [customerLocation, onMapReady, announce]);

  // -----------------------------------------------------------------------
  // Update supplier marker with smooth animation
  // -----------------------------------------------------------------------

  const animateMarkerTo = useCallback(
    (marker: any, newPosition: LatLng) => {
      if (!googleMapRef.current) return;

      const g = (window as any).google;
      if (!g) return;

      const startPos = prevSupplierLocRef.current || newPosition;
      const startLat = startPos.lat;
      const startLng = startPos.lng;
      const deltaLat = newPosition.lat - startLat;
      const deltaLng = newPosition.lng - startLng;

      const duration = 1000; // 1 second smooth transition
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-in-out cubic
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - (-2 * progress + 2) ** 3 / 2;

        const lat = startLat + deltaLat * eased;
        const lng = startLng + deltaLng * eased;

        const pos = new g.maps.LatLng(lat, lng);

        if (marker.position !== undefined && typeof marker.position === 'object' && !(marker.position instanceof g.maps.LatLng)) {
          // AdvancedMarkerElement
          marker.position = { lat, lng };
        } else if (marker.setPosition) {
          // Regular Marker
          marker.setPosition(pos);
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    []
  );

  useEffect(() => {
    if (!googleMapRef.current || !supplierLocation || !mapLoaded) return;

    const g = (window as any).google;
    if (!g) return;

    if (supplierMarkerRef.current) {
      // Animate to new position
      animateMarkerTo(supplierMarkerRef.current, supplierLocation);
    } else {
      // Create supplier marker
      const supplierPin = document.createElement('div');
      supplierPin.innerHTML = SUPPLIER_MARKER_SVG;
      supplierPin.style.cursor = 'pointer';
      supplierPin.title = 'Water tanker';

      try {
        supplierMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({
          map: googleMapRef.current,
          position: supplierLocation,
          content: supplierPin,
          title: 'Water tanker',
        });
      } catch {
        supplierMarkerRef.current = new g.maps.Marker({
          map: googleMapRef.current,
          position: supplierLocation,
          icon: {
            path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 7,
            fillColor: '#0066FF',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            rotation: 0,
          },
          title: 'Water tanker',
        });
      }
    }

    prevSupplierLocRef.current = supplierLocation;

    // Fit bounds to show both markers
    if (customerLocation && supplierLocation) {
      const bounds = new g.maps.LatLngBounds();
      bounds.extend(customerLocation);
      bounds.extend(supplierLocation);
      googleMapRef.current.fitBounds(bounds, {
        top: 80,
        right: 40,
        bottom: 100,
        left: 40,
      });

      // Fetch route from Directions API
      const directionsService = new g.maps.DirectionsService();
      directionsService.route(
        {
          origin: supplierLocation,
          destination: customerLocation,
          travelMode: g.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          }
        }
      );
    }

    // Announce location update for screen readers
    if (etaMinutes) {
      announce(
        `Water tanker is ${etaMinutes} minutes away.`,
        'polite'
      );
    }
  }, [supplierLocation, customerLocation, mapLoaded, etaMinutes, animateMarkerTo, announce]);

  // -----------------------------------------------------------------------
  // Fallback placeholder when Maps API is unavailable
  // -----------------------------------------------------------------------

  if (mapError) {
    return (
      <div
        className={`bg-gradient-to-b from-blue-50 to-gray-100 flex flex-col items-center justify-center ${className}`}
        role="img"
        aria-label="Map showing delivery tracking"
      >
        <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 text-center px-4">
          Map unavailable. Your delivery is being tracked.
        </p>
        {etaMinutes && (
          <p className="text-lg font-bold text-blue-600 mt-2">
            ETA: {etaMinutes} min
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={mapRef}
        className="w-full h-full"
        role="application"
        aria-label="Live delivery tracking map"
      />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend overlay */}
      {mapLoaded && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 font-medium">Your location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-gray-600 font-medium">Water tanker</span>
            </div>
            {distanceMeters && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                <Navigation className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500">
                  {distanceMeters >= 1000
                    ? `${(distanceMeters / 1000).toFixed(1)} km`
                    : `${distanceMeters} m`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
