// =============================================================================
// JalSeva - Booking Flow Store (Zustand)
// =============================================================================
// Tracks the multi-step booking wizard state: water type selection, quantity,
// delivery location, calculated price, and which step of the flow the user is
// currently on. Provides a `reset` action to clear everything when the user
// cancels or completes a booking.
// =============================================================================

import { create } from 'zustand';
import type { WaterType, GeoLocation, OrderPrice } from '@/types';

// ---------------------------------------------------------------------------
// Step Literal Type
// ---------------------------------------------------------------------------

export type BookingStep =
  | 'select_water'
  | 'select_quantity'
  | 'confirm'
  | 'searching'
  | 'tracking';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface BookingState {
  /** Selected water type (RO / mineral / tanker) */
  waterType: WaterType | null;
  /** Quantity in litres */
  quantity: number;
  /** GPS coordinates + optional address for delivery */
  deliveryLocation: GeoLocation | null;
  /** Calculated price breakdown from the pricing service */
  price: OrderPrice | null;
  /** Current step in the booking wizard */
  step: BookingStep;

  // -- Actions ---------------------------------------------------------------
  setWaterType: (type: WaterType) => void;
  setQuantity: (qty: number) => void;
  setDeliveryLocation: (location: GeoLocation) => void;
  setPrice: (price: OrderPrice) => void;
  setStep: (step: BookingStep) => void;
  /** Reset every field back to its initial default */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial (default) state values - extracted so `reset` can reuse them
// ---------------------------------------------------------------------------

const initialState = {
  waterType: null as WaterType | null,
  quantity: 500, // sensible default: 500 litres
  deliveryLocation: null as GeoLocation | null,
  price: null as OrderPrice | null,
  step: 'select_water' as BookingStep,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBookingStore = create<BookingState>((set) => ({
  // Spread initial values
  ...initialState,

  // Actions
  setWaterType: (type) => set({ waterType: type }),

  setQuantity: (qty) => set({ quantity: qty }),

  setDeliveryLocation: (location) => set({ deliveryLocation: location }),

  setPrice: (price) => set({ price }),

  setStep: (step) => set({ step }),

  reset: () => set({ ...initialState }),
}));
