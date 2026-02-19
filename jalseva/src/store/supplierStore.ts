// =============================================================================
// JalSeva - Supplier State Store (Zustand)
// =============================================================================
// State dedicated to the supplier-side experience: the supplier profile,
// online/offline toggle, incoming order queue, currently active order, and
// today's earnings summary.
// =============================================================================

import { create } from 'zustand';
import type { Supplier, Order } from '@/types';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface SupplierState {
  /** Supplier profile for the authenticated supplier user */
  supplier: Supplier | null;
  /** Whether the supplier is currently accepting orders */
  isOnline: boolean;
  /** Orders awaiting acceptance by this supplier */
  pendingOrders: Order[];
  /** The order the supplier is currently fulfilling */
  activeOrder: Order | null;
  /** Running total of earnings for the current calendar day (INR) */
  todayEarnings: number;

  // -- Actions ---------------------------------------------------------------
  setSupplier: (supplier: Supplier | null) => void;
  setOnline: (online: boolean) => void;
  setPendingOrders: (orders: Order[]) => void;
  setActiveOrder: (order: Order | null) => void;
  setTodayEarnings: (earnings: number) => void;
  /** Push a single order into the pending queue */
  addPendingOrder: (order: Order) => void;
  /** Remove an order from the pending queue by id (accepted / rejected / expired) */
  removePendingOrder: (orderId: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSupplierStore = create<SupplierState>((set) => ({
  // Initial state
  supplier: null,
  isOnline: false,
  pendingOrders: [],
  activeOrder: null,
  todayEarnings: 0,

  // Actions
  setSupplier: (supplier) => set({ supplier }),

  setOnline: (online) => set({ isOnline: online }),

  setPendingOrders: (orders) => set({ pendingOrders: orders }),

  setActiveOrder: (order) => set({ activeOrder: order }),

  setTodayEarnings: (earnings) => set({ todayEarnings: earnings }),

  addPendingOrder: (order) =>
    set((state) => ({
      pendingOrders: [...state.pendingOrders, order],
    })),

  removePendingOrder: (orderId) =>
    set((state) => ({
      pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
    })),
}));
