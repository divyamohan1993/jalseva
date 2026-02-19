// =============================================================================
// JalSeva - Google Maps Utility Functions (Server-Side)
// =============================================================================
// Provides geocoding, reverse geocoding, distance calculation, and ETA
// estimation using Google Maps Platform APIs via direct HTTP requests.
// This module is server-only.
// =============================================================================

import type { GeoLocation, GeocodeResult, DistanceResult, ETAResult } from '@/types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// ---------------------------------------------------------------------------
// Haversine Distance (offline fallback)
// ---------------------------------------------------------------------------

/**
 * Calculates the straight-line distance between two points using the Haversine
 * formula. Used as a fallback when API calls fail.
 *
 * @param from - Starting coordinates.
 * @param to   - Ending coordinates.
 * @returns Distance in meters.
 */
export function haversineDistance(from: GeoLocation, to: GeoLocation): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// calculateDistance
// ---------------------------------------------------------------------------

/**
 * Calculates the driving distance and duration between two points using the
 * Google Routes API. Falls back to Haversine if the API call fails.
 *
 * @param origin      - Starting point coordinates.
 * @param destination - Ending point coordinates.
 * @returns Distance in meters and duration in seconds.
 */
export async function calculateDistance(
  origin: GeoLocation,
  destination: GeoLocation
): Promise<DistanceResult> {
  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  try {
    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Maps] Routes API error:', errorBody);
      throw new Error(`Google Routes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between the specified points.');
    }

    const route = data.routes[0];

    // duration comes as a string like "1234s"
    const durationSeconds = parseInt(
      route.duration?.replace('s', '') || '0',
      10
    );
    const distanceMeters = route.distanceMeters || 0;

    return { distanceMeters, durationSeconds };
  } catch (error) {
    console.error('[Maps] calculateDistance falling back to Haversine:', error);
    const distanceMeters = haversineDistance(origin, destination);
    return {
      distanceMeters: Math.round(distanceMeters),
      // Assume average city speed of ~30 km/h
      durationSeconds: Math.round(distanceMeters / 8.33),
    };
  }
}

// ---------------------------------------------------------------------------
// getGeocode
// ---------------------------------------------------------------------------

/**
 * Geocodes a human-readable address into geographic coordinates.
 *
 * @param address - The address string to geocode (e.g. "Connaught Place, New Delhi").
 * @returns Latitude, longitude, formatted address, and place ID.
 */
export async function getGeocode(address: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY!,
    region: 'in', // Bias results towards India
    language: 'en',
  });

  const response = await fetch(`${GEOCODING_API_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Maps] Geocoding API error:', errorBody);
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(
      `Geocoding failed for address "${address}": ${data.status} - ${data.error_message || 'No results found'}`
    );
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;

  return {
    lat,
    lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

// ---------------------------------------------------------------------------
// reverseGeocode
// ---------------------------------------------------------------------------

/**
 * Converts geographic coordinates into a human-readable address.
 *
 * @param lat - Latitude.
 * @param lng - Longitude.
 * @returns Latitude, longitude, formatted address, and place ID.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY!,
    language: 'en',
    result_type: 'street_address|sublocality|locality',
  });

  const response = await fetch(`${GEOCODING_API_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Maps] Reverse geocoding API error:', errorBody);
    throw new Error(`Reverse geocoding API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(
      `Reverse geocoding failed for (${lat}, ${lng}): ${data.status} - ${data.error_message || 'No results found'}`
    );
  }

  const result = data.results[0];

  return {
    lat,
    lng,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
  };
}

// ---------------------------------------------------------------------------
// getETA
// ---------------------------------------------------------------------------

/**
 * Gets the estimated time of arrival for a supplier to reach the customer.
 * Uses the Google Routes API with traffic-aware routing and returns
 * distance, ETA, and an optional encoded polyline for map rendering.
 *
 * @param origin      - Supplier's current location.
 * @param destination - Customer's delivery location.
 * @returns ETA in seconds, distance in meters, and an encoded polyline.
 */
export async function getETA(
  origin: GeoLocation,
  destination: GeoLocation
): Promise<ETAResult> {
  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  try {
    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Maps] Routes API ETA error:', errorBody);
      throw new Error(`Google Routes API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found for ETA calculation.');
    }

    const route = data.routes[0];
    const durationSeconds = parseInt(
      route.duration?.replace('s', '') || '0',
      10
    );
    const distanceMeters = route.distanceMeters || 0;
    const polyline = route.polyline?.encodedPolyline || undefined;

    return {
      eta: durationSeconds,
      distance: distanceMeters,
      polyline,
    };
  } catch (error) {
    console.error('[Maps] getETA falling back to Haversine:', error);
    const distanceMeters = Math.round(haversineDistance(origin, destination));
    return {
      eta: Math.round(distanceMeters / 8.33), // ~30 km/h avg city speed
      distance: distanceMeters,
    };
  }
}
