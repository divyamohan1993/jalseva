// =============================================================================
// Test: Utility Functions — Pricing, Formatting, ID Generation
// Covers: Test plan items #6 (order pricing), #7 (supplier search)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatDistance,
  formatDuration,
  generateOrderId,
  calculatePrice,
  formatLitres,
} from '../utils';

describe('calculatePrice', () => {
  it('calculates base price for RO water', () => {
    const price = calculatePrice('ro', 100, 0, 1.0);
    expect(price.base).toBe(80); // 0.8 * 100
    expect(price.distance).toBe(0);
    expect(price.surge).toBe(0);
    expect(price.total).toBe(80);
    expect(price.commission).toBe(12); // 15% of 80
    expect(price.supplierEarning).toBe(68);
  });

  it('calculates distance charge', () => {
    const price = calculatePrice('ro', 100, 10_000, 1.0); // 10km
    expect(price.base).toBe(80);
    expect(price.distance).toBe(150); // 10km * 15/km
    expect(price.total).toBe(230);
  });

  it('applies surge multiplier', () => {
    const normal = calculatePrice('mineral', 100, 5_000, 1.0);
    const surged = calculatePrice('mineral', 100, 5_000, 1.5);
    expect(surged.total).toBeGreaterThan(normal.total);
    expect(surged.surge).toBeGreaterThan(0);
  });

  it('clamps surge multiplier to minimum 1.0', () => {
    const price = calculatePrice('ro', 100, 0, 0.5);
    expect(price.surge).toBe(0); // Treated as 1.0
  });

  it('calculates tanker (bulk) pricing', () => {
    const price = calculatePrice('tanker', 5000, 20_000, 1.0);
    expect(price.base).toBe(2500); // 0.5 * 5000
    expect(price.distance).toBe(300); // 20km * 15
    expect(price.total).toBe(2800);
  });

  it('commission + supplierEarning = total', () => {
    const price = calculatePrice('mineral', 200, 15_000, 1.3);
    expect(price.commission + price.supplierEarning).toBe(price.total);
  });
});

describe('formatPrice', () => {
  it('formats Indian Rupees', () => {
    expect(formatPrice(250)).toContain('250');
    expect(formatPrice(1250)).toMatch(/1,250/);
  });
});

describe('formatDistance', () => {
  it('formats meters < 1000', () => {
    expect(formatDistance(800)).toBe('800 m');
  });

  it('formats kilometers', () => {
    expect(formatDistance(1500)).toBe('1.5 km');
    expect(formatDistance(10000)).toBe('10.0 km');
  });
});

describe('formatDuration', () => {
  it('formats < 1 minute', () => {
    expect(formatDuration(30)).toBe('< 1 min');
  });

  it('formats minutes', () => {
    expect(formatDuration(300)).toBe('5 min');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(5400)).toBe('1 hr 30 min');
  });

  it('formats exact hours', () => {
    expect(formatDuration(3600)).toBe('1 hr');
  });
});

describe('generateOrderId', () => {
  it('produces JLS- prefix with 8 hex chars', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^JLS-[0-9A-F]{8}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOrderId()));
    expect(ids.size).toBe(100);
  });
});

describe('formatLitres', () => {
  it('formats small volumes', () => {
    expect(formatLitres(500)).toBe('500L');
  });

  it('formats kilolitres', () => {
    expect(formatLitres(2500)).toBe('2.5kL');
  });
});
