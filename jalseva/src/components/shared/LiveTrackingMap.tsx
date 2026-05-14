'use client';

// =============================================================================
// JalSeva - Live Tracking Map (simple-loader pattern, matches /demo)
// =============================================================================
// Loads Google Maps via a plain script tag — no @googlemaps/js-api-loader,
// no AdvancedMarkerElement, no DirectionsService. The loader-v2 bootstrap
// (libraries=maps&callback=google.maps.__ib__) triggers the "degraded map"
// overlay on this key; the plain script-tag path used by /demo loads cleanly.
//
// Renders:
//   - Customer marker (red circle) at deliveryLocation
//   - Supplier marker (blue forward arrow) at trackingLocation, animated
//     smoothly toward each new position
//   - Polyline between them
//   - Bounds fit once when both markers are first placed
// =============================================================================

import { useRef, useEffect, useState, useCallback } from 'react';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { useAccessibility } from './AccessibilityProvider';
import { loadGoogleMaps } from '@/lib/google-maps-loader';

// Bearing in degrees clockwise from North between two LatLng points.
// FORWARD_CLOSED_ARROW's natural orientation points north (rotation=0),
// so this value plugs straight into the icon's `rotation` field.
function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

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
  /** Optional road-following path from supplier start to customer. When
   *  present the route polyline traces these points (the road geometry
   *  returned by DirectionsService) instead of a straight diagonal. */
  routePath?: LatLng[];
  className?: string;
  etaMinutes?: number | null;
  distanceMeters?: number | null;
  onMapReady?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveTrackingMap({
  customerLocation,
  supplierLocation,
  routePath,
  className = '',
  etaMinutes,
  onMapReady,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type GMap = any;
  const googleMapRef = useRef<GMap>(null);
  const customerMarkerRef = useRef<GMap>(null);
  const supplierMarkerRef = useRef<GMap>(null);
  const polylineRef = useRef<GMap>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevSupplierLocRef = useRef<LatLng | null>(null);
  const boundsFitRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const { announce } = useAccessibility();

  // -----------------------------------------------------------------------
  // Initialize map once
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!mapRef.current || !customerLocation) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('[LiveTrackingMap] No Maps API key configured.');
      setMapError(true);
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const g = (window as any).google;

          const map = new g.maps.Map(mapRef.current, {
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
            ],
          });

          googleMapRef.current = map;

          // Customer marker — classic Marker, red circle
          customerMarkerRef.current = new g.maps.Marker({
            map,
            position: customerLocation,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: '#EF4444',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
            title: 'Your delivery location',
            zIndex: 5,
          });

          setMapLoaded(true);
          onMapReady?.();
          announce('Map loaded. Tracking your delivery.', 'polite');
        } catch (err) {
          console.warn('[LiveTrackingMap] init failed:', err);
          if (!cancelled) setMapError(true);
        }
      })
      .catch((err) => {
        console.warn('[LiveTrackingMap] script load failed:', err);
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Smoothly animate supplier marker to each new position
  // -----------------------------------------------------------------------

  const animateMarkerTo = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (marker: any, newPosition: LatLng) => {
      if (!googleMapRef.current || !marker) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (!g || !newPosition || typeof newPosition.lat !== 'number') return;

      const startPos = prevSupplierLocRef.current || newPosition;
      const startLat = startPos.lat;
      const startLng = startPos.lng;
      const deltaLat = newPosition.lat - startLat;
      const deltaLng = newPosition.lng - startLng;

      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        try {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - (-2 * progress + 2) ** 3 / 2;

          const lat = startLat + deltaLat * eased;
          const lng = startLng + deltaLng * eased;

          if (typeof marker.setPosition === 'function') {
            marker.setPosition(new g.maps.LatLng(lat, lng));
          }

          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        } catch (err) {
          console.warn('[LiveTrackingMap] marker animation skipped:', err);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Update supplier marker + polyline whenever supplierLocation changes
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!googleMapRef.current || !supplierLocation || !mapLoaded) return;
    if (
      typeof supplierLocation.lat !== 'number' ||
      typeof supplierLocation.lng !== 'number'
    )
      return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!g) return;

    try {
      // Rotate the arrow to face the direction of travel — bearing from
      // the previous supplier position to the new one. Each position
      // update on the movement simulator is a fresh segment along the
      // road, so the icon naturally turns through corners.
      const prev = prevSupplierLocRef.current;
      const heading = prev ? bearingDeg(prev, supplierLocation) : 0;
      const arrowIcon = {
        path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: '#0066FF',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: heading,
      };

      if (supplierMarkerRef.current) {
        animateMarkerTo(supplierMarkerRef.current, supplierLocation);
        if (typeof supplierMarkerRef.current.setIcon === 'function' && prev) {
          supplierMarkerRef.current.setIcon(arrowIcon);
        }
      } else {
        supplierMarkerRef.current = new g.maps.Marker({
          map: googleMapRef.current,
          position: supplierLocation,
          icon: arrowIcon,
          title: 'Water tanker',
          zIndex: 10,
        });
      }

      prevSupplierLocRef.current = supplierLocation;

      // Route polyline. If a road-following routePath was supplied (from
      // a DirectionsService call upstream) we render that exact geometry;
      // otherwise we fall back to a straight line between supplier and
      // customer.
      if (
        customerLocation &&
        typeof customerLocation.lat === 'number' &&
        typeof customerLocation.lng === 'number'
      ) {
        const path =
          routePath && routePath.length >= 2
            ? routePath.map((p) => ({ lat: p.lat, lng: p.lng }))
            : [
                { lat: supplierLocation.lat, lng: supplierLocation.lng },
                { lat: customerLocation.lat, lng: customerLocation.lng },
              ];
        if (polylineRef.current && typeof polylineRef.current.setPath === 'function') {
          try {
            polylineRef.current.setPath(path);
          } catch {
            try {
              polylineRef.current.setMap?.(null);
            } catch {
              /* ignore */
            }
            polylineRef.current = new g.maps.Polyline({
              map: googleMapRef.current,
              path,
              geodesic: true,
              strokeColor: '#0066FF',
              strokeOpacity: 0.8,
              strokeWeight: 5,
            });
          }
        } else {
          polylineRef.current = new g.maps.Polyline({
            map: googleMapRef.current,
            path,
            geodesic: true,
            strokeColor: '#0066FF',
            strokeOpacity: 0.8,
            strokeWeight: 5,
          });
        }

        if (!boundsFitRef.current) {
          const bounds = new g.maps.LatLngBounds();
          bounds.extend(customerLocation);
          bounds.extend(supplierLocation);
          googleMapRef.current.fitBounds(bounds, {
            top: 80,
            right: 40,
            bottom: 100,
            left: 40,
          });
          boundsFitRef.current = true;
        }
      }
    } catch (err) {
      console.warn('[LiveTrackingMap] supplier-marker update skipped:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierLocation, customerLocation, mapLoaded, routePath]);

  // -----------------------------------------------------------------------
  // Screen-reader ETA announcements
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (etaMinutes && mapLoaded) {
      announce(`Water tanker is ${etaMinutes} minutes away.`, 'polite');
    }
  }, [etaMinutes, mapLoaded, announce]);

  // -----------------------------------------------------------------------
  // Fallback when Maps fails to load entirely
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
      <div
        ref={mapRef}
        className="w-full h-full"
        role="application"
        aria-label="Live delivery tracking map"
      />

      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {mapLoaded && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-md px-3 py-2 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" />
            <span className="text-gray-700">Your location</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-blue-600" />
            <span className="text-gray-700">Water tanker</span>
          </div>
          {typeof etaMinutes === 'number' && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-gray-700 font-medium">
                {etaMinutes} min
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
