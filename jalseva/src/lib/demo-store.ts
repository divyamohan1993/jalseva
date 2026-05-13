// =============================================================================
// JalSeva - In-Memory Demo Store
// =============================================================================
// Single-instance, pre-seeded data store for the live demo. Lives on the
// Cloud Run container; when the container scales to zero, data is dropped
// and the next cold-start re-seeds. No Firestore involvement, no SMS, no
// billing exposure — the entire showcase is a few minutes of in-memory
// traffic on one VM.
//
// Module-level state is preserved across hot reloads via globalThis so the
// store survives Next.js HMR in development.
// =============================================================================

import type { Supplier, User, Order, GeoLocation } from '@/types';

const DEMO_HUB: GeoLocation = {
  lat: 28.6139,
  lng: 77.209,
  address: 'Connaught Place, New Delhi',
};

const DEMO_CUSTOMER_ID = 'sim_9999900001';
const DEMO_SUPPLIER_ID = 'sim_9999900002';
const DEMO_ADMIN_ID = 'sim_9999900003';

interface StoreState {
  users: Map<string, User>;
  suppliers: Map<string, Supplier>;
  orders: Map<string, Order>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jalsevaDemoStore: StoreState | undefined;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

function simDocs(now: number) {
  const uploadedAt = new Date(now - 86_400_000 * 30);
  return {
    aadhaar: {
      url: 'sim://aadhaar/XXXX-XXXX-1234',
      verified: true,
      uploadedAt,
    },
    vehicleRC: {
      url: 'sim://rc/DL-01-XX-1234',
      verified: true,
      uploadedAt,
    },
    license: {
      url: 'sim://license/DL-2026-XXXXX',
      verified: true,
      uploadedAt,
    },
    fssai: {
      url: 'sim://fssai/12345678901234',
      verified: true,
      uploadedAt,
    },
    waterQuality: {
      url: 'sim://waterqual/NABL-LAB-2026-001',
      verified: true,
      uploadedAt,
    },
  };
}

function seed(): StoreState {
  const now = Date.now();

  const users = new Map<string, User>();
  users.set(DEMO_CUSTOMER_ID, {
    id: DEMO_CUSTOMER_ID,
    phone: '+919999900001',
    name: 'Demo Customer',
    role: 'customer',
    language: 'en',
    rating: { average: 5, count: 0 },
    createdAt: new Date(now - 86_400_000 * 7),
    updatedAt: new Date(now),
  });
  users.set(DEMO_SUPPLIER_ID, {
    id: DEMO_SUPPLIER_ID,
    phone: '+919999900002',
    name: 'Demo Supplier',
    role: 'supplier',
    language: 'en',
    rating: { average: 4.8, count: 120 },
    createdAt: new Date(now - 86_400_000 * 30),
    updatedAt: new Date(now),
  });
  users.set(DEMO_ADMIN_ID, {
    id: DEMO_ADMIN_ID,
    phone: '+919999900003',
    name: 'Demo Admin',
    role: 'admin',
    language: 'en',
    rating: { average: 5, count: 0 },
    createdAt: new Date(now - 86_400_000 * 60),
    updatedAt: new Date(now),
  });

  const supplier: Supplier = {
    id: DEMO_SUPPLIER_ID,
    userId: DEMO_SUPPLIER_ID,
    documents: simDocs(now),
    verificationStatus: 'verified',
    vehicle: { type: 'tanker', capacity: 5000, number: 'DL-01-XX-1234' },
    isOnline: false,
    currentLocation: DEMO_HUB,
    serviceArea: { center: DEMO_HUB, radiusKm: 25 },
    waterTypes: ['ro', 'mineral', 'tanker'],
    rating: { average: 4.8, count: 120 },
    waterQualityReport: {
      ph: 7.2,
      tds: 145,
      testedAt: new Date(now - 86_400_000 * 7),
      labName: 'NABL-Accredited Lab (Simulated)',
      certificateUrl: 'sim://cert/water-quality-2026',
      fssaiCompliant: true,
    },
    qualityScore: 92,
    supportsSubscription: true,
  };

  const orders = new Map<string, Order>();

  // ─── 3 delivered orders today → ₹2 850 today's earnings ────────────────
  const deliveredEarnings = [
    { earning: 400, water: 'ro' as const, qty: 200, hoursAgo: 1 },
    { earning: 850, water: 'mineral' as const, qty: 500, hoursAgo: 3 },
    { earning: 1600, water: 'tanker' as const, qty: 5000, hoursAgo: 5 },
  ];
  for (let i = 0; i < deliveredEarnings.length; i++) {
    const d = deliveredEarnings[i];
    const supplierEarning = d.earning;
    const total = Math.round(supplierEarning / 0.85);
    const commission = total - supplierEarning;
    const id = `ord_seed_d${i}`;
    const created = new Date(now - d.hoursAgo * 3_600_000);
    orders.set(id, {
      id,
      customerId: `sim_customer_demo_${i}`,
      supplierId: DEMO_SUPPLIER_ID,
      waterType: d.water,
      quantityLitres: d.qty,
      price: {
        base: total - 80,
        distance: 80,
        surge: 0,
        total,
        commission,
        supplierEarning,
      },
      status: 'delivered',
      deliveryLocation: {
        lat: DEMO_HUB.lat + (Math.random() - 0.5) * 0.04,
        lng: DEMO_HUB.lng + (Math.random() - 0.5) * 0.04,
        address: `Customer ${i + 1}, New Delhi`,
      },
      payment: { method: 'upi', status: 'paid', amount: total },
      createdAt: created,
      acceptedAt: new Date(created.getTime() + 60_000),
      pickedAt: new Date(created.getTime() + 5 * 60_000),
      deliveredAt: new Date(created.getTime() + 15 * 60_000),
    });
  }

  // ─── 2 pending (searching) orders to show in the supplier queue ─────────
  const pendings = [
    { water: 'ro' as const, qty: 200, total: 350, minutesAgo: 1 },
    { water: 'tanker' as const, qty: 2000, total: 1450, minutesAgo: 3 },
  ];
  for (let i = 0; i < pendings.length; i++) {
    const p = pendings[i];
    const commission = Math.round(p.total * 0.15);
    const id = `ord_seed_p${i}`;
    orders.set(id, {
      id,
      customerId: `sim_customer_live_${i}`,
      waterType: p.water,
      quantityLitres: p.qty,
      price: {
        base: p.total - 80,
        distance: 80,
        surge: 0,
        total: p.total,
        commission,
        supplierEarning: p.total - commission,
      },
      status: 'searching',
      deliveryLocation: {
        lat: DEMO_HUB.lat + (Math.random() - 0.5) * 0.02,
        lng: DEMO_HUB.lng + (Math.random() - 0.5) * 0.02,
        address: `Customer ${i + 1}, near Connaught Place`,
      },
      payment: {
        method: 'cash',
        status: 'pending',
        amount: p.total,
      },
      createdAt: new Date(now - p.minutesAgo * 60_000),
    });
  }

  return { users, suppliers: new Map([[DEMO_SUPPLIER_ID, supplier]]), orders };
}

const state: StoreState =
  globalThis.__jalsevaDemoStore ||
  (globalThis.__jalsevaDemoStore = seed());

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getUser(id: string): User | null {
  return state.users.get(id) ?? null;
}

export function upsertUser(u: User): void {
  state.users.set(u.id, u);
}

export function getSupplier(id: string): Supplier | null {
  return state.suppliers.get(id) ?? null;
}

export function upsertSupplier(s: Supplier): void {
  state.suppliers.set(s.id, s);
}

export function setSupplierOnline(id: string, online: boolean): boolean {
  const s = state.suppliers.get(id);
  if (!s) return false;
  state.suppliers.set(id, { ...s, isOnline: online });
  return true;
}

export function setSupplierLocation(id: string, location: GeoLocation): void {
  const s = state.suppliers.get(id);
  if (!s) return;
  state.suppliers.set(id, { ...s, currentLocation: location });
}

export function listPendingOrders(): Order[] {
  return Array.from(state.orders.values())
    .filter((o) => o.status === 'searching')
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function listActiveOrdersForSupplier(supplierId: string): Order[] {
  return Array.from(state.orders.values()).filter(
    (o) =>
      o.supplierId === supplierId &&
      (o.status === 'accepted' ||
        o.status === 'en_route' ||
        o.status === 'arriving'),
  );
}

export function listOrdersByCustomer(customerId: string): Order[] {
  return Array.from(state.orders.values())
    .filter((o) => o.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function listOrdersBySupplier(supplierId: string): Order[] {
  return Array.from(state.orders.values())
    .filter((o) => o.supplierId === supplierId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function listAllOrders(): Order[] {
  return Array.from(state.orders.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function listAllSuppliers(): Supplier[] {
  return Array.from(state.suppliers.values());
}

export function listAllUsers(): User[] {
  return Array.from(state.users.values());
}

export function getOrder(id: string): Order | null {
  return state.orders.get(id) ?? null;
}

export function upsertOrder(o: Order): void {
  state.orders.set(o.id, o);
}

export function updateOrder(id: string, patch: Partial<Order>): Order | null {
  const existing = state.orders.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  state.orders.set(id, updated);
  return updated;
}

export function deleteOrder(id: string): void {
  state.orders.delete(id);
}

export function getTodayEarningsForSupplier(supplierId: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  let total = 0;
  for (const o of state.orders.values()) {
    if (o.supplierId !== supplierId) continue;
    if (o.status !== 'delivered') continue;
    if (!o.deliveredAt) continue;
    const t = new Date(o.deliveredAt).getTime();
    if (t >= startMs) total += o.price.supplierEarning ?? 0;
  }
  return total;
}

export function acceptOrderInStore(
  orderId: string,
  supplierId: string,
): Order | null {
  const order = state.orders.get(orderId);
  if (!order || order.status !== 'searching') return null;
  const supplier = state.suppliers.get(supplierId);
  const supplierLoc = supplier?.currentLocation ?? DEMO_HUB;
  const updated: Order = {
    ...order,
    supplierId,
    status: 'accepted',
    acceptedAt: new Date(),
    supplierLocation: supplierLoc,
    tracking: {
      supplierLocation: supplierLoc,
      eta: 600,
      distance: 1500,
    },
  };
  state.orders.set(orderId, updated);
  return updated;
}

export function rejectOrderInStore(orderId: string): Order | null {
  const order = state.orders.get(orderId);
  if (!order) return null;
  state.orders.delete(orderId);
  return order;
}

// ---------------------------------------------------------------------------
// Constants exported for callers
// ---------------------------------------------------------------------------

export const DEMO_IDS = {
  customer: DEMO_CUSTOMER_ID,
  supplier: DEMO_SUPPLIER_ID,
  admin: DEMO_ADMIN_ID,
  hub: DEMO_HUB,
} as const;
