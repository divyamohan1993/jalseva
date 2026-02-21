#!/usr/bin/env node
// =============================================================================
// JalSeva - Translation Generator
// =============================================================================
// Reads en.json and translates it into all supported Indian languages
// using the Google Gemini API. Run once to generate all JSON files.
//
// Usage:
//   GOOGLE_GEMINI_API_KEY=<key> node scripts/generate-translations.mjs
//
// Requires: @google/genai (installed in jalseva/)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.join(__dirname, '..', 'jalseva', 'src', 'lib', 'i18n', 'messages');

// All target languages (code → English name)
const TARGET_LANGUAGES = {
  as:  'Assamese',
  bn:  'Bengali',
  brx: 'Bodo',
  doi: 'Dogri',
  gu:  'Gujarati',
  kn:  'Kannada',
  ks:  'Kashmiri',
  kok: 'Konkani',
  mai: 'Maithili',
  ml:  'Malayalam',
  mni: 'Manipuri (Meitei)',
  mr:  'Marathi',
  ne:  'Nepali',
  or:  'Odia',
  pa:  'Punjabi',
  sa:  'Sanskrit',
  sat: 'Santali',
  sd:  'Sindhi',
  ta:  'Tamil',
  te:  'Telugu',
  ur:  'Urdu',
};

async function main() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: Set GOOGLE_GEMINI_API_KEY environment variable.');
    console.error('Usage: GOOGLE_GEMINI_API_KEY=<key> node scripts/generate-translations.mjs');
    process.exit(1);
  }

  // Dynamic import of @google/genai
  let GoogleGenAI;
  try {
    const genai = await import('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
  } catch {
    console.error('ERROR: @google/genai package not found.');
    console.error('Run: cd jalseva && npm install @google/genai');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  // Read English source
  const enPath = path.join(MESSAGES_DIR, 'en.json');
  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

  console.log(`Loaded ${Object.keys(flatten(enJson)).length} English strings.\n`);

  // Skip languages that already have a file (pass --force to overwrite)
  const force = process.argv.includes('--force');

  for (const [code, langName] of Object.entries(TARGET_LANGUAGES)) {
    const outPath = path.join(MESSAGES_DIR, `${code}.json`);

    if (!force && fs.existsSync(outPath)) {
      console.log(`⏭  ${code} (${langName}) — already exists, skipping. Use --force to overwrite.`);
      continue;
    }

    console.log(`🔄 Translating to ${langName} (${code})...`);

    const prompt = `You are a professional translator. Translate the following JSON object from English to ${langName} (language code: ${code}).

RULES:
- Return ONLY valid JSON — no markdown, no backticks, no explanation.
- Keep the exact same JSON keys (do NOT translate the keys).
- Keep {param} placeholders exactly as-is (e.g. {count}, {jars}, {litres}, {total}).
- Keep brand names like "JalSeva" unchanged.
- Keep technical terms like "RO", "20L" unchanged.
- Use the native script for ${langName}.
- Translate naturally for an Indian mobile app context — use conversational tone.

JSON to translate:
${JSON.stringify(enJson, null, 2)}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      let text = response.text || '';

      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

      // Validate JSON
      const parsed = JSON.parse(text);
      fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
      console.log(`✅ ${code} (${langName}) — saved to ${code}.json`);
    } catch (err) {
      console.error(`❌ ${code} (${langName}) — FAILED: ${err.message}`);
    }

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\nDone! Run the app to verify translations.');
}

// Flatten helper (for counting keys)
function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

main();
