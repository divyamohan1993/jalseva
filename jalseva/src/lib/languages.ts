// =============================================================================
// JalSeva - Supported Languages (Single Source of Truth)
// =============================================================================
// All 22 scheduled languages of India (Eighth Schedule of the Constitution)
// plus English. All language lists across the app import from here.
// Gemini AI handles translation for any of these languages.
// =============================================================================

export interface Language {
  /** ISO 639-1/3 code (e.g. "hi", "ta", "brx") */
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
 * All 22 scheduled languages of India + English (23 total).
 * Order: English first, then Hindi (most common), then alphabetical by code.
 */
export const LANGUAGES: Language[] = [
  { code: 'en',  label: 'English',    native: 'English',    short: 'EN',  speechLocale: 'en-IN' },
  { code: 'hi',  label: 'Hindi',      native: 'हिन्दी',      short: 'हि',  speechLocale: 'hi-IN' },
  { code: 'as',  label: 'Assamese',   native: 'অসমীয়া',     short: 'অ',   speechLocale: 'as-IN' },
  { code: 'bn',  label: 'Bengali',    native: 'বাংলা',      short: 'বা',  speechLocale: 'bn-IN' },
  { code: 'brx', label: 'Bodo',       native: 'बड़ो',        short: 'ब',   speechLocale: 'brx-IN' },
  { code: 'doi', label: 'Dogri',      native: 'डोगरी',      short: 'डो',  speechLocale: 'doi-IN' },
  { code: 'gu',  label: 'Gujarati',   native: 'ગુજરાતી',    short: 'ગુ',  speechLocale: 'gu-IN' },
  { code: 'kn',  label: 'Kannada',    native: 'ಕನ್ನಡ',      short: 'ಕ',   speechLocale: 'kn-IN' },
  { code: 'ks',  label: 'Kashmiri',   native: 'कॉशुर',      short: 'कॉ',  speechLocale: 'ks-IN' },
  { code: 'kok', label: 'Konkani',    native: 'कोंकणी',     short: 'कों', speechLocale: 'kok-IN' },
  { code: 'mai', label: 'Maithili',   native: 'मैथिली',     short: 'मै',  speechLocale: 'mai-IN' },
  { code: 'ml',  label: 'Malayalam',   native: 'മലയാളം',     short: 'മ',   speechLocale: 'ml-IN' },
  { code: 'mni', label: 'Manipuri',   native: 'মৈতৈলোন্',    short: 'মৈ',  speechLocale: 'mni-IN' },
  { code: 'mr',  label: 'Marathi',    native: 'मराठी',       short: 'म',   speechLocale: 'mr-IN' },
  { code: 'ne',  label: 'Nepali',     native: 'नेपाली',     short: 'ने',  speechLocale: 'ne-IN' },
  { code: 'or',  label: 'Odia',       native: 'ଓଡ଼ିଆ',       short: 'ଓ',   speechLocale: 'or-IN' },
  { code: 'pa',  label: 'Punjabi',    native: 'ਪੰਜਾਬੀ',      short: 'ਪ',   speechLocale: 'pa-IN' },
  { code: 'sa',  label: 'Sanskrit',   native: 'संस्कृतम्',   short: 'सं',  speechLocale: 'sa-IN' },
  { code: 'sat', label: 'Santali',    native: 'ᱥᱟᱱᱛᱟᱲᱤ',    short: 'ᱥ',   speechLocale: 'sat-IN' },
  { code: 'sd',  label: 'Sindhi',     native: 'سنڌي',        short: 'سن',  speechLocale: 'sd-IN' },
  { code: 'ta',  label: 'Tamil',      native: 'தமிழ்',      short: 'த',   speechLocale: 'ta-IN' },
  { code: 'te',  label: 'Telugu',     native: 'తెలుగు',     short: 'తె',  speechLocale: 'te-IN' },
  { code: 'ur',  label: 'Urdu',       native: 'اردو',        short: 'ار',  speechLocale: 'ur-IN' },
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
