// =============================================================================
// JalSeva - Firebase Client SDK Initialization
// =============================================================================
// Client-side Firebase initialization for use in React components and hooks.
// Uses NEXT_PUBLIC_ environment variables so they are available in the browser.
// =============================================================================

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase client configuration sourced from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-jalseva',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-jalseva.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000:web:000',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy singleton - avoids initialization during SSR/build when env vars may be empty
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

// Export getters that lazily initialize
const app = new Proxy({} as FirebaseApp, {
  get: (_t, prop) => {
    const a = getFirebaseApp();
    const val = (a as any)[prop];
    return typeof val === 'function' ? val.bind(a) : val;
  },
});

const auth: Auth = new Proxy({} as Auth, {
  get: (_t, prop) => {
    if (!_auth) _auth = getAuth(getFirebaseApp());
    const val = (_auth as any)[prop];
    return typeof val === 'function' ? val.bind(_auth) : val;
  },
});

const db: Firestore = new Proxy({} as Firestore, {
  get: (_t, prop) => {
    if (!_db) _db = getFirestore(getFirebaseApp());
    const val = (_db as any)[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  },
});

const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get: (_t, prop) => {
    if (!_storage) _storage = getStorage(getFirebaseApp());
    const val = (_storage as any)[prop];
    return typeof val === 'function' ? val.bind(_storage) : val;
  },
});

export { app, auth, db, storage };
export default app;
