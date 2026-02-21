// =============================================================================
// JalSeva - Supplier State Store (Zustand)
// =============================================================================
// State dedicated to the supplier-side experience: the supplier profile,
// online/offline toggle, incoming order queue, currently active order, and
// today's earnings summary.
//
// Uses a Set<string> for pendingOrderIds alongside the pendingOrders array to
// enable O(1) duplicate checks when adding incoming orders.
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
  /** Set of pending order IDs for O(1) duplicate / membership checks */
  pendingOrderIds: Set<string>;
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
  /** Push a single order into the pending queue (skips duplicates via Set) */
  addPendingOrder: (order: Order) => void;
  /** Remove an order from the pending queue by id (accepted / rejected / expired) */
  removePendingOrder: (orderId: string) => void;
  /** O(1) check whether an order is already in the pending queue */
  hasPendingOrder: (id: string) => boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSupplierStore = create<SupplierState>((set, get) => ({
  // Initial state
  supplier: null,
  isOnline: false,
  pendingOrders: [],
  pendingOrderIds: new Set(),
  activeOrder: null,
  todayEarnings: 0,

  // Actions
  setSupplier: (supplier) => set({ supplier }),

  setOnline: (online) => set({ isOnline: online }),

  setPendingOrders: (orders) =>
    set(() => {
      const ids = new Set<string>(orders.map((o) => o.id));
      return { pendingOrders: orders, pendingOrderIds: ids };
    }),

  setActiveOrder: (order) => set({ activeOrder: order }),

  setTodayEarnings: (earnings) => set({ todayEarnings: earnings }),

  addPendingOrder: (order) =>
    set((state) => {
      // O(1) duplicate guard
      if (state.pendingOrderIds.has(order.id)) return state;

      const nextIds = new Set(state.pendingOrderIds);
      nextIds.add(order.id);
      return {
        pendingOrders: [...state.pendingOrders, order],
        pendingOrderIds: nextIds,
      };
    }),

  removePendingOrder: (orderId) =>
    set((state) => {
      if (!state.pendingOrderIds.has(orderId)) return state;

      const nextIds = new Set(state.pendingOrderIds);
      nextIds.delete(orderId);
      return {
        pendingOrders: state.pendingOrders.filter((o) => o.id !== orderId),
        pendingOrderIds: nextIds,
      };
    }),

  hasPendingOrder: (id) => get().pendingOrderIds.has(id),
}));
