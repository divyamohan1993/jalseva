'use client';

// =============================================================================
// JalSeva - i18n Translation Context
// =============================================================================
// Provides a simple t(key, params?) function to all components.
// Messages are loaded from static JSON files per language.
// Falls back to English for missing keys.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';

import enMessages from './messages/en.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NestedMessages = { [key: string]: string | NestedMessages };
type FlatMessages = Record<string, string>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten nested JSON: { home: { title: "Hi" } } → { "home.title": "Hi" } */
function flatten(obj: NestedMessages, prefix = ''): FlatMessages {
  const result: FlatMessages = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, flatten(value, fullKey));
    }
  }
  return result;
}

/** English fallback — always bundled. */
const enFlat = flatten(enMessages as NestedMessages);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nContextValue {
  locale: string;
  setLocale: (code: string) => void;
  /** Translate a key. Supports {param} interpolation. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

// ---------------------------------------------------------------------------
// Dynamic import map — one entry per language JSON file.
// Using explicit imports so Next.js/webpack can code-split per locale.
// ---------------------------------------------------------------------------

const loaders: Record<string, () => Promise<{ default: NestedMessages }>> = {
  hi:  () => import('./messages/hi.json'),
  as:  () => import('./messages/as.json'),
  bn:  () => import('./messages/bn.json'),
  brx: () => import('./messages/brx.json'),
  doi: () => import('./messages/doi.json'),
  gu:  () => import('./messages/gu.json'),
  kn:  () => import('./messages/kn.json'),
  ks:  () => import('./messages/ks.json'),
  kok: () => import('./messages/kok.json'),
  mai: () => import('./messages/mai.json'),
  ml:  () => import('./messages/ml.json'),
  mni: () => import('./messages/mni.json'),
  mr:  () => import('./messages/mr.json'),
  ne:  () => import('./messages/ne.json'),
  or:  () => import('./messages/or.json'),
  pa:  () => import('./messages/pa.json'),
  sa:  () => import('./messages/sa.json'),
  sat: () => import('./messages/sat.json'),
  sd:  () => import('./messages/sd.json'),
  ta:  () => import('./messages/ta.json'),
  te:  () => import('./messages/te.json'),
  ur:  () => import('./messages/ur.json'),
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function I18nProvider({
  initialLocale = 'en',
  children,
}: {
  initialLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [flat, setFlat] = useState<FlatMessages>(
    initialLocale === 'en' ? enFlat : enFlat
  );

  // Load messages when locale changes
  useEffect(() => {
    if (locale === 'en') {
      setFlat(enFlat);
      return;
    }

    const loader = loaders[locale];
    if (!loader) {
      // Unknown locale — fall back to English
      setFlat(enFlat);
      return;
    }

    loader()
      .then((mod) => setFlat(flatten(mod.default)))
      .catch(() => setFlat(enFlat));
  }, [locale]);

  const setLocale = useCallback((code: string) => {
    setLocaleState(code);
    // Persist preference
    try {
      localStorage.setItem('jalseva_lang', code);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = flat[key] ?? enFlat[key] ?? key;
      if (params) {
        for (const [param, value] of Object.entries(params)) {
          text = text.replaceAll(`{${param}}`, String(value));
        }
      }
      return text;
    },
    [flat]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Access the translation function and current locale. */
export function useT() {
  return useContext(I18nContext);
}
