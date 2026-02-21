// =============================================================================
// JalSeva API - Beckn/ONDC Search Endpoint (Simulated)
// =============================================================================
// POST /api/beckn/search
// Simulates the ONDC Beckn protocol search without requiring real ONDC
// registry credentials. Returns matching suppliers from Firestore, or
// simulated demo suppliers if none exist in the database.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { haversineDistance } from '@/lib/maps';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';
import type { GeoLocation, WaterType } from '@/types';

// ---------------------------------------------------------------------------
// Simulated Beckn Context Builder
// ---------------------------------------------------------------------------

function buildBecknContext(
  action: string,
  transactionId: string,
  messageId: string
) {
  return {
    domain: 'nic2004:65111', // Water supply services
    country: 'IND',
    city: 'std:011',
    action,
    core_version: '1.1.0',
    bap_id: 'jalseva-sim.in',
    bap_uri: 'https://jalseva-sim.in/api/beckn',
    bpp_id: 'jalseva-bpp-sim.in',
    bpp_uri: 'https://jalseva-sim.in/api/beckn',
    transaction_id: transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Demo Suppliers (used when Firestore has no real suppliers)
// ---------------------------------------------------------------------------

const DEMO_SUPPLIERS = [
  {
    id: 'sim_supplier_001',
    data: {
      userId: 'sim_user_001',
      vehicle: { type: 'tanker', capacity: 5000 },
      waterTypes: ['ro', 'mineral', 'tanker'],
      currentLocation: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place, Delhi' },
      rating: { average: 4.5, count: 120 },
      isOnline: true,
      verificationStatus: 'verified',
    },
    distance: 2000,
  },
  {
    id: 'sim_supplier_002',
    data: {
      userId: 'sim_user_002',
      vehicle: { type: 'mini-tanker', capacity: 2000 },
      waterTypes: ['ro', 'mineral'],
      currentLocation: { lat: 28.6280, lng: 77.2197, address: 'Karol Bagh, Delhi' },
      rating: { average: 4.2, count: 85 },
      isOnline: true,
      verificationStatus: 'verified',
    },
    distance: 3500,
  },
  {
    id: 'sim_supplier_003',
    data: {
      userId: 'sim_user_003',
      vehicle: { type: 'tanker', capacity: 10000 },
      waterTypes: ['tanker'],
      currentLocation: { lat: 28.5355, lng: 77.3910, address: 'Noida Sector 62' },
      rating: { average: 4.8, count: 200 },
      isOnline: true,
      verificationStatus: 'verified',
    },
    distance: 5000,
  },
];

// ---------------------------------------------------------------------------
// POST - Beckn Search (Simulated)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate Beckn search request structure
    if (!body.context || !body.message) {
      return NextResponse.json(
        { error: 'Invalid Beckn search request. Missing context or message.' },
        { status: 400 }
      );
    }

    const { context, message } = body;
    const { transaction_id, message_id } = context;

    if (!transaction_id || !message_id) {
      return NextResponse.json(
        { error: 'Missing transaction_id or message_id in context.' },
        { status: 400 }
      );
    }

    // --- Extract search parameters from Beckn intent ---
    const intent = message.intent || {};
    const fulfillment = intent.fulfillment || {};
    const gps = fulfillment.end?.location?.gps;
    const itemDescriptor = intent.item?.descriptor?.name?.toLowerCase() || '';

    // Determine water type from Beckn item descriptor
    let waterType: WaterType = 'tanker';
    if (itemDescriptor.includes('ro') || itemDescriptor.includes('purified')) {
      waterType = 'ro';
    } else if (itemDescriptor.includes('mineral')) {
      waterType = 'mineral';
    }

    // Parse GPS coordinates
    let userLocation: GeoLocation | null = null;
    if (gps) {
      const parts = gps.split(',').map(Number);
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        userLocation = { lat: parts[0], lng: parts[1] };
      }
    }

    // --- Try to query real suppliers from Firestore ---
    let matchingSuppliers: Array<{
      id: string;
      data: FirebaseFirestore.DocumentData;
      distance: number;
    }> = [];

    try {
      const query = adminDb
        .collection('suppliers')
        .where('isOnline', '==', true)
        .where('verificationStatus', '==', 'verified')
        .where('waterTypes', 'array-contains', waterType) as FirebaseFirestore.Query;

      const snapshot = await firestoreBreaker.execute(
        () => query.get(),
        () => ({ docs: [], forEach: () => {} } as unknown as FirebaseFirestore.QuerySnapshot)
      );

      snapshot.forEach((doc) => {
        const supplier = doc.data();
        let distance = 0;

        if (userLocation && supplier.currentLocation) {
          distance = haversineDistance(
            userLocation,
            supplier.currentLocation as GeoLocation
          );
          const distanceKm = distance / 1000;

          if (distanceKm <= 15) {
            matchingSuppliers.push({ id: doc.id, data: supplier, distance });
          }
        } else {
          matchingSuppliers.push({ id: doc.id, data: supplier, distance: 0 });
        }
      });
    } catch (dbError) {
      console.warn('[Beckn Sim] Firestore query failed, using demo suppliers:', dbError);
    }

    // Fall back to demo suppliers if none found
    if (matchingSuppliers.length === 0) {
      matchingSuppliers = DEMO_SUPPLIERS.filter((s) =>
        s.data.waterTypes.includes(waterType)
      );
      console.log(`[Beckn Sim] Using ${matchingSuppliers.length} demo suppliers for "${waterType}"`);
    }

    // Sort by distance
    matchingSuppliers.sort((a, b) => a.distance - b.distance);

    // --- Build Beckn on_search response ---
    const catalog = {
      'bpp/descriptor': {
        name: 'JalSeva',
        short_desc: 'Water tanker delivery service (Simulated ONDC)',
        long_desc: 'On-demand water tanker delivery in India',
        images: ['https://jalseva.in/logo.png'],
      },
      'bpp/providers': matchingSuppliers.slice(0, 10).map((s) => {
        const supplier = s.data;

        return {
          id: s.id,
          descriptor: {
            name: `Supplier ${s.id.slice(0, 6)}`,
            short_desc: `${supplier.vehicle?.type} - ${supplier.vehicle?.capacity}L capacity`,
          },
          locations: [
            {
              id: `loc-${s.id}`,
              gps: supplier.currentLocation
                ? `${supplier.currentLocation.lat},${supplier.currentLocation.lng}`
                : '',
              address: {
                door: '',
                street: supplier.currentLocation?.address || '',
                city: '',
                state: '',
                country: 'IND',
                area_code: '',
              },
            },
          ],
          items: supplier.waterTypes.map((wt: WaterType) => ({
            id: `${s.id}_${wt}`,
            descriptor: {
              name: wt === 'ro' ? 'RO Purified Water' : wt === 'mineral' ? 'Mineral Water' : 'Tanker Water',
              code: wt,
            },
            price: {
              currency: 'INR',
              value: wt === 'ro' ? '150' : wt === 'mineral' ? '200' : '500',
              estimated_value: wt === 'ro' ? '150' : wt === 'mineral' ? '200' : '500',
            },
            quantity: {
              available: {
                count: '1',
              },
            },
            fulfillment_id: `ful-${s.id}`,
          })),
          fulfillments: [
            {
              id: `ful-${s.id}`,
              type: 'Delivery',
              tracking: true,
              state: {
                descriptor: {
                  code: 'Serviceable',
                },
              },
            },
          ],
          rating: supplier.rating?.average?.toString() || '0',
        };
      }),
    };

    // --- Log the Beckn transaction ---
    const becknLogId = `beckn_search_${transaction_id}_${Date.now()}`;
    batchWriter.set('beckn_transactions', becknLogId, {
      transactionId: transaction_id,
      messageId: message_id,
      action: 'search',
      request: body as Record<string, unknown>,
      suppliersFound: matchingSuppliers.length,
      simulated: true,
      createdAt: new Date().toISOString(),
    });

    // --- Return on_search response ---
    const response = {
      context: buildBecknContext('on_search', transaction_id, message_id),
      message: {
        catalog,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/beckn/search] Error:', error);
    return NextResponse.json(
      {
        context: {
          action: 'on_search',
          timestamp: new Date().toISOString(),
        },
        error: {
          type: 'DOMAIN-ERROR',
          code: '50001',
          message: 'Internal error while processing search request.',
        },
      },
      { status: 500 }
    );
  }
}
