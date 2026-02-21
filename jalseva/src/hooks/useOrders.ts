'use client';

// =============================================================================
// JalSeva - Orders Hook
// =============================================================================
// Subscribes to the Firestore `orders` collection in real-time using
// onSnapshot. Automatically filters by customerId or supplierId depending on
// the current user's role.
// =============================================================================

import { useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import type { Order, OrderStatus, WaterType, PaymentMethod, PaymentStatus } from '@/types';

// ---------------------------------------------------------------------------
// Firestore document -> domain Order mapper
// ---------------------------------------------------------------------------

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
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt ?? Date.now()),
    acceptedAt: data.acceptedAt instanceof Timestamp
      ? data.acceptedAt.toDate()
      : data.acceptedAt
        ? new Date(data.acceptedAt)
        : undefined,
    pickedAt: data.pickedAt instanceof Timestamp
      ? data.pickedAt.toDate()
      : data.pickedAt
        ? new Date(data.pickedAt)
        : undefined,
    deliveredAt: data.deliveredAt instanceof Timestamp
      ? data.deliveredAt.toDate()
      : data.deliveredAt
        ? new Date(data.deliveredAt)
        : undefined,
    cancelledAt: data.cancelledAt instanceof Timestamp
      ? data.cancelledAt.toDate()
      : data.cancelledAt
        ? new Date(data.cancelledAt)
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrders() {
  const user = useAuthStore((s) => s.user);
  const { orders, currentOrder, loading, setOrders, setCurrentOrder, setLoading } =
    useOrderStore();

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setCurrentOrder(null);
      return;
    }

    setLoading(true);

    // Build the query based on role
    const ordersRef = collection(db, 'orders');

    const filterField =
      user.role === 'supplier' ? 'supplierId' : 'customerId';

    const ordersQuery = query(
      ordersRef,
      where(filterField, '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders: Order[] = snapshot.docs.map((docSnap) =>
          docToOrder(docSnap.id, docSnap.data())
        );

        setOrders(fetchedOrders);

        // If there's a current order, keep it synced with the latest data
        if (currentOrder) {
          const updated = fetchedOrders.find(
            (o) => o.id === currentOrder.id
          );
          if (updated) {
            setCurrentOrder(updated);
          }
        }

        // Auto-select the first active (non-terminal) order if none is selected
        if (!currentOrder) {
          const active = fetchedOrders.find(
            (o) =>
              o.status !== 'delivered' &&
              o.status !== 'cancelled'
          );
          if (active) {
            setCurrentOrder(active);
          }
        }

        setLoading(false);
      },
      (err) => {
        console.error('[useOrders] Firestore subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id, user?.role, currentOrder?.id, setOrders, setLoading, setCurrentOrder]);

  return { orders, currentOrder, loading };
}
