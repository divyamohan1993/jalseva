'use client';

// =============================================================================
// JalSeva - Supplier Hook
// =============================================================================
// Provides the supplier-side feature set:
//  - Fetch and cache the supplier profile from Firestore
//  - Toggle online/offline status (writes to Firestore)
//  - Listen for incoming order requests in real-time
//  - Accept / reject pending orders
// =============================================================================

import { useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';
import type {
  Supplier,
  Order,
  OrderStatus,
  WaterType,
  VerificationStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Firestore -> Domain Mappers
// ---------------------------------------------------------------------------

function docToSupplier(id: string, data: Record<string, any>): Supplier {
  return {
    id,
    userId: data.userId ?? '',
    documents: data.documents ?? {},
    verificationStatus: (data.verificationStatus as VerificationStatus) ?? 'pending',
    vehicle: data.vehicle ?? { type: '', capacity: 0, number: '' },
    isOnline: data.isOnline ?? false,
    currentLocation: data.currentLocation ?? undefined,
    serviceArea: data.serviceArea ?? { center: { lat: 0, lng: 0 }, radiusKm: 5 },
    waterTypes: (data.waterTypes as WaterType[]) ?? [],
    rating: data.rating ?? { average: 0, count: 0 },
    bankDetails: data.bankDetails ?? undefined,
    supportsSubscription: data.supportsSubscription ?? false,
  };
}

function docToOrder(id: string, data: Record<string, any>): Order {
  return {
    id,
    customerId: data.customerId ?? '',
    supplierId: data.supplierId ?? undefined,
    waterType: (data.waterType as WaterType) ?? 'tanker',
    quantityLitres: data.quantityLitres ?? 0,
    price: data.price ?? {
      base: 0,
      distance: 0,
      surge: 0,
      total: 0,
      commission: 0,
      supplierEarning: 0,
    },
    status: (data.status as OrderStatus) ?? 'searching',
    deliveryLocation: data.deliveryLocation ?? { lat: 0, lng: 0 },
    supplierLocation: data.supplierLocation ?? undefined,
    tracking: data.tracking ?? undefined,
    payment: data.payment ?? {
      method: 'cash' as PaymentMethod,
      status: 'pending' as PaymentStatus,
      amount: 0,
    },
    rating: data.rating ?? undefined,
    beckn: data.beckn ?? undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt ?? Date.now()),
    acceptedAt:
      data.acceptedAt instanceof Timestamp
        ? data.acceptedAt.toDate()
        : data.acceptedAt
          ? new Date(data.acceptedAt)
          : undefined,
    pickedAt:
      data.pickedAt instanceof Timestamp
        ? data.pickedAt.toDate()
        : data.pickedAt
          ? new Date(data.pickedAt)
          : undefined,
    deliveredAt:
      data.deliveredAt instanceof Timestamp
        ? data.deliveredAt.toDate()
        : data.deliveredAt
          ? new Date(data.deliveredAt)
          : undefined,
    cancelledAt:
      data.cancelledAt instanceof Timestamp
        ? data.cancelledAt.toDate()
        : data.cancelledAt
          ? new Date(data.cancelledAt)
          : undefined,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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
  // Fetch supplier profile
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== 'supplier') {
      setSupplier(null);
      return;
    }

    let cancelled = false;

    async function fetchSupplier() {
      try {
        const supplierDocRef = doc(db, 'suppliers', user!.id);
        const snap = await getDoc(supplierDocRef);

        if (snap.exists() && !cancelled) {
          const profile = docToSupplier(snap.id, snap.data());
          setSupplier(profile);
          setOnline(profile.isOnline);
        }
      } catch (err) {
        console.error('[useSupplier] Error fetching supplier profile:', err);
      }
    }

    fetchSupplier();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, setOnline, setSupplier, user]);

  // --------------------------------------------------------------------------
  // Listen for incoming (pending) order requests
  // --------------------------------------------------------------------------
  // Orders with status === 'searching' and no supplierId yet are broadcast to
  // eligible suppliers. The supplier app then shows these as incoming requests.
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== 'supplier' || !isOnline) {
      setPendingOrders([]);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const pendingQuery = query(
      ordersRef,
      where('status', '==', 'searching'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const orders: Order[] = snapshot.docs.map((d) =>
          docToOrder(d.id, d.data())
        );
        setPendingOrders(orders);
      },
      (err) => {
        console.error('[useSupplier] Pending orders subscription error:', err);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, isOnline, setPendingOrders, user]);

  // --------------------------------------------------------------------------
  // Listen for the supplier's active (accepted / en_route / arriving) order
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== 'supplier') {
      setActiveOrder(null);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const activeQuery = query(
      ordersRef,
      where('supplierId', '==', user.id),
      where('status', 'in', ['accepted', 'en_route', 'arriving']),
      orderBy('acceptedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const first = snapshot.docs[0];
          setActiveOrder(docToOrder(first.id, first.data()));
        } else {
          setActiveOrder(null);
        }
      },
      (err) => {
        console.error('[useSupplier] Active order subscription error:', err);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, setActiveOrder, user]);

  // --------------------------------------------------------------------------
  // Calculate today's earnings from delivered orders
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== 'supplier') {
      setTodayEarnings(0);
      return;
    }

    // Start of today (midnight) as a Firestore Timestamp
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    const ordersRef = collection(db, 'orders');
    const earningsQuery = query(
      ordersRef,
      where('supplierId', '==', user.id),
      where('status', '==', 'delivered'),
      where('deliveredAt', '>=', todayTimestamp),
      orderBy('deliveredAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      earningsQuery,
      (snapshot) => {
        let total = 0;
        snapshot.docs.forEach((d) => {
          const data = d.data();
          total += data.price?.supplierEarning ?? 0;
        });
        setTodayEarnings(total);
      },
      (err) => {
        console.error('[useSupplier] Earnings subscription error:', err);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, setTodayEarnings, user]);

  // --------------------------------------------------------------------------
  // Toggle online/offline
  // --------------------------------------------------------------------------

  const toggleOnline = useCallback(async () => {
    if (!user) return;

    const newStatus = !isOnline;

    try {
      const supplierDocRef = doc(db, 'suppliers', user.id);
      await updateDoc(supplierDocRef, {
        isOnline: newStatus,
        updatedAt: serverTimestamp(),
      });
      setOnline(newStatus);
    } catch (err) {
      console.error('[useSupplier] Error toggling online status:', err);
      throw err;
    }
  }, [user, isOnline, setOnline]);

  // --------------------------------------------------------------------------
  // Accept an order
  // --------------------------------------------------------------------------

  const acceptOrder = useCallback(
    async (orderId: string) => {
      if (!user) return;

      try {
        const orderDocRef = doc(db, 'orders', orderId);
        await updateDoc(orderDocRef, {
          supplierId: user.id,
          status: 'accepted' as OrderStatus,
          acceptedAt: serverTimestamp(),
        });

        // Move from pending to active locally
        const accepted = pendingOrders.find((o) => o.id === orderId);
        if (accepted) {
          removePendingOrder(orderId);
          setActiveOrder({
            ...accepted,
            supplierId: user.id,
            status: 'accepted',
            acceptedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[useSupplier] Error accepting order:', err);
        throw err;
      }
    },
    [user, pendingOrders, removePendingOrder, setActiveOrder]
  );

  // --------------------------------------------------------------------------
  // Reject an order (remove from local pending list; the order stays in
  // Firestore for other suppliers to pick up)
  // --------------------------------------------------------------------------

  const rejectOrder = useCallback(
    async (orderId: string) => {
      if (!user) return;

      try {
        // Optionally record the rejection so the system doesn't re-show it
        const orderDocRef = doc(db, 'orders', orderId);
        await updateDoc(orderDocRef, {
          [`rejectedBy.${user.id}`]: serverTimestamp(),
        });

        removePendingOrder(orderId);
      } catch (err) {
        console.error('[useSupplier] Error rejecting order:', err);
        throw err;
      }
    },
    [user, removePendingOrder]
  );

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

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
