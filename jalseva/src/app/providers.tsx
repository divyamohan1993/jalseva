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
// Initializes a Firebase onAuthStateChanged listener when the app mounts.
// On every auth state change it fetches the Firestore user document and
// updates the global Zustand auth store so every component stays in sync.
// ---------------------------------------------------------------------------

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch the full user profile from Firestore
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
            // Firebase user exists but no Firestore doc yet (new user)
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
// Wraps the application in all required context providers.
// Add more providers here as needed (e.g. theme, i18n).
// ---------------------------------------------------------------------------

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
