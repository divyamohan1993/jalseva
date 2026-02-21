// =============================================================================
// JalSeva API - Beckn/ONDC Confirm Endpoint (Simulated)
// =============================================================================
// POST /api/beckn/confirm
// Simulates the ONDC Beckn protocol confirm flow without requiring real ONDC
// registry credentials. Creates JalSeva orders in Firestore and returns
// a Beckn on_confirm response.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { GeoLocation, WaterType, PaymentMethod, OrderPrice } from '@/types';

// ---------------------------------------------------------------------------
// Simulated Beckn Context Builder
// ---------------------------------------------------------------------------

function buildBecknContext(
  action: string,
  transactionId: string,
  messageId: string
) {
  return {
    domain: 'nic2004:65111',
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
// POST - Beckn Confirm (Simulated)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate Beckn confirm request structure
    if (!body.context || !body.message) {
      return NextResponse.json(
        { error: 'Invalid Beckn confirm request. Missing context or message.' },
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

    const orderRequest = message.order || {};

    // --- Extract order details from Beckn format ---
    const provider = orderRequest.provider || {};
    const items = orderRequest.items || [];
    const billing = orderRequest.billing || {};
    const fulfillment = orderRequest.fulfillment || {};

    // Extract delivery location
    const gps = fulfillment.end?.location?.gps || '';
    const gpsParts = gps.split(',').map(Number);

    const deliveryLocation: GeoLocation = {
      lat: gpsParts[0] || 0,
      lng: gpsParts[1] || 0,
      address: fulfillment.end?.location?.address?.door
        ? `${fulfillment.end.location.address.door}, ${fulfillment.end.location.address.street}`
        : fulfillment.end?.location?.address?.street || '',
    };

    // Extract water type and quantity from items
    let waterType: WaterType = 'tanker';
    let quantityLitres = 500;

    if (items.length > 0) {
      const itemCode = items[0].descriptor?.code || items[0].id || '';
      if (itemCode.includes('ro')) waterType = 'ro';
      else if (itemCode.includes('mineral')) waterType = 'mineral';

      const qty = parseInt(items[0].quantity?.count || '1', 10);
      quantityLitres = qty > 0 ? qty * 500 : 500;
    }

    // Extract supplier ID
    const supplierId = provider.id || null;

    // --- Calculate price ---
    const basePrice = waterType === 'ro' ? 150 : waterType === 'mineral' ? 200 : 500;
    const price: OrderPrice = {
      base: basePrice,
      distance: 0,
      surge: 0,
      total: basePrice,
      commission: Math.round(basePrice * 0.15),
      supplierEarning: Math.round(basePrice * 0.85),
    };

    // If items have a quoted price, use it
    if (orderRequest.quote?.price?.value) {
      const quotedPrice = parseFloat(orderRequest.quote.price.value);
      if (!Number.isNaN(quotedPrice) && quotedPrice > 0) {
        price.total = Math.round(quotedPrice);
        price.commission = Math.round(quotedPrice * 0.15);
        price.supplierEarning = Math.round(quotedPrice * 0.85);
      }
    }

    // --- Create or find customer ---
    const customerPhone = billing.phone || '';
    const customerName = billing.name || '';

    let customerId = '';

    try {
      if (customerPhone) {
        const existingUser = await adminDb
          .collection('users')
          .where('phone', '==', customerPhone)
          .limit(1)
          .get();

        if (!existingUser.empty) {
          customerId = existingUser.docs[0].id;
        } else {
          const newUserRef = adminDb.collection('users').doc();
          customerId = newUserRef.id;
          await newUserRef.set({
            id: customerId,
            phone: customerPhone,
            name: customerName,
            role: 'customer',
            language: 'hi',
            rating: { average: 0, count: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        const anonRef = adminDb.collection('users').doc();
        customerId = anonRef.id;
        await anonRef.set({
          id: customerId,
          phone: '',
          name: customerName || 'Beckn Customer',
          role: 'customer',
          language: 'hi',
          rating: { average: 0, count: 0 },
          source: 'beckn',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (userError) {
      console.warn('[Beckn Sim] Firestore user operation failed, using placeholder:', userError);
      customerId = `sim_customer_${Date.now()}`;
    }

    // --- Create JalSeva order ---
    const now = new Date().toISOString();
    let orderId: string;

    try {
      const orderRef = adminDb.collection('orders').doc();
      orderId = orderRef.id;

      const jalsevaOrder = {
        id: orderId,
        customerId,
        supplierId: supplierId || null,
        waterType,
        quantityLitres,
        price,
        status: supplierId ? 'accepted' : 'searching',
        deliveryLocation,
        payment: {
          method: 'upi' as PaymentMethod,
          status: 'pending' as const,
          amount: price.total,
        },
        beckn: {
          transactionId: transaction_id,
          messageId: message_id,
          bapId: context.bap_id || 'jalseva-sim.in',
          bppId: context.bpp_id || 'jalseva-bpp-sim.in',
        },
        simulated: true,
        createdAt: now,
        acceptedAt: supplierId ? now : null,
      };

      await orderRef.set(jalsevaOrder);
    } catch (orderError) {
      console.warn('[Beckn Sim] Firestore order creation failed, using sim ID:', orderError);
      orderId = `sim_order_${Date.now()}`;
    }

    // --- Log Beckn transaction ---
    try {
      await adminDb.collection('beckn_transactions').add({
        transactionId: transaction_id,
        messageId: message_id,
        action: 'confirm',
        orderId,
        request: body,
        simulated: true,
        createdAt: now,
      });
    } catch (logError) {
      console.warn('[Beckn Sim] Failed to log transaction:', logError);
    }

    // --- Build Beckn on_confirm response ---
    const response = {
      context: buildBecknContext('on_confirm', transaction_id, message_id),
      message: {
        order: {
          id: orderId,
          state: supplierId ? 'Accepted' : 'Created',
          provider: {
            id: supplierId || '',
            descriptor: {
              name: 'JalSeva Supplier',
            },
          },
          items: items.map((item: Record<string, unknown>) => ({
            ...item,
            fulfillment_id: `ful-${orderId}`,
          })),
          billing: {
            name: customerName,
            phone: customerPhone,
          },
          fulfillment: {
            id: `ful-${orderId}`,
            type: 'Delivery',
            state: {
              descriptor: {
                code: supplierId ? 'Accepted' : 'Searching',
              },
            },
            end: {
              location: {
                gps: `${deliveryLocation.lat},${deliveryLocation.lng}`,
                address: {
                  street: deliveryLocation.address || '',
                  country: 'IND',
                },
              },
            },
            tracking: true,
          },
          quote: {
            price: {
              currency: 'INR',
              value: price.total.toString(),
            },
            breakup: [
              {
                title: 'Base Price',
                price: { currency: 'INR', value: price.base.toString() },
              },
              {
                title: 'Distance Charge',
                price: { currency: 'INR', value: price.distance.toString() },
              },
              {
                title: 'Surge',
                price: { currency: 'INR', value: price.surge.toString() },
              },
            ],
          },
          payment: {
            type: 'POST-FULFILLMENT',
            status: 'NOT-PAID',
          },
          created_at: now,
          updated_at: now,
        },
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[POST /api/beckn/confirm] Error:', error);
    return NextResponse.json(
      {
        context: {
          action: 'on_confirm',
          timestamp: new Date().toISOString(),
        },
        error: {
          type: 'DOMAIN-ERROR',
          code: '50002',
          message: 'Internal error while processing confirm request.',
        },
      },
      { status: 500 }
    );
  }
}
