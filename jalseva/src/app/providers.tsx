'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { I18nProvider, useT } from '@/lib/i18n';
import type { User } from '@/types';

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------
// Initializes auth state. First checks for a demo user in localStorage
// (used when SMS OTP is bypassed for demo). If none, falls back to the
// standard Firebase onAuthStateChanged listener.
// ---------------------------------------------------------------------------

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    // ------------------------------------------------------------------
    // Check for demo user in localStorage first
    // ------------------------------------------------------------------
    try {
      const stored = localStorage.getItem('jalseva_demo_user');
      if (stored) {
        const demoUser: User = JSON.parse(stored);
        // Rehydrate Date objects
        demoUser.createdAt = new Date(demoUser.createdAt);
        demoUser.updatedAt = new Date(demoUser.updatedAt);
        setUser(demoUser);
        setLoading(false);
        setInitialized(true);
        return; // Skip Firebase listener — demo mode active
      }
    } catch {
      // localStorage unavailable or corrupt — fall through to Firebase
    }

    // ------------------------------------------------------------------
    // Standard Firebase auth listener
    // ------------------------------------------------------------------
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            const user: User = {
              id: firebaseUser.uid,
              phone: data.phone || firebaseUser.phoneNumber || '',
              name: data.name || '',
              role: data.role || 'customer',
              avatar: data.avatar || undefined,
              language: data.language || 'en',
              location: data.location || undefined,
              rating: data.rating || { average: 5, count: 0 },
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            };
            setUser(user);
          } else {
            setUser({
              id: firebaseUser.uid,
              phone: firebaseUser.phoneNumber || '',
              name: '',
              role: 'customer',
              language: 'en',
              rating: { average: 5, count: 0 },
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setInitialized]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// LanguageBridge
// ---------------------------------------------------------------------------
// Keeps the I18nProvider locale in sync with the authenticated user's
// language preference. For non-logged-in users it falls back to the
// `jalseva_lang` value stored in localStorage.
// ---------------------------------------------------------------------------

function LanguageBridge() {
  const user = useAuthStore((s) => s.user);
  const { setLocale } = useT();
  const hasInitialised = useRef(false);

  // On mount: if no user yet, check localStorage for a persisted preference
  useEffect(() => {
    if (hasInitialised.current) return;
    hasInitialised.current = true;

    if (!user) {
      try {
        const stored = localStorage.getItem('jalseva_lang');
        if (stored) {
          setLocale(stored);
        }
      } catch {
        // localStorage unavailable
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user's language changes, push it into the i18n context
  useEffect(() => {
    if (user?.language) {
      setLocale(user.language);
    }
  }, [user?.language, setLocale]);

  return null;
}

// ---------------------------------------------------------------------------
// Providers (root wrapper)
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <I18nProvider initialLocale="en">
        <LanguageBridge />
        {children}
      </I18nProvider>
    </AuthProvider>
  );
}
