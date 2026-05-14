// =============================================================================
// JalSeva - Google Maps Loader (plain script-tag, shared singleton)
// =============================================================================
// Used by /demo, /tracking, and any future page that needs the Google Maps
// JS SDK. Uses a plain script tag (key + v=weekly, no callback, no libraries)
// because the @googlemaps/js-api-loader v2 bootstrap path triggers the
// "degraded map" overlay on this key.
// =============================================================================

let mapsLoadPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      'jalseva-gmaps-script',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Maps script failed')),
      );
      return;
    }
    const s = document.createElement('script');
    s.id = 'jalseva-gmaps-script';
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    s.onload = () => resolve();
    s.onerror = () => {
      mapsLoadPromise = null; // allow retry
      reject(new Error('Maps script failed'));
    };
    document.head.appendChild(s);
  });
  return mapsLoadPromise;
}

/**
 * Haversine distance between two LatLng-like points, in metres.
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}
