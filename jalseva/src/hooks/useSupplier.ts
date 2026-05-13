'use client';

// =============================================================================
// JalSeva - Supplier Hook (in-memory demo store)
// =============================================================================
// Polls /api/supplier/dashboard every 5 s for the supplier profile, pending
// queue, active order, and today's earnings. No Firestore client subscriptions
// — the demo runs against the singleton in-memory store on the Cloud Run
// instance, so the supplier dashboard works without Firebase Auth.
// =============================================================================

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import type { Supplier, Order } from '@/types';

interface DashboardResponse {
  supplier: Supplier;
  isOnline: boolean;
  pendingOrders: Order[];
  activeOrder: Order | null;
  todayEarnings: number;
}

const POLL_INTERVAL_MS = 5000;

export function useSupplier() {
  const user = useAuthStore((s) => s.user);
  const {
    supplier,
    isOnline,
    pendingOrders,
    activeOrder,
    todayEarnings,
    setSupplier,
    setOnline,
    setPendingOrders,
    setActiveOrder,
    setTodayEarnings,
    removePendingOrder,
  } = useSupplierStore();

  // --------------------------------------------------------------------------
  // Poll the dashboard endpoint while we have a signed-in supplier
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== 'supplier') {
      setSupplier(null);
      setPendingOrders([]);
      setActiveOrder(null);
      setTodayEarnings(0);
      return;
    }

    let cancelled = false;
    const supplierId = user.id;

    async function fetchDashboard() {
      try {
        const res = await fetch(
          `/api/supplier/dashboard?supplierId=${encodeURIComponent(supplierId)}`,
          { cache: 'no-store' },
        );
        if (!res.ok || cancelled) return;
        const data: DashboardResponse = await res.json();
        if (cancelled) return;
        setSupplier(data.supplier);
        setOnline(data.isOnline);
        setPendingOrders(data.pendingOrders || []);
        setActiveOrder(data.activeOrder || null);
        setTodayEarnings(data.todayEarnings || 0);
      } catch {
        // Network blip — keep last good state, retry on next tick.
      }
    }

    fetchDashboard();
    const interval = setInterval(fetchDashboard, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    user?.id,
    user?.role,
    setSupplier,
    setOnline,
    setPendingOrders,
    setActiveOrder,
    setTodayEarnings,
  ]);

  // --------------------------------------------------------------------------
  // Toggle online / offline
  // --------------------------------------------------------------------------

  const toggleOnline = useCallback(async () => {
    if (!user) return;
    const next = !isOnline;
    try {
      const res = await fetch('/api/supplier/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggleOnline',
          supplierId: user.id,
          online: next,
        }),
      });
      if (!res.ok) throw new Error('toggle_failed');
      setOnline(next);
    } catch (err) {
      console.error('[useSupplier] Error toggling online status:', err);
      throw err;
    }
  }, [user, isOnline, setOnline]);

  // --------------------------------------------------------------------------
  // Accept an order — moves it from pending queue to active
  // --------------------------------------------------------------------------

  const acceptOrder = useCallback(
    async (orderId: string) => {
      if (!user) return;
      try {
        const res = await fetch('/api/supplier/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'acceptOrder',
            supplierId: user.id,
            orderId,
          }),
        });
        if (!res.ok) throw new Error('accept_failed');
        const data: { order: Order } = await res.json();
        removePendingOrder(orderId);
        setActiveOrder(data.order);
      } catch (err) {
        console.error('[useSupplier] Error accepting order:', err);
        throw err;
      }
    },
    [user, removePendingOrder, setActiveOrder],
  );

  // --------------------------------------------------------------------------
  // Reject an order — removes from queue locally + on the server
  // --------------------------------------------------------------------------

  const rejectOrder = useCallback(
    async (orderId: string) => {
      if (!user) return;
      try {
        await fetch('/api/supplier/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rejectOrder',
            supplierId: user.id,
            orderId,
          }),
        });
        removePendingOrder(orderId);
      } catch (err) {
        console.error('[useSupplier] Error rejecting order:', err);
        throw err;
      }
    },
    [user, removePendingOrder],
  );

  return {
    supplier,
    isOnline,
    toggleOnline,
    pendingOrders,
    activeOrder,
    todayEarnings,
    acceptOrder,
    rejectOrder,
  };
}
