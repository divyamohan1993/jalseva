// =============================================================================
// JalSeva API - Conversational Voice Ordering
// =============================================================================
// POST /api/ai/conversational-order
// Multi-turn conversational ordering endpoint. Handles:
//   - Mixed-language input (Hindi + English + Tamil + Telugu in one sentence)
//   - Error correction (garbled speech, wrong pronunciations)
//   - Natural conversation flow (asks clarifying questions)
//   - Extracts structured order data from natural language
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { checkRateLimit } from '@/lib/redis';
import { isSupported as isLangSupported } from '@/lib/languages';

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

const MODEL = 'gemini-3-flash-preview';

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      language = 'hi',
      conversationHistory = [],
      currentOrder = {},
      userId,
    } = body as {
      message: string;
      language?: string;
      conversationHistory?: { role: string; content: string }[];
      currentOrder?: {
        waterType?: string;
        quantity?: number;
        confirmed?: boolean;
      };
      userId?: string;
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
    if (userId) {
      const rateLimit = await checkRateLimit(`convo:${userId}`, 60, 60);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.', remaining: rateLimit.remaining },
          { status: 429 }
        );
      }
    }

    const normalizedLanguage = isLangSupported(language) ? language : 'hi';

    // --- Build conversation context ---
    const historyText = conversationHistory
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'Customer' : 'JalSeva'}: ${m.content}`)
      .join('\n');

    const currentOrderText = currentOrder.waterType || currentOrder.quantity
      ? `Current order so far: ${currentOrder.waterType ? `Type: ${currentOrder.waterType}` : 'Type: not selected'}, ${currentOrder.quantity ? `Quantity: ${currentOrder.quantity}L` : 'Quantity: not selected'}`
      : 'No order details selected yet.';

    // --- Construct the prompt ---
    const prompt = `You are JalSeva's voice ordering assistant for a water tanker delivery app in India.

CRITICAL CAPABILITIES:
1. MIXED-LANGUAGE: Users will mix Hindi, English, Tamil, Telugu, and other Indian languages in a SINGLE sentence. Example: "Mujhe 20 litre ka RO paani chahiye bhai" or "oru tanker thanni anuppu" or "naku 500 litres water kavali". Understand ALL of these.

2. ERROR CORRECTION: Users have garbled speech, wrong pronunciations, or speak unclearly.
   - "aarow" / "aaro" / "aa-ro" / "arro" = RO water
   - "minral" / "mineral" / "minirl" = mineral water
   - "tenker" / "tankar" / "thanker" = tanker water
   - "leter" / "litr" / "litar" = litres
   - "pani" / "paani" / "panni" / "thanni" / "neeru" / "jal" / "neer" / "vellam" = water
   - "bees" / "20" / "twenty" = 20
   - "pachaas" / "50" / "fifty" = 50
   - "do sau" / "200" = 200
   - "paanch sau" / "500" = 500
   - "hazaar" / "1000" = 1000
   - Number words in any Indian language should be correctly parsed

3. NATURAL CONVERSATION: Guide the user step by step. If they say "pani chahiye" (I want water), ask what TYPE. If they say "RO water", ask QUANTITY. Be friendly, use simple words.

4. CONFIRMATION: Before confirming, clearly summarize the order and ask "Shall I place this order?"

WATER TYPES AVAILABLE:
- ro: RO/purified drinking water (for small quantities, drinking)
- mineral: Mineral/branded water (Bisleri, Kinley, etc.)
- tanker: Bulk water tanker (for large quantities, overhead tanks)

QUANTITY OPTIONS: 20L, 50L, 200L, 500L, 1000L, 2000L, 5000L, 10000L
- Small quantities (20L, 50L) are usually RO or mineral
- Large quantities (1000L+) are usually tanker

CURRENT STATE:
${currentOrderText}

CONVERSATION HISTORY:
${historyText || 'No previous messages.'}

RESPOND IN: ${normalizedLanguage === 'en' ? 'English' : 'The same language the customer is speaking (detect from their message). If they mix languages, respond in Hindi with some English words mixed in.'}

Your response MUST be a valid JSON object (no markdown fences):
{
  "response": "<your friendly conversational response to the customer>",
  "extractedOrder": {
    "waterType": null or "ro" or "mineral" or "tanker",
    "quantity": null or <number>,
    "confirmed": false or true
  },
  "detectedLanguage": "<detected language code>"
}

RULES:
- Only set "confirmed": true when the customer explicitly agrees to place the order after you summarize it.
- If the user says something unrelated to water ordering, politely guide them back.
- Keep responses SHORT (2-3 sentences max). This is voice - long responses are annoying.
- Use simple language. Many users have limited literacy.
- Be warm and helpful. Use the customer's name if available.
- If the user says "haan" / "yes" / "ok" / "theek hai" / "confirm" / "book karo" / "order karo" after you summarize, set confirmed to true.
- Preserve previously extracted values (don't reset waterType to null if already set unless the user changes it).

Customer says: "${message.trim()}"`;

    // --- Call Gemini ---
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { safetySettings },
    });

    const rawText = (response.text ?? '').trim();
    const jsonString = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(jsonString);

      // Validate and sanitize
      const validWaterTypes = ['ro', 'mineral', 'tanker'];
      const extractedOrder: {
        waterType?: string;
        quantity?: number;
        confirmed: boolean;
      } = {
        confirmed: false,
      };

      // Preserve existing values from currentOrder
      if (currentOrder.waterType) {
        extractedOrder.waterType = currentOrder.waterType;
      }
      if (currentOrder.quantity) {
        extractedOrder.quantity = currentOrder.quantity;
      }

      // Override with new extracted values
      if (parsed.extractedOrder) {
        if (
          parsed.extractedOrder.waterType &&
          validWaterTypes.includes(parsed.extractedOrder.waterType)
        ) {
          extractedOrder.waterType = parsed.extractedOrder.waterType;
        }
        if (
          typeof parsed.extractedOrder.quantity === 'number' &&
          parsed.extractedOrder.quantity > 0
        ) {
          extractedOrder.quantity = parsed.extractedOrder.quantity;
        }
        if (parsed.extractedOrder.confirmed === true) {
          extractedOrder.confirmed = true;
        }
      }

      return NextResponse.json({
        success: true,
        response: parsed.response || 'I did not understand. Please try again.',
        extractedOrder,
        detectedLanguage: parsed.detectedLanguage || normalizedLanguage,
      });
    } catch {
      // JSON parse failed - return raw text as response
      console.error('[conversational-order] Failed to parse Gemini response:', rawText);
      return NextResponse.json({
        success: true,
        response: rawText || 'I did not understand. Please try again.',
        extractedOrder: currentOrder,
        detectedLanguage: normalizedLanguage,
      });
    }
  } catch (error) {
    console.error('[POST /api/ai/conversational-order] Error:', error);
    return NextResponse.json(
      {
        success: false,
        response: 'Sorry, something went wrong. Please try again.',
        extractedOrder: {},
        detectedLanguage: 'en',
      },
      { status: 500 }
    );
  }
}
