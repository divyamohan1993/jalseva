'use client';

// =============================================================================
// JalSeva - Live Tracking Hook
// =============================================================================
// Subscribes to the `tracking` sub-document (or field) on the current order
// in Firestore and exposes real-time supplier location, ETA, distance, and
// route polyline. Recalculates a client-side ETA countdown every second.
// =============================================================================

import { useState, useEffect, useRef, } from 'react';
import { doc, onSnapshot, } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useOrderStore } from '@/store/orderStore';
import type { GeoLocation, OrderStatus, TrackingInfo } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseTrackingReturn {
  /** Supplier's latest GPS coordinates */
  supplierLocation: GeoLocation | null;
  /** Estimated time of arrival in seconds */
  eta: number | null;
  /** Distance remaining in metres */
  distance: number | null;
  /** Encoded polyline of the remaining route (for rendering on a map) */
  polyline: string | null;
  /** Current order status */
  status: OrderStatus | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often (ms) the local ETA countdown ticks */
const ETA_TICK_INTERVAL = 1_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTracking(orderId?: string): UseTrackingReturn {
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const updateTracking = useOrderStore((s) => s.updateTracking);

  const targetOrderId = orderId ?? currentOrder?.id;

  const [supplierLocation, setSupplierLocation] = useState<GeoLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [polyline, setPolyline] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  // Ref for the server-reported ETA so the countdown timer can decrement
  // independently of React state batching.
  const serverEtaRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // --------------------------------------------------------------------------
  // Subscribe to Firestore order document for tracking + status updates
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!targetOrderId) {
      setSupplierLocation(null);
      setEta(null);
      setDistance(null);
      setPolyline(null);
      setStatus(null);
      return;
    }

    const orderDocRef = doc(db, 'orders', targetOrderId);

    const unsubscribe = onSnapshot(
      orderDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const orderStatus = (data.status as OrderStatus) ?? null;
        setStatus(orderStatus);

        // Extract tracking info
        const tracking: TrackingInfo | undefined = data.tracking;

        if (tracking) {
          setSupplierLocation(tracking.supplierLocation ?? null);
          setDistance(tracking.distance ?? null);
          setPolyline(tracking.polyline ?? null);

          // Reset the ETA countdown reference
          const serverEta = tracking.eta ?? null;
          serverEtaRef.current = serverEta;
          lastUpdateRef.current = Date.now();
          setEta(serverEta);

          // Also sync back into the order store so other parts of the app
          // can read tracking without mounting this hook.
          updateTracking(tracking);
        }

        // If the order is terminal, clear tracking
        if (orderStatus === 'delivered' || orderStatus === 'cancelled') {
          setSupplierLocation(null);
          setEta(null);
          setDistance(null);
          setPolyline(null);
        }
      },
      (err) => {
        console.error('[useTracking] Firestore subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [targetOrderId, updateTracking]);

  // --------------------------------------------------------------------------
  // Client-side ETA countdown
  // --------------------------------------------------------------------------
  // Decrements the ETA every second based on real elapsed time since the last
  // server update, so the UI appears responsive between Firestore pushes.
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (serverEtaRef.current === null || serverEtaRef.current <= 0) return;

    const timer = setInterval(() => {
      if (serverEtaRef.current === null) return;

      const elapsed = Math.floor(
        (Date.now() - lastUpdateRef.current) / 1_000
      );
      const remaining = Math.max(0, serverEtaRef.current - elapsed);
      setEta(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, ETA_TICK_INTERVAL);

    return () => clearInterval(timer);
  }, [supplierLocation]);

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  return {
    supplierLocation,
    eta,
    distance,
    polyline,
    status,
  };
}
