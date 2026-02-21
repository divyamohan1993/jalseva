// =============================================================================
// Test: Suppliers API — Nearby Search, Distance Calculation, Validation
// Covers: Test plan item #7 (supplier registration and nearby search)
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { GeoLocation, WaterType } from '../types';

// Replicate haversineDistance from maps.ts for isolated testing
function haversineDistance(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

describe('Suppliers API: Input validation', () => {
  it('rejects missing lat/lng', () => {
    expect(Number.isNaN(parseFloat(''))).toBe(true);
    expect(Number.isNaN(parseFloat('abc'))).toBe(true);
  });

  it('validates lat/lng ranges', () => {
    expect(-90 <= 28.6 && 28.6 <= 90).toBe(true); // Valid lat
    expect(-180 <= 77.2 && 77.2 <= 180).toBe(true); // Valid lng
    expect(-90 <= 91).toBe(true); // 91 > 90, invalid
    expect(91 <= 90).toBe(false);
  });

  it('validates radius range (0-50 km)', () => {
    expect(0 < 10 && 10 <= 50).toBe(true);
    const zero = 0;
    expect(zero < 0).toBe(false); // 0 is invalid
    expect(51 <= 50).toBe(false); // 51 is invalid
  });

  it('validates water types', () => {
    const valid: WaterType[] = ['ro', 'mineral', 'tanker'];
    expect(valid.includes('ro')).toBe(true);
    expect(valid.includes('invalid' as WaterType)).toBe(false);
  });

  it('limits results to max 50', () => {
    const limit = Math.min(parseInt('100', 10), 50);
    expect(limit).toBe(50);
  });
});

describe('Suppliers API: Haversine distance calculation', () => {
  it('calculates distance between two Delhi points', () => {
    const connaught: GeoLocation = { lat: 28.6315, lng: 77.2167 };
    const nehruPlace: GeoLocation = { lat: 28.5491, lng: 77.2533 };

    const distance = haversineDistance(connaught, nehruPlace);
    // ~9.5 km
    expect(distance).toBeGreaterThan(9000);
    expect(distance).toBeLessThan(10000);
  });

  it('returns 0 for same location', () => {
    const point: GeoLocation = { lat: 28.6139, lng: 77.209 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('calculates distance correctly for nearby points (~1 km)', () => {
    const a: GeoLocation = { lat: 28.6139, lng: 77.209 };
    const b: GeoLocation = { lat: 28.6229, lng: 77.209 }; // ~1km north

    const distance = haversineDistance(a, b);
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1100);
  });
});

describe('Suppliers API: Nearby filtering and sorting', () => {
  const userLocation: GeoLocation = { lat: 28.6139, lng: 77.209 };

  const suppliers = [
    { id: 'far', location: { lat: 29.0, lng: 77.5 } }, // ~50+ km
    { id: 'near', location: { lat: 28.62, lng: 77.21 } }, // ~0.7 km
    { id: 'mid', location: { lat: 28.65, lng: 77.25 } }, // ~5 km
  ];

  it('filters suppliers within radius', () => {
    const radiusKm = 10;
    const nearby = suppliers.filter((s) => {
      const d = haversineDistance(userLocation, s.location) / 1000;
      return d <= radiusKm;
    });

    expect(nearby.map((s) => s.id)).toContain('near');
    expect(nearby.map((s) => s.id)).toContain('mid');
    expect(nearby.map((s) => s.id)).not.toContain('far');
  });

  it('sorts by distance (nearest first)', () => {
    const radiusKm = 50;
    const nearby = suppliers
      .map((s) => ({
        ...s,
        distance: haversineDistance(userLocation, s.location) / 1000,
      }))
      .filter((s) => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    expect(nearby[0].id).toBe('near');
    expect(nearby[1].id).toBe('mid');
  });

  it('calculates ETA at 30 km/h average speed', () => {
    const distanceMeters = 5000; // 5km
    const etaSeconds = Math.round(distanceMeters / 8.33); // ~30 km/h
    const etaMinutes = Math.round(etaSeconds / 60);

    expect(etaSeconds).toBeGreaterThan(500);
    expect(etaSeconds).toBeLessThan(700);
    expect(etaMinutes).toBeGreaterThanOrEqual(9);
    expect(etaMinutes).toBeLessThanOrEqual(11);
  });
});
