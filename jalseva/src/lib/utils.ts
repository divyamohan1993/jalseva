// =============================================================================
// JalSeva - Utility Functions
// =============================================================================
// Shared helpers used across the application: class merging, formatting,
// ID generation, and dynamic pricing calculations.
// =============================================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import type { WaterType, OrderPrice } from '@/types';

// ---------------------------------------------------------------------------
// cn - TailwindCSS Class Merger
// ---------------------------------------------------------------------------

/**
 * Merges class names using clsx for conditional logic and tailwind-merge
 * to resolve conflicting Tailwind classes.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6')
 * // => 'py-2 px-6 bg-blue-500'  (px-4 is overridden by px-6)
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------

/**
 * Formats a numeric amount as Indian Rupees.
 *
 * @param amount - The amount in rupees (not paise).
 * @returns Formatted string like "₹250" or "₹1,250.50".
 */
export function formatPrice(amount: number): string {
  // Use the Indian numbering system (en-IN) for proper lakh/crore grouping.
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// formatDistance
// ---------------------------------------------------------------------------

/**
 * Formats a distance in meters to a human-readable string.
 *
 * @param meters - Distance in meters.
 * @returns Formatted string like "1.5 km" or "800 m".
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

/**
 * Formats a duration in seconds to a human-readable string.
 *
 * @param seconds - Duration in seconds.
 * @returns Formatted string like "5 min", "1 hr 30 min", or "< 1 min".
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

// ---------------------------------------------------------------------------
// generateOrderId
// ---------------------------------------------------------------------------

/**
 * Generates a unique order ID with the JLS- prefix.
 *
 * @returns A string like "JLS-A1B2C3D4" (prefix + 8 uppercase hex chars).
 */
export function generateOrderId(): string {
  // Take the first 8 characters of a UUID (without hyphens) and uppercase them.
  const shortId = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `JLS-${shortId}`;
}

// ---------------------------------------------------------------------------
// calculatePrice
// ---------------------------------------------------------------------------

/**
 * Base prices per litre for each water type (in rupees).
 */
const BASE_PRICES: Record<WaterType, number> = {
  ro: 0.8, // Rs 0.80 per litre
  mineral: 1.5, // Rs 1.50 per litre
  tanker: 0.5, // Rs 0.50 per litre (bulk)
};

/**
 * Rate charged per kilometre of delivery distance (in rupees).
 */
const PER_KM_RATE = 15;

/**
 * Platform commission percentage (taken from the total price).
 */
const COMMISSION_PERCENT = 15;

/**
 * Calculates the dynamic price for a water delivery order.
 *
 * Pricing formula:
 *   baseAmount     = BASE_PRICE[waterType] * quantity
 *   distanceCharge = (distanceMeters / 1000) * PER_KM_RATE
 *   surgeAmount    = (baseAmount + distanceCharge) * (surgeMultiplier - 1)
 *   total          = baseAmount + distanceCharge + surgeAmount
 *   commission     = total * COMMISSION_PERCENT / 100
 *   supplierEarning = total - commission
 *
 * @param waterType       - Type of water (ro, mineral, tanker).
 * @param quantity        - Quantity in litres.
 * @param distanceMeters  - Delivery distance in meters.
 * @param surgeMultiplier - Demand-based surge multiplier (1.0 = no surge).
 * @returns A complete OrderPrice breakdown.
 */
export function calculatePrice(
  waterType: WaterType,
  quantity: number,
  distanceMeters: number,
  surgeMultiplier: number = 1.0
): OrderPrice {
  // Ensure surge multiplier is at least 1.0
  const surge = Math.max(1.0, surgeMultiplier);

  // Base amount: price per litre * quantity
  const base = Math.round(BASE_PRICES[waterType] * quantity);

  // Distance charge: rate per km * distance in km
  const distanceKm = distanceMeters / 1000;
  const distance = Math.round(distanceKm * PER_KM_RATE);

  // Surge is the additional amount on top of (base + distance)
  const subtotal = base + distance;
  const surgeAmount = Math.round(subtotal * (surge - 1));

  // Total payable by customer
  const total = subtotal + surgeAmount;

  // Platform commission
  const commission = Math.round(total * (COMMISSION_PERCENT / 100));

  // Supplier earnings after commission
  const supplierEarning = total - commission;

  return {
    base,
    distance,
    surge: surgeAmount,
    total,
    commission,
    supplierEarning,
  };
}

// ---------------------------------------------------------------------------
// Additional Formatting Helpers (kept from existing codebase)
// ---------------------------------------------------------------------------

/**
 * Formats currency using the Indian numbering system (shorthand alias).
 */
export function formatCurrency(amount: number): string {
  return formatPrice(amount);
}

/**
 * Formats litres into a human-readable string (e.g. "1.5kL" or "500L").
 */
export function formatLitres(litres: number): string {
  if (litres >= 1000) {
    return `${(litres / 1000).toFixed(1)}kL`;
  }
  return `${litres}L`;
}
