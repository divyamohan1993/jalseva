// =============================================================================
// JalSeva - Firebase Admin SDK (Server-Side)
// =============================================================================
// Server-only Firebase Admin initialization used in API routes, server
// components, and server actions. Uses service account credentials from
// environment variables. Guards against multiple initializations.
// =============================================================================

import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// ---------------------------------------------------------------------------
// Lazy singleton pattern - avoids build-time initialization errors
// ---------------------------------------------------------------------------

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    _adminApp = existingApps[0];
    return _adminApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;

  if (clientEmail && privateKey && projectId) {
    const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
    _adminApp = initializeApp({ credential: cert(serviceAccount), storageBucket });
  } else if (projectId && (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT)) {
    // Cloud Run / GCP: use ADC via metadata server. No JSON key needed.
    _adminApp = initializeApp({ credential: applicationDefault(), projectId, storageBucket });
  } else {
    // Build-time / local without creds — initialise minimally so imports don't crash.
    _adminApp = initializeApp({ projectId: projectId || 'jalseva-demo' });
  }

  return _adminApp;
}

// Lazy getters that initialize on first access
const adminApp = new Proxy({} as App, {
  get: (_t, prop) => {
    const app = getAdminApp();
    const val = (app as any)[prop];
    return typeof val === 'function' ? val.bind(app) : val;
  },
});

const adminAuth = new Proxy({} as Auth, {
  get: (_t, prop) => {
    if (!_adminAuth) _adminAuth = getAuth(getAdminApp());
    const val = (_adminAuth as any)[prop];
    return typeof val === 'function' ? val.bind(_adminAuth) : val;
  },
});

const adminDb = new Proxy({} as Firestore, {
  get: (_t, prop) => {
    if (!_adminDb) _adminDb = getFirestore(getAdminApp());
    const val = (_adminDb as any)[prop];
    return typeof val === 'function' ? val.bind(_adminDb) : val;
  },
});

const adminStorage = new Proxy({} as Storage, {
  get: (_t, prop) => {
    if (!_adminStorage) _adminStorage = getStorage(getAdminApp());
    const val = (_adminStorage as any)[prop];
    return typeof val === 'function' ? val.bind(_adminStorage) : val;
  },
});

export { adminApp, adminAuth, adminDb, adminStorage };
export default adminApp;
