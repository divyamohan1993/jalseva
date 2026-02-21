// =============================================================================
// JalSeva API - AI Voice Command Processing
// =============================================================================
// POST /api/ai/voice
// Processes voice command text using Gemini AI and extracts structured
// order intent. Supports Hindi, English, and regional Indian languages.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { processVoiceCommand } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/redis';
import { geminiBreaker } from '@/lib/circuit-breaker';
import { isSupported as isLangSupported } from '@/lib/languages';

// ---------------------------------------------------------------------------
// POST - Process voice command text
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let rawText = '';
  let rawLanguage = 'hi';

  try {
    const body = await request.json();
    const { text, language = 'hi', userId } = body as {
      text: string;
      language?: string;
      userId?: string;
    };

    rawText = text || '';
    rawLanguage = language;

    // --- Validation ---
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty voice command text.' },
        { status: 400 }
      );
    }

    if (text.trim().length > 1000) {
      return NextResponse.json(
        { error: 'Voice command text is too long. Maximum 1000 characters.' },
        { status: 400 }
      );
    }

    // --- Rate limiting ---
    if (userId) {
      const rateLimit = await checkRateLimit(`voice:${userId}`, 30, 60);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Too many voice requests. Please try again later.',
            remaining: rateLimit.remaining,
          },
          { status: 429 }
        );
      }
    }

    // --- Supported languages (uses central language list) ---
    const normalizedLanguage = isLangSupported(language) ? language : 'hi';

    // --- Process with Gemini ---
    const intent = await geminiBreaker.execute(
      () => processVoiceCommand(text.trim(), normalizedLanguage),
      () => ({ waterType: 'tanker' as const, quantity: 500, language: normalizedLanguage })
    );

    return NextResponse.json({
      success: true,
      intent: {
        waterType: intent.waterType,
        quantity: intent.quantity,
        language: intent.language,
        confidence: 0.85,
      },
      originalText: text.trim(),
      detectedLanguage: normalizedLanguage,
    });
  } catch (error) {
    console.error('[POST /api/ai/voice] Error:', error);
    // Return a fallback with success:false so the client knows AI failed
    return NextResponse.json({
      success: false,
      intent: {
        waterType: 'tanker',
        quantity: 500,
        language: rawLanguage,
        confidence: 0.3,
      },
      originalText: rawText.trim(),
      detectedLanguage: rawLanguage,
      fallback: true,
    });
  }
}
