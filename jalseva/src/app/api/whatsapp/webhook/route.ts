// =============================================================================
// JalSeva API - WhatsApp Webhook
// =============================================================================
// GET  /api/whatsapp/webhook  - Webhook verification (Meta challenge)
// POST /api/whatsapp/webhook  - Handle incoming WhatsApp messages
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateChatResponse } from '@/lib/gemini';
import { firestoreBreaker, geminiBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'jalseva_webhook_verify';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// ---------------------------------------------------------------------------
// Send WhatsApp message via Cloud API
// ---------------------------------------------------------------------------

async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[WhatsApp] Failed to send message:', errorBody);
    throw new Error(`WhatsApp send failed: ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Send WhatsApp interactive buttons
// ---------------------------------------------------------------------------

async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20),
          },
        })),
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[WhatsApp] Failed to send buttons:', errorBody);
  }
}

// ---------------------------------------------------------------------------
// GET - Webhook verification
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('[WhatsApp] Webhook verified successfully.');
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Webhook verification failed.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('[GET /api/whatsapp/webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error during webhook verification.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST - Handle incoming WhatsApp messages
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends different event types; we care about messages
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // If no messages, just acknowledge (could be a status update)
    if (!value?.messages || value.messages.length === 0) {
      return NextResponse.json({ success: true, message: 'No messages to process.' });
    }

    const messageData = value.messages[0];
    const senderPhone = messageData.from; // Phone number in international format
    const contactName = value.contacts?.[0]?.profile?.name || '';
    const messageId = messageData.id;

    // --- Find or create user ---
    const formattedPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;
    const usersSnapshot = await firestoreBreaker.execute(
      () => adminDb
        .collection('users')
        .where('phone', '==', formattedPhone)
        .limit(1)
        .get(),
      () => ({ empty: true, docs: [] } as unknown as FirebaseFirestore.QuerySnapshot)
    );

    let userId: string;
    let userLanguage = 'hi';

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      userId = userDoc.id;
      userLanguage = userDoc.data().language || 'hi';
    } else {
      // Create new user from WhatsApp
      const newUserRef = adminDb.collection('users').doc();
      userId = newUserRef.id;
      batchWriter.set('users', userId, {
        id: userId,
        phone: formattedPhone,
        name: contactName,
        role: 'customer',
        language: 'hi',
        source: 'whatsapp',
        rating: { average: 0, count: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // --- Process different message types ---
    let userMessage = '';
    const messageType = messageData.type;

    switch (messageType) {
      case 'text':
        userMessage = messageData.text?.body || '';
        break;

      case 'location': {
        // User shared location
        const lat = messageData.location?.latitude;
        const lng = messageData.location?.longitude;
        const address = messageData.location?.address || messageData.location?.name || '';

        if (lat && lng) {
          // Update user location
          batchWriter.update('users', userId, {
            location: { lat, lng, address },
            updatedAt: new Date().toISOString(),
          });

          userMessage = `I'm sharing my location: ${address || `${lat}, ${lng}`}. I want to order water here.`;
        }
        break;
      }

      case 'interactive':
        // Button response
        if (messageData.interactive?.type === 'button_reply') {
          userMessage = messageData.interactive.button_reply?.title || '';
          const buttonId = messageData.interactive.button_reply?.id || '';

          // Handle specific button actions
          if (buttonId.startsWith('order_')) {
            const waterType = buttonId.replace('order_', '');
            userMessage = `I want to order ${waterType} water`;
          } else if (buttonId === 'check_status') {
            userMessage = 'Check my order status';
          } else if (buttonId === 'help') {
            userMessage = 'I need help';
          }
        } else if (messageData.interactive?.type === 'list_reply') {
          userMessage = messageData.interactive.list_reply?.title || '';
        }
        break;

      default:
        userMessage = 'Hello';
        break;
    }

    // --- Build context for AI ---
    const context: Record<string, unknown> = {
      language: userLanguage,
      channel: 'whatsapp',
      userName: contactName,
      userPhone: formattedPhone,
    };

    // Fetch recent orders
    const recentOrders = await firestoreBreaker.execute(
      () => adminDb
        .collection('orders')
        .where('customerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get(),
      () => ({ empty: true, docs: [] } as unknown as FirebaseFirestore.QuerySnapshot)
    );

    if (!recentOrders.empty) {
      context.recentOrders = recentOrders.docs.map((doc) => {
        const order = doc.data();
        return {
          id: doc.id,
          status: order.status,
          waterType: order.waterType,
          quantity: order.quantityLitres,
          price: order.price?.total,
        };
      });
    }

    // --- Get session for conversation continuity ---
    const sessionId = `wa_${senderPhone}`;
    const sessionRef = adminDb.collection('chat_sessions').doc(sessionId);
    const sessionDoc = await firestoreBreaker.execute(
      () => sessionRef.get(),
      () => null
    );

    if (sessionDoc && sessionDoc.exists) {
      context.conversationHistory = sessionDoc.data()?.messages?.slice(-5) || [];
    }

    // --- Generate AI response ---
    const aiResponse = await geminiBreaker.execute(
      () => generateChatResponse(userMessage, context),
      () => 'Sorry, I am temporarily unable to respond. Please try again shortly.'
    );

    // --- Save to session ---
    const messageEntry = {
      role: 'user',
      content: userMessage,
      type: messageType,
      timestamp: new Date().toISOString(),
    };

    const responseEntry = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };

    if (sessionDoc && sessionDoc.exists) {
      const existing = sessionDoc.data()!;
      const messages = [...(existing.messages || []), messageEntry, responseEntry].slice(-50);
      batchWriter.update('chat_sessions', sessionId, { messages, updatedAt: new Date().toISOString() });
    } else {
      batchWriter.set('chat_sessions', sessionId, {
        userId,
        phone: formattedPhone,
        channel: 'whatsapp',
        language: userLanguage,
        messages: [messageEntry, responseEntry],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // --- Send response back via WhatsApp ---
    await sendWhatsAppMessage(senderPhone, aiResponse);

    // --- If this seems like a new user or greeting, send quick action buttons ---
    const greetingWords = ['hi', 'hello', 'hey', 'namaste', 'namaskar', 'start'];
    if (greetingWords.some((w) => userMessage.toLowerCase().includes(w))) {
      await sendWhatsAppButtons(senderPhone, 'How can I help you today?', [
        { id: 'order_tanker', title: 'Order Water' },
        { id: 'check_status', title: 'Order Status' },
        { id: 'help', title: 'Help' },
      ]);
    }

    // --- Log the webhook event ---
    const logDocId = `walog_${messageId}_${Date.now()}`;
    batchWriter.set('whatsapp_logs', logDocId, {
      messageId,
      senderPhone,
      userId,
      messageType,
      userMessage,
      aiResponse,
      createdAt: new Date().toISOString(),
    });

    // Must return 200 quickly to WhatsApp
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/whatsapp/webhook] Error:', error);
    // Always return 200 to WhatsApp to prevent retries
    return NextResponse.json({ success: false, error: 'Processing error' }, { status: 200 });
  }
}
