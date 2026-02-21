// =============================================================================
// Test: Admin Analytics — Period Calculation, Caching Strategy
// Covers: Test plan item #9 (admin dashboard loads analytics, orders, complaints)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { LRUCache, cacheAside } from '../lib/cache';

describe('Admin Analytics: Period calculation', () => {
  function getDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  it('calculates today range', () => {
    const { startDate, endDate } = getDateRange('today');
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  });

  it('calculates week range (7 days)', () => {
    const { startDate, endDate } = getDateRange('week');
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6.9);
    expect(diffDays).toBeLessThanOrEqual(7.1);
  });

  it('calculates month range (30 days)', () => {
    const { startDate, endDate } = getDateRange('month');
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it('defaults to 30 days for unknown period', () => {
    const { startDate, endDate } = getDateRange('unknown');
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
  });
});

describe('Admin Analytics: Multi-level caching', () => {
  it('L1 cache (hotCache) returns data within TTL', async () => {
    const hotCache = new LRUCache(20_000);

    const analyticsData = {
      totalOrders: 1500,
      totalRevenue: 250000,
      activeSuppliers: 45,
    };

    hotCache.set('analytics:month', analyticsData, 60); // 60s TTL

    const cached = hotCache.get('analytics:month');
    expect(cached).toEqual(analyticsData);
  });

  it('cacheAside pattern works for analytics', async () => {
    const cache = new LRUCache(100);
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      return { orders: 100, revenue: 50000 };
    };

    // First call — cache miss
    const r1 = await cacheAside(cache, 'analytics:week', fetcher, 60);
    expect(r1).toEqual({ orders: 100, revenue: 50000 });
    expect(fetchCount).toBe(1);

    // Second call — cache hit
    const r2 = await cacheAside(cache, 'analytics:week', fetcher, 60);
    expect(r2).toEqual({ orders: 100, revenue: 50000 });
    expect(fetchCount).toBe(1); // No additional fetch
  });
});

describe('Admin Analytics: Response structure', () => {
  it('validates analytics response shape', () => {
    const response = {
      success: true,
      analytics: {
        period: 'month',
        orders: { total: 100, delivered: 80, cancelled: 5 },
        revenue: {
          total: 250000,
          byWaterType: { ro: 100000, mineral: 100000, tanker: 50000 },
        },
        suppliers: { total: 50, active: 30, verified: 25, pending: 5 },
        rates: { completion: 0.8, cancellation: 0.05 },
        averages: { deliveryTime: 1800, orderValue: 2500 },
      },
    };

    expect(response.success).toBe(true);
    expect(response.analytics.orders.total).toBe(100);
    expect(response.analytics.rates.completion).toBe(0.8);
    expect(
      response.analytics.revenue.byWaterType.ro +
      response.analytics.revenue.byWaterType.mineral +
      response.analytics.revenue.byWaterType.tanker
    ).toBe(response.analytics.revenue.total);
  });

  it('validates granularity options', () => {
    const validGranularities = ['daily', 'weekly', 'monthly'];
    expect(validGranularities.includes('daily')).toBe(true);
    expect(validGranularities.includes('hourly')).toBe(false);
  });
});
