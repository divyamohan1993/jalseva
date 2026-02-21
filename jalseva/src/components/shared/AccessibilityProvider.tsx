'use client';

// =============================================================================
// JalSeva - Accessibility Provider
// =============================================================================
// Provides app-wide accessibility features:
//   - Screen reader announcements (aria-live regions)
//   - Haptic feedback for deaf users
//   - Font size scaling for low-vision users
//   - High contrast detection
//   - Reduced motion detection
//   - Auto-detect preferred language from device
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccessibilityContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;

  /** Trigger haptic feedback (for deaf users / confirmation) */
  haptic: (pattern?: number | number[]) => void;

  /** Current font scale factor (1.0 = normal) */
  fontScale: number;

  /** Increase font scale */
  increaseFontSize: () => void;

  /** Decrease font scale */
  decreaseFontSize: () => void;

  /** Reset font scale to default */
  resetFontSize: () => void;

  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;

  /** Whether the user prefers high contrast */
  prefersHighContrast: boolean;

  /** Whether screen reader is likely active */
  screenReaderActive: boolean;

  /** Device preferred language (BCP 47) */
  deviceLanguage: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AccessibilityContext = createContext<AccessibilityContextValue>({
  announce: () => {},
  haptic: () => {},
  fontScale: 1.0,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  resetFontSize: () => {},
  prefersReducedMotion: false,
  prefersHighContrast: false,
  screenReaderActive: false,
  deviceLanguage: 'en',
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScale] = useState(1.0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [deviceLanguage, setDeviceLanguage] = useState('en');

  // Refs for the live regions
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------------
  // Detect media preferences
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener('change', motionHandler);

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(contrastQuery.matches);
    const contrastHandler = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);
    contrastQuery.addEventListener('change', contrastHandler);

    // Device language
    const lang = navigator.language || navigator.languages?.[0] || 'en';
    setDeviceLanguage(lang);

    // Screen reader detection heuristic
    // If user has reduced motion + uses keyboard navigation, likely using a screen reader
    const detectScreenReader = () => {
      const hasReducedMotion = motionQuery.matches;
      // Check if ARIA properties are being queried (rough heuristic)
      const likelyScreenReader = hasReducedMotion && document.querySelector('[role="main"]') !== null;
      setScreenReaderActive(likelyScreenReader);
    };
    detectScreenReader();

    // Load persisted font scale
    try {
      const stored = localStorage.getItem('jalseva_font_scale');
      if (stored) {
        const scale = Number.parseFloat(stored);
        if (scale >= 0.8 && scale <= 2.0) {
          setFontScale(scale);
          document.documentElement.style.fontSize = `${scale * 100}%`;
        }
      }
    } catch {
      // localStorage unavailable
    }

    return () => {
      motionQuery.removeEventListener('change', motionHandler);
      contrastQuery.removeEventListener('change', contrastHandler);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Announce to screen readers
  // -----------------------------------------------------------------------

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const region = priority === 'assertive' ? assertiveRef.current : politeRef.current;
      if (region) {
        // Clear first to ensure re-announcement of same message
        region.textContent = '';
        requestAnimationFrame(() => {
          region.textContent = message;
        });
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // Haptic feedback
  // -----------------------------------------------------------------------

  const haptic = useCallback((pattern: number | number[] = 50) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Font scale controls
  // -----------------------------------------------------------------------

  const updateFontScale = useCallback((scale: number) => {
    const clamped = Math.max(0.8, Math.min(2.0, scale));
    setFontScale(clamped);
    document.documentElement.style.fontSize = `${clamped * 100}%`;
    try {
      localStorage.setItem('jalseva_font_scale', String(clamped));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const increaseFontSize = useCallback(() => {
    updateFontScale(fontScale + 0.1);
  }, [fontScale, updateFontScale]);

  const decreaseFontSize = useCallback(() => {
    updateFontScale(fontScale - 0.1);
  }, [fontScale, updateFontScale]);

  const resetFontSize = useCallback(() => {
    updateFontScale(1.0);
  }, [updateFontScale]);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const value: AccessibilityContextValue = {
    announce,
    haptic,
    fontScale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    prefersReducedMotion,
    prefersHighContrast,
    screenReaderActive,
    deviceLanguage,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}

      {/* Screen reader live regions */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
