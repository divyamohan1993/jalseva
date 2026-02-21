'use client';

// =============================================================================
// JalSeva - Authentication Hook
// =============================================================================
// Provides a unified auth API to React components:
//  - Listens to Firebase Auth state changes on mount
//  - Fetches the full user profile from Firestore when the Firebase user exists
//  - Exposes login (phone), verifyOTP, and logout helpers
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  RecaptchaVerifier,
  type ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import type { User, UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const { user, loading, initialized, setUser, setLoading, setInitialized, logout: storeLogout } =
    useAuthStore();

  // Keep a mutable ref to the RecaptchaVerifier so it survives across renders
  // without triggering re-renders itself.
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Keep the ConfirmationResult from signInWithPhoneNumber so verifyOTP can
  // use it later in the same session.
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // --------------------------------------------------------------------------
  // Listen to Firebase auth state
  // --------------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setLoading(true);

          // Attempt to fetch the full Firestore user profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            const profile: User = {
              id: firebaseUser.uid,
              phone: data.phone ?? firebaseUser.phoneNumber ?? '',
              name: data.name ?? '',
              role: (data.role as UserRole) ?? 'customer',
              avatar: data.avatar ?? undefined,
              language: data.language ?? 'en',
              location: data.location ?? undefined,
              rating: data.rating ?? { average: 0, count: 0 },
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
              updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
            };
            setUser(profile);
          } else {
            // First login -- create a skeleton profile in Firestore
            const newUser: Omit<User, 'createdAt' | 'updatedAt'> & {
              createdAt: ReturnType<typeof serverTimestamp>;
              updatedAt: ReturnType<typeof serverTimestamp>;
            } = {
              id: firebaseUser.uid,
              phone: firebaseUser.phoneNumber ?? '',
              name: '',
              role: 'customer',
              language: 'en',
              rating: { average: 0, count: 0 },
              createdAt: serverTimestamp() as any,
              updatedAt: serverTimestamp() as any,
            };
            await setDoc(userDocRef, newUser);

            setUser({
              id: firebaseUser.uid,
              phone: firebaseUser.phoneNumber ?? '',
              name: '',
              role: 'customer',
              language: 'en',
              rating: { average: 0, count: 0 },
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[useAuth] Error fetching user profile:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInitialized, setLoading, setUser]);

  // --------------------------------------------------------------------------
  // Login with phone number
  // --------------------------------------------------------------------------
  // Returns the verificationId that must be passed to verifyOTP.
  // `recaptchaContainerId` should be the DOM id of an empty <div> where the
  // invisible reCAPTCHA badge will be rendered.
  // --------------------------------------------------------------------------

  const login = useCallback(
    async (
      phone: string,
      recaptchaContainerId: string = 'recaptcha-container'
    ): Promise<string> => {
      setLoading(true);

      try {
        // Create (or reuse) the RecaptchaVerifier
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(
            auth,
            recaptchaContainerId,
            { size: 'invisible' }
          );
        }

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          phone,
          recaptchaVerifierRef.current
        );

        confirmationResultRef.current = confirmationResult;
        return confirmationResult.verificationId;
      } catch (error) {
        // Reset reCAPTCHA so the user can retry
        recaptchaVerifierRef.current = null;
        setLoading(false);
        throw error;
      }
    },
    [setLoading]
  );

  // --------------------------------------------------------------------------
  // Verify OTP
  // --------------------------------------------------------------------------

  const verifyOTP = useCallback(
    async (verificationId: string, otp: string) => {
      setLoading(true);

      try {
        // Prefer using the ConfirmationResult.confirm shortcut when available.
        if (
          confirmationResultRef.current &&
          confirmationResultRef.current.verificationId === verificationId
        ) {
          await confirmationResultRef.current.confirm(otp);
        } else {
          // Fallback: construct a credential manually
          const credential = PhoneAuthProvider.credential(verificationId, otp);
          await signInWithCredential(auth, credential);
        }
        // onAuthStateChanged will fire and set the user automatically
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setLoading]
  );

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      storeLogout();
    } catch (error) {
      console.error('[useAuth] Error signing out:', error);
      throw error;
    }
  }, [storeLogout]);

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  return {
    user,
    loading,
    initialized,
    login,
    verifyOTP,
    logout,
  };
}
