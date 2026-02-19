// =============================================================================
// JalSeva - Order Management Store (Zustand)
// =============================================================================
// Centralised state for orders. Holds the list of orders belonging to the
// current user, the currently-viewed/active order, and helpers to mutate
// individual order status and tracking data without full list replacement.
// =============================================================================

import { create } from 'zustand';
import type { Order, OrderStatus, TrackingInfo } from '@/types';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface OrderState {
  /** The order the user is currently viewing or interacting with */
  currentOrder: Order | null;
  /** Full list of orders for the current user (customer or supplier) */
  orders: Order[];
  /** True while orders are being fetched from Firestore */
  loading: boolean;

  // -- Actions ---------------------------------------------------------------
  setCurrentOrder: (order: Order | null) => void;
  setOrders: (orders: Order[]) => void;
  /** Update the status of a single order in the list and, if it is the current
   *  order, update that reference too. */
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  /** Merge tracking information into the matching order */
  updateTracking: (tracking: TrackingInfo) => void;
  /** Append a new order to the list */
  addOrder: (order: Order) => void;
  setLoading: (loading: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOrderStore = create<OrderState>((set) => ({
  // Initial state
  currentOrder: null,
  orders: [],
  loading: false,

  // Actions
  setCurrentOrder: (order) => set({ currentOrder: order }),

  setOrders: (orders) => set({ orders }),

  updateOrderStatus: (orderId, status) =>
    set((state) => {
      const orders = state.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );

      const currentOrder =
        state.currentOrder?.id === orderId
          ? { ...state.currentOrder, status }
          : state.currentOrder;

      return { orders, currentOrder };
    }),

  updateTracking: (tracking) =>
    set((state) => {
      // When we receive tracking data we update the currentOrder's tracking
      // field and also patch any matching order in the orders array.
      const currentOrder = state.currentOrder
        ? { ...state.currentOrder, tracking }
        : state.currentOrder;

      const orders = state.orders.map((o) =>
        o.id === state.currentOrder?.id ? { ...o, tracking } : o
      );

      return { currentOrder, orders };
    }),

  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders],
    })),

  setLoading: (loading) => set({ loading }),
}));
