// =============================================================================
// JalSeva - Supported Languages (Single Source of Truth)
// =============================================================================
// All language lists across the app import from here.
// Gemini AI handles translation for any of these languages.
// =============================================================================

export interface Language {
  /** ISO 639-1 code (e.g. "hi", "ta") */
  code: string;
  /** English name */
  label: string;
  /** Native script name */
  native: string;
  /** Short display string for compact UI (1-2 chars in native script) */
  short: string;
  /** BCP 47 locale for Web Speech API (e.g. "hi-IN") */
  speechLocale: string;
}

/**
 * All languages supported by JalSeva.
 * Order: English first, then Hindi (most common), then alphabetical by code.
 */
export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',   native: 'English',   short: 'EN', speechLocale: 'en-IN' },
  { code: 'hi', label: 'Hindi',     native: 'हिन्दी',     short: 'हि', speechLocale: 'hi-IN' },
  { code: 'as', label: 'Assamese',  native: 'অসমীয়া',    short: 'অ',  speechLocale: 'as-IN' },
  { code: 'bn', label: 'Bengali',   native: 'বাংলা',     short: 'বা', speechLocale: 'bn-IN' },
  { code: 'gu', label: 'Gujarati',  native: 'ગુજરાતી',   short: 'ગુ', speechLocale: 'gu-IN' },
  { code: 'kn', label: 'Kannada',   native: 'ಕನ್ನಡ',     short: 'ಕ',  speechLocale: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം',    short: 'മ',  speechLocale: 'ml-IN' },
  { code: 'mr', label: 'Marathi',   native: 'मराठी',      short: 'म',  speechLocale: 'mr-IN' },
  { code: 'or', label: 'Odia',      native: 'ଓଡ଼ିଆ',      short: 'ଓ',  speechLocale: 'or-IN' },
  { code: 'pa', label: 'Punjabi',   native: 'ਪੰਜਾਬੀ',     short: 'ਪ',  speechLocale: 'pa-IN' },
  { code: 'ta', label: 'Tamil',     native: 'தமிழ்',     short: 'த',  speechLocale: 'ta-IN' },
  { code: 'te', label: 'Telugu',    native: 'తెలుగు',    short: 'తె', speechLocale: 'te-IN' },
  { code: 'ur', label: 'Urdu',      native: 'اردو',       short: 'ار', speechLocale: 'ur-IN' },
];

/** Set of all valid language codes for quick lookup. */
export const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

/** Look up a language by code. Returns English as fallback. */
export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

/** Get the BCP 47 speech locale for a language code. */
export function getSpeechLocale(code: string): string {
  return getLanguage(code).speechLocale;
}

/** Check whether a language code is supported. */
export function isSupported(code: string): boolean {
  return LANGUAGE_CODES.has(code);
}
