// =============================================================================
// JalSeva API - Beckn/ONDC Init Endpoint (Simulated)
// =============================================================================
// POST /api/beckn/init
// Returns a simulated Beckn on_init response that locks in billing,
// fulfillment, and payment terms. Works without Firebase admin credentials.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';

function buildBecknContext(
  action: string,
  transactionId: string,
  messageId: string,
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

interface BecknItem {
  id?: string;
  descriptor?: { name?: string; code?: string };
  price?: { value?: string; currency?: string };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.context || !body?.message) {
      return NextResponse.json(
        { error: 'Invalid Beckn init request. Missing context or message.' },
        { status: 400 },
      );
    }

    const { context, message } = body;
    const { transaction_id, message_id } = context;
    if (!transaction_id || !message_id) {
      return NextResponse.json(
        { error: 'Missing transaction_id or message_id in context.' },
        { status: 400 },
      );
    }

    const order = message.order || {};
    const provider = order.provider || {};
    const items: BecknItem[] = Array.isArray(order.items) ? order.items : [];
    const billing = order.billing || {};
    const fulfillment =
      order.fulfillment ||
      (Array.isArray(order.fulfillments) ? order.fulfillments[0] : {}) ||
      {};

    const totalValue = items.reduce((sum, item) => {
      const v = parseFloat(item.price?.value || '0');
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    return NextResponse.json({
      context: buildBecknContext('on_init', transaction_id, message_id),
      message: {
        order: {
          provider,
          items,
          billing,
          fulfillment: {
            ...fulfillment,
            state: { descriptor: { code: 'Pending' } },
            tracking: true,
          },
          quote: {
            price: { currency: 'INR', value: totalValue.toFixed(2) },
            ttl: 'PT15M',
          },
          payment: {
            uri: `https://jalseva-sim.in/pay/${transaction_id}`,
            tl_method: 'http/get',
            params: {
              transaction_id,
              amount: totalValue.toFixed(2),
              currency: 'INR',
            },
            type: 'POST-FULFILLMENT',
            status: 'NOT-PAID',
            collected_by: 'BPP',
          },
        },
      },
    });
  } catch (error) {
    console.error('[POST /api/beckn/init] Error:', error);
    return NextResponse.json(
      {
        context: { action: 'on_init', timestamp: new Date().toISOString() },
        error: {
          type: 'DOMAIN-ERROR',
          code: '50004',
          message: 'Internal error while processing init request.',
        },
      },
      { status: 500 },
    );
  }
}
