// =============================================================================
// JalSeva - Firebase Client SDK Initialization
// =============================================================================
// Client-side Firebase initialization for use in React components and hooks.
// Uses NEXT_PUBLIC_ environment variables so they are available in the browser.
//
// IMPORTANT: We initialise eagerly here instead of wrapping each instance in a
// Proxy. The Firebase JS SDK does internal `instanceof Firestore` / Auth /
// Storage checks (e.g. `collection(db, …)` rejects a non-Firestore first arg),
// and Proxies wrapping a plain `{}` target fail those checks at runtime with:
//   "Expected first argument to collection() to be a CollectionReference,
//    a DocumentReference or FirebaseFirestore"
// initializeApp + getAuth/getFirestore/getStorage are all safe to call at
// module load with any config (real or placeholder) — they only register the
// SDK components; the first network call is where invalid keys would surface.
// =============================================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase client configuration sourced from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-jalseva',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'demo-jalseva.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000:web:000',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Get-or-init the singleton FirebaseApp. `getApps().length > 0 ? getApp()`
// guards against HMR / repeated module evaluation re-initialising.
const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
export default app;
