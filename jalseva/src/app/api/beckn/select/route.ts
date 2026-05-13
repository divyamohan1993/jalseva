// =============================================================================
// JalSeva API - Beckn/ONDC Select Endpoint (Simulated)
// =============================================================================
// POST /api/beckn/select
// Returns a simulated Beckn on_select response with a firm quote for the
// chosen provider's item. Works without Firebase admin credentials.
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
  quantity?: { selected?: { count?: string } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.context || !body?.message) {
      return NextResponse.json(
        { error: 'Invalid Beckn select request. Missing context or message.' },
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

    const totalValue = items.reduce((sum, item) => {
      const v = parseFloat(item.price?.value || '0');
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    const breakup = items.map((item) => ({
      title: item.descriptor?.name || 'Water',
      price: {
        currency: item.price?.currency || 'INR',
        value: item.price?.value || '0',
      },
    }));

    return NextResponse.json({
      context: buildBecknContext('on_select', transaction_id, message_id),
      message: {
        order: {
          provider,
          items,
          quote: {
            price: { currency: 'INR', value: totalValue.toFixed(2) },
            breakup,
            ttl: 'PT15M',
          },
          fulfillments: [
            {
              id: `ful-${provider.id || 'sim'}`,
              type: 'Delivery',
              state: { descriptor: { code: 'Serviceable' } },
              tracking: true,
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error('[POST /api/beckn/select] Error:', error);
    return NextResponse.json(
      {
        context: { action: 'on_select', timestamp: new Date().toISOString() },
        error: {
          type: 'DOMAIN-ERROR',
          code: '50003',
          message: 'Internal error while processing select request.',
        },
      },
      { status: 500 },
    );
  }
}
