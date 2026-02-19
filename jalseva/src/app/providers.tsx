'use client';

import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
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
// Providers (root wrapper)
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
