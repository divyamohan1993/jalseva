// =============================================================================
// JalSeva - Geohash Spatial Index
// =============================================================================
// Replaces O(n) Haversine scan of all suppliers with O(1) geohash bucket
// lookup. At 50K RPS, scanning 10K suppliers per request is not viable.
//
// How it works:
//   1. Divide India into geohash grid cells (~1.2km x 0.6km at precision 6)
//   2. When a supplier updates location, index them into their geohash cell
//   3. For nearby queries, compute neighboring cells and union the results
//   4. Only run Haversine on the small set of candidates in nearby cells
//
// This reduces supplier lookup from O(n) to O(k) where k << n.
// For 10K suppliers, typical k is 5-50 (suppliers in 9 neighboring cells).
// =============================================================================

import type { GeoLocation } from '@/types';

// ---------------------------------------------------------------------------
// Geohash encoding (base-32)
// ---------------------------------------------------------------------------

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode lat/lng into a geohash string of given precision.
 * Precision 6 = ~1.2km x 0.6km cells (good for 10km radius queries).
 * Precision 5 = ~4.9km x 4.9km cells (good for city-level).
 */
export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isLng = !isLng;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Decode a geohash back to the center lat/lng of its cell.
 */
export function decodeGeohash(hash: string): { lat: number; lng: number } {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let isLng = true;

  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) break;

    for (let bit = 4; bit >= 0; bit--) {
      if (isLng) {
        const mid = (lngMin + lngMax) / 2;
        if (idx & (1 << bit)) {
          lngMin = mid;
        } else {
          lngMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isLng = !isLng;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  };
}

/**
 * Get the 8 neighboring geohash cells + the cell itself (9 total).
 * This covers a search area roughly 3x the cell size in each direction.
 */
export function getNeighbors(hash: string): string[] {
  const { lat, lng } = decodeGeohash(hash);
  const precision = hash.length;

  // Cell dimensions vary by latitude but these are good approximations
  // for India (lat 8-37 degrees)
  const latErr = 180 / Math.pow(2, Math.ceil(precision * 5 / 2));
  const lngErr = 360 / Math.pow(2, Math.floor(precision * 5 / 2));

  const offsets = [
    [0, 0],   // center
    [1, 0],   // north
    [-1, 0],  // south
    [0, 1],   // east
    [0, -1],  // west
    [1, 1],   // northeast
    [1, -1],  // northwest
    [-1, 1],  // southeast
    [-1, -1], // southwest
  ];

  const neighbors = new Set<string>();
  for (const [dLat, dLng] of offsets) {
    const nLat = lat + dLat * latErr * 2;
    const nLng = lng + dLng * lngErr * 2;
    if (nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
      neighbors.add(encodeGeohash(nLat, nLng, precision));
    }
  }

  return Array.from(neighbors);
}

/**
 * Get all geohash cells that cover a radius around a point.
 * For large radii (>5km), uses lower precision to cover more area.
 */
export function getCellsForRadius(lat: number, lng: number, radiusKm: number): string[] {
  // Choose precision based on radius
  let precision: number;
  if (radiusKm <= 1) precision = 7;      // ~150m cells
  else if (radiusKm <= 5) precision = 6;  // ~1.2km cells
  else if (radiusKm <= 20) precision = 5; // ~4.9km cells
  else precision = 4;                      // ~39km cells

  const centerHash = encodeGeohash(lat, lng, precision);

  if (radiusKm <= 3.5) {
    // 9 cells (center + 8 neighbors) covers ~3.6km radius at precision 6
    return getNeighbors(centerHash);
  }

  // For larger radii, expand to neighbors of neighbors
  const allCells = new Set<string>();
  const firstRing = getNeighbors(centerHash);
  for (const cell of firstRing) {
    allCells.add(cell);
    for (const neighbor of getNeighbors(cell)) {
      allCells.add(neighbor);
    }
  }

  return Array.from(allCells);
}

// ---------------------------------------------------------------------------
// In-Memory Spatial Index
// ---------------------------------------------------------------------------

interface IndexedSupplier {
  id: string;
  lat: number;
  lng: number;
  geohash: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

/**
 * In-memory geohash spatial index. Maps geohash cells to sets of supplier IDs,
 * enabling O(1) cell lookup instead of O(n) full scan.
 *
 * Memory usage: ~200 bytes per supplier. 100K suppliers = ~20MB.
 */
export class GeoSpatialIndex {
  // geohash cell -> Set of supplier IDs in that cell
  private cells = new Map<string, Set<string>>();
  // supplier ID -> indexed supplier data
  private suppliers = new Map<string, IndexedSupplier>();
  // Stale entry cleanup interval
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly staleThresholdMs: number;
  private readonly precision: number;

  constructor(options?: { precision?: number; staleThresholdMs?: number }) {
    this.precision = options?.precision ?? 6;
    this.staleThresholdMs = options?.staleThresholdMs ?? 600_000; // 10 min

    // Clean up stale entries every 2 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.evictStale(), 120_000);
      if (this.cleanupTimer.unref) this.cleanupTimer.unref();
    }
  }

  /**
   * Index or update a supplier's location. O(1) amortized.
   */
  upsert(id: string, lat: number, lng: number, data: Record<string, unknown> = {}): void {
    const geohash = encodeGeohash(lat, lng, this.precision);

    // Remove from old cell if location changed
    const existing = this.suppliers.get(id);
    if (existing && existing.geohash !== geohash) {
      const oldCell = this.cells.get(existing.geohash);
      if (oldCell) {
        oldCell.delete(id);
        if (oldCell.size === 0) this.cells.delete(existing.geohash);
      }
    }

    // Add to new cell
    let cell = this.cells.get(geohash);
    if (!cell) {
      cell = new Set();
      this.cells.set(geohash, cell);
    }
    cell.add(id);

    // Update supplier record
    this.suppliers.set(id, {
      id,
      lat,
      lng,
      geohash,
      data,
      updatedAt: Date.now(),
    });
  }

  /**
   * Remove a supplier from the index. O(1).
   */
  remove(id: string): boolean {
    const existing = this.suppliers.get(id);
    if (!existing) return false;

    const cell = this.cells.get(existing.geohash);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) this.cells.delete(existing.geohash);
    }

    this.suppliers.delete(id);
    return true;
  }

  /**
   * Find suppliers near a point within radiusKm.
   * Returns candidates with approximate distances. Use Haversine on the
   * small candidate set for exact filtering.
   *
   * Complexity: O(k) where k = suppliers in nearby cells, typically << n.
   */
  findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filter?: (data: Record<string, unknown>) => boolean
  ): IndexedSupplier[] {
    const cells = getCellsForRadius(lat, lng, radiusKm);
    const candidates: IndexedSupplier[] = [];

    for (const cellHash of cells) {
      const cell = this.cells.get(cellHash);
      if (!cell) continue;

      for (const supplierId of cell) {
        const supplier = this.suppliers.get(supplierId);
        if (!supplier) continue;
        if (filter && !filter(supplier.data)) continue;
        candidates.push(supplier);
      }
    }

    return candidates;
  }

  /** Number of indexed suppliers */
  get size(): number {
    return this.suppliers.size;
  }

  /** Number of active cells */
  get cellCount(): number {
    return this.cells.size;
  }

  /** Get a supplier by ID */
  get(id: string): IndexedSupplier | undefined {
    return this.suppliers.get(id);
  }

  /** Stop cleanup timer */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private evictStale(): void {
    const cutoff = Date.now() - this.staleThresholdMs;
    for (const [id, supplier] of this.suppliers) {
      if (supplier.updatedAt < cutoff) {
        this.remove(id);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Index
// ---------------------------------------------------------------------------

/** Global supplier spatial index. Shared across all request handlers. */
export const supplierIndex = new GeoSpatialIndex({
  precision: 6,            // ~1.2km cells
  staleThresholdMs: 600_000, // 10 minutes
});
