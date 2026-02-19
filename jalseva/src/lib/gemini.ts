// =============================================================================
// JalSeva - Google Generative AI (Gemini) Client
// =============================================================================
// Provides AI-powered features: voice command processing, demand prediction,
// text translation (replaces Bhashini API), and WhatsApp chatbot responses.
// Uses gemini-2.0-flash for all AI tasks including multilingual translation
// that would otherwise require Bhashini API credentials.
// =============================================================================

import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import type { VoiceCommandIntent, DemandPrediction } from '@/types';

// ---------------------------------------------------------------------------
// Client Initialization
// ---------------------------------------------------------------------------

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || '';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    if (!apiKey) {
      console.warn('GOOGLE_GEMINI_API_KEY not configured. AI features disabled.');
    }
    _genAI = new GoogleGenerativeAI(apiKey);
  }
  return _genAI;
}

const genAI = new Proxy({} as GoogleGenerativeAI, {
  get: (_target, prop) => {
    const instance = getGenAI();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

// Shared safety settings — block only high-probability harmful content.
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// ---------------------------------------------------------------------------
// getGeminiModel
// ---------------------------------------------------------------------------

/**
 * Returns a configured GenerativeModel instance for the gemini-2.0-flash model.
 * Callers can use this for custom / ad-hoc prompts beyond the helpers below.
 */
export function getGeminiModel(): GenerativeModel {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings,
  });
}

// ---------------------------------------------------------------------------
// processVoiceCommand
// ---------------------------------------------------------------------------

/**
 * Processes transcribed voice text and extracts a structured order intent.
 *
 * @param audioText  - The transcribed speech-to-text string.
 * @param language   - ISO 639-1 language code (e.g. "hi", "en", "ta").
 * @returns A structured VoiceCommandIntent with waterType, quantity, and language.
 */
export async function processVoiceCommand(
  audioText: string,
  language: string
): Promise<VoiceCommandIntent> {
  const model = getGeminiModel();

  const prompt = `You are a voice assistant for JalSeva, an Indian water tanker delivery service.

Analyze the following transcribed voice command and extract the user's intent.

Voice text (language: ${language}): "${audioText}"

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "waterType": "ro" | "mineral" | "tanker",
  "quantity": <number in litres>,
  "language": "${language}"
}

Rules for extraction:
- Default waterType to "tanker" if not explicitly mentioned.
- Default quantity to 500 litres if the user does not specify.
- If the user says "RO water" or "purified", use "ro".
- If the user says "mineral" or "Bisleri" or branded, use "mineral".
- If the user mentions "tanker" or "borewell" or large quantity, use "tanker".
- Quantities mentioned in gallons should be converted to litres (1 gallon = 3.785 litres).
- Common Hindi terms: "paani" = water, "gaadi" = tanker, "liter" = litres.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text().trim();

  // Strip potential markdown code fences that the model may include.
  const jsonString = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(jsonString) as VoiceCommandIntent;

    // Validate and sanitize the parsed output.
    const validWaterTypes = ['ro', 'mineral', 'tanker'] as const;
    const waterType = validWaterTypes.includes(parsed.waterType as any)
      ? parsed.waterType
      : 'tanker';

    const quantity =
      typeof parsed.quantity === 'number' && parsed.quantity > 0
        ? parsed.quantity
        : 500;

    return {
      waterType,
      quantity,
      language: language || 'en',
    };
  } catch {
    // If parsing fails, return safe defaults.
    console.error('[Gemini] Failed to parse voice command response:', text);
    return {
      waterType: 'tanker',
      quantity: 500,
      language: language || 'en',
    };
  }
}

// ---------------------------------------------------------------------------
// getDemandPrediction
// ---------------------------------------------------------------------------

/**
 * Predicts water demand for a specific zone using historical data.
 *
 * @param zone           - The zone / area identifier.
 * @param historicalData - Any relevant historical demand data (orders, weather, etc.).
 * @returns A DemandPrediction with level, confidence, and recommendations.
 */
export async function getDemandPrediction(
  zone: string,
  historicalData: any
): Promise<DemandPrediction> {
  const model = getGeminiModel();

  const prompt = `You are a demand prediction engine for JalSeva, an Indian water tanker delivery platform.

Analyze the following data and predict water demand for the specified zone.

Zone: ${zone}
Historical Data: ${JSON.stringify(historicalData)}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) in this exact format:
{
  "zone": "${zone}",
  "predictedDemand": "low" | "normal" | "high" | "surge",
  "confidence": <number between 0 and 1>,
  "nextHourEstimate": <number of expected orders in the next hour>,
  "recommendations": [<array of actionable recommendation strings>]
}

Consider the following factors:
- Time of day (morning/evening peaks).
- Day of week (weekends may differ).
- Seasonal patterns (summer = higher demand).
- Historical order volume trends.
- Any anomalies in the data.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text().trim();

  const jsonString = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(jsonString) as DemandPrediction;

    // Validate the parsed output.
    const validLevels = ['low', 'normal', 'high', 'surge'] as const;
    const predictedDemand = validLevels.includes(parsed.predictedDemand as any)
      ? parsed.predictedDemand
      : 'normal';

    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5;

    const nextHourEstimate =
      typeof parsed.nextHourEstimate === 'number' && parsed.nextHourEstimate >= 0
        ? parsed.nextHourEstimate
        : 0;

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((r) => typeof r === 'string')
      : [];

    return {
      zone,
      predictedDemand,
      confidence,
      nextHourEstimate,
      recommendations,
    };
  } catch {
    console.error('[Gemini] Failed to parse demand prediction response:', text);
    return {
      zone,
      predictedDemand: 'normal',
      confidence: 0.5,
      nextHourEstimate: 0,
      recommendations: ['Unable to generate predictions. Using default demand level.'],
    };
  }
}

// ---------------------------------------------------------------------------
// translateText
// ---------------------------------------------------------------------------

/**
 * Translates text into the target language using Gemini.
 *
 * @param text       - The source text to translate.
 * @param targetLang - Target language code or name (e.g. "hi", "Hindi", "ta").
 * @returns The translated text string.
 */
export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  const model = getGeminiModel();

  const prompt = `Translate the following text into ${targetLang}.
Return ONLY the translated text, nothing else. No explanations, no quotes.

Text: "${text}"`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
}

// ---------------------------------------------------------------------------
// generateChatResponse
// ---------------------------------------------------------------------------

/**
 * Generates a conversational response for the WhatsApp chatbot.
 *
 * @param message - The incoming user message.
 * @param context - Contextual data: user info, recent orders, language, etc.
 * @returns A string reply suitable for sending via WhatsApp.
 */
export async function generateChatResponse(
  message: string,
  context: any
): Promise<string> {
  const model = getGeminiModel();

  const systemPrompt = `You are JalSeva's friendly WhatsApp assistant. You help customers order water tankers in India.

Context about the user:
${JSON.stringify(context, null, 2)}

Guidelines:
- Be concise -- WhatsApp messages should be short and clear.
- Use the user's preferred language (from context). Default to Hindi if unsure.
- You can help with: placing orders, checking order status, finding nearby suppliers, pricing information.
- For placing orders, collect: water type (RO / mineral / tanker), quantity (litres), delivery address.
- Always be polite, use simple language, and include relevant emojis sparingly.
- If the user's intent is unclear, ask a clarifying question.
- Format prices in Indian Rupees.
- Do NOT share internal system details or technical information.

Respond to the following message:`;

  const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
  const response = result.response;
  return response.text().trim();
}

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

export default genAI;
