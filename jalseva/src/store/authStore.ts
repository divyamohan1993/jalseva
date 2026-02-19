// =============================================================================
// JalSeva - Authentication Store (Zustand)
// =============================================================================
// Manages global authentication state: current user, loading indicators, and
// initialization flag. All auth-related UI reads from this store.
// =============================================================================

import { create } from 'zustand';
import type { User } from '@/types';

// ---------------------------------------------------------------------------
// State Shape
// ---------------------------------------------------------------------------

export interface AuthState {
  /** Currently authenticated user, or null when signed out */
  user: User | null;
  /** True while an auth operation (login / verify / profile fetch) is in flight */
  loading: boolean;
  /** Flips to true once the Firebase onAuthStateChanged listener has fired at
   *  least once, so the app can distinguish "still loading" from "no user". */
  initialized: boolean;

  // -- Actions ---------------------------------------------------------------
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  loading: false,
  initialized: false,

  // Actions
  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  setInitialized: (initialized) => set({ initialized }),

  logout: () =>
    set({
      user: null,
      loading: false,
    }),
}));
