// =============================================================================
// JalSeva API - AI Voice Command Processing
// =============================================================================
// POST /api/ai/voice
// Processes voice command text using Gemini AI and extracts structured
// order intent. Supports Hindi, English, and regional Indian languages.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processVoiceCommand } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/redis';

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

    // --- Supported languages ---
    const supportedLanguages = [
      'hi', 'en', 'ta', 'te', 'kn', 'mr', 'bn', 'gu', 'pa', 'ml',
      'or', 'as', 'ur',
    ];
    const normalizedLanguage = supportedLanguages.includes(language) ? language : 'hi';

    // --- Process with Gemini ---
    const intent = await processVoiceCommand(text.trim(), normalizedLanguage);

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
    // Return a safe fallback instead of 500
    return NextResponse.json({
      success: true,
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
