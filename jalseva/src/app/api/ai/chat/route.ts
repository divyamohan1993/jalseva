// =============================================================================
// JalSeva API - AI Chat Endpoint
// =============================================================================
// POST /api/ai/chat
// Chat endpoint for WhatsApp bot and in-app chat. Processes user messages
// with context and returns appropriate responses in the user's language.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateChatResponse } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/redis';

// ---------------------------------------------------------------------------
// POST - Process chat message
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      userId,
      sessionId,
      language = 'hi',
      channel = 'app', // 'app' | 'whatsapp'
    } = body as {
      message: string;
      userId?: string;
      sessionId?: string;
      language?: string;
      channel?: string;
    };

    // --- Validation ---
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty message.' },
        { status: 400 }
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // --- Rate limiting ---
    const rateLimitKey = userId || sessionId || 'anonymous';
    const rateLimit = await checkRateLimit(`chat:${rateLimitKey}`, 20, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many chat requests. Please try again later.',
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    // --- Build context for AI ---
    const context: Record<string, unknown> = {
      language,
      channel,
      timestamp: new Date().toISOString(),
    };

    // Fetch user profile if userId is provided
    if (userId) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        context.user = {
          name: userData.name,
          phone: userData.phone,
          language: userData.language,
          role: userData.role,
        };
      }

      // Fetch recent orders for context
      const recentOrdersSnapshot = await adminDb
        .collection('orders')
        .where('customerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      if (!recentOrdersSnapshot.empty) {
        context.recentOrders = recentOrdersSnapshot.docs.map((doc) => {
          const order = doc.data();
          return {
            id: doc.id,
            status: order.status,
            waterType: order.waterType,
            quantity: order.quantityLitres,
            price: order.price?.total,
            createdAt: order.createdAt,
          };
        });
      }
    }

    // --- Fetch conversation history from session if available ---
    if (sessionId) {
      const sessionDoc = await adminDb
        .collection('chat_sessions')
        .doc(sessionId)
        .get();

      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data()!;
        context.conversationHistory = sessionData.messages?.slice(-5) || [];
      }
    }

    // --- Generate response with Gemini ---
    const aiResponse = await generateChatResponse(message.trim(), context);

    // --- Save message to session ---
    if (sessionId) {
      const sessionRef = adminDb.collection('chat_sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      const messageEntry = {
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString(),
      };

      const responseEntry = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      if (sessionDoc.exists) {
        const existing = sessionDoc.data()!;
        const messages = existing.messages || [];
        messages.push(messageEntry, responseEntry);

        // Keep last 50 messages
        const trimmedMessages = messages.slice(-50);

        await sessionRef.update({
          messages: trimmedMessages,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await sessionRef.set({
          userId: userId || null,
          channel,
          language,
          messages: [messageEntry, responseEntry],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId || null,
      language,
    });
  } catch (error) {
    console.error('[POST /api/ai/chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing chat message.' },
      { status: 500 }
    );
  }
}
