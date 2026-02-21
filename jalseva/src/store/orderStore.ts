// =============================================================================
// JalSeva - Order Management Store (Zustand)
// =============================================================================
// Centralised state for orders. Uses a Map<string, Order> for O(1) lookups by
// order ID instead of scanning an array. Holds the currently-viewed/active
// order and helpers to mutate individual order status and tracking data.
// =============================================================================

import { create } from 'zustand';
import type { Order, OrderStatus, TrackingInfo } from '@/types';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface OrderState {
  /** The order the user is currently viewing or interacting with */
  currentOrder: Order | null;
  /** Map for O(1) order lookup by ID */
  ordersMap: Map<string, Order>;
  /** Derived sorted array (computed on access, not stored) */
  orders: Order[];
  /** True while orders are being fetched from Firestore */
  loading: boolean;

  // -- Actions ---------------------------------------------------------------
  setCurrentOrder: (order: Order | null) => void;
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
  /** Update the status of a single order in the list and, if it is the current
   *  order, update that reference too. */
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  /** Merge tracking information into the matching order */
  updateTracking: (tracking: TrackingInfo) => void;
  /** O(1) lookup by ID */
  getOrderById: (id: string) => Order | undefined;
  setLoading: (loading: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOrderStore = create<OrderState>((set, get) => ({
  // Initial state
  currentOrder: null,
  ordersMap: new Map(),
  get orders() {
    return Array.from(get().ordersMap.values());
  },
  loading: false,

  // Actions
  setCurrentOrder: (order) => set({ currentOrder: order }),

  addOrder: (order) =>
    set((state) => {
      const next = new Map(state.ordersMap);
      next.set(order.id, order);
      return { ordersMap: next, orders: Array.from(next.values()) };
    }),

  setOrders: (orders) =>
    set(() => {
      const map = new Map<string, Order>();
      for (const o of orders) map.set(o.id, o);
      return { ordersMap: map, orders };
    }),

  updateOrderStatus: (orderId, status) =>
    set((state) => {
      const existing = state.ordersMap.get(orderId);
      if (!existing) return state;

      const updated = { ...existing, status };
      const next = new Map(state.ordersMap);
      next.set(orderId, updated);

      return {
        ordersMap: next,
        orders: Array.from(next.values()),
        currentOrder:
          state.currentOrder?.id === orderId
            ? updated
            : state.currentOrder,
      };
    }),

  updateTracking: (tracking) =>
    set((state) => {
      if (!state.currentOrder) return state;

      const updated = { ...state.currentOrder, tracking };
      const next = new Map(state.ordersMap);
      next.set(updated.id, updated);

      return {
        currentOrder: updated,
        ordersMap: next,
        orders: Array.from(next.values()),
      };
    }),

  getOrderById: (id) => get().ordersMap.get(id),

  setLoading: (loading) => set({ loading }),
}));
