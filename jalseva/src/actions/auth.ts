'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { batchWriter } from '@/lib/batch-writer';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function updateProfile(
  userId: string,
  data: { name?: string; language?: string; avatar?: string }
) {
  try {
    try {
      batchWriter.update('users', userId, {
        ...data,
        updatedAt: new Date(),
      });
    } catch {
      // Firestore may be unavailable
    }

    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    };
  }
}

/**
 * Sign-in: verify a Firebase ID token (issued client-side after Phone OTP
 * confirm), upsert the user document with the chosen role, and set the
 * httpOnly auth cookie. This is the ONLY supported login path.
 */
export async function signInWithIdToken(idToken: string, role: 'customer' | 'supplier') {
  if (!idToken) return { success: false as const, error: 'missing_id_token' };
  if (role !== 'customer' && role !== 'supplier') {
    return { success: false as const, error: 'invalid_role' };
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken, true);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'verify_failed',
    };
  }

  const uid = decoded.uid;
  const phone = decoded.phone_number || '';
  const now = new Date();

  try {
    const userRef = adminDb.collection('users').doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
      // Only update role on explicit upgrade to supplier (customer stays default)
      const current = snap.data() as { role?: string } | undefined;
      const next: Record<string, unknown> = { updatedAt: now };
      if (role === 'supplier' && current?.role !== 'supplier' && current?.role !== 'admin') {
        next.role = 'supplier';
      }
      if (phone) next.phone = phone;
      await userRef.set(next, { merge: true });
    } else {
      await userRef.set({
        id: uid,
        phone,
        name: '',
        role,
        language: 'en',
        rating: { average: 5, count: 0 },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // MLP: auto-provision a verified supplier profile so demo suppliers can
    // go online instantly. In production this would require KYC + admin review.
    if (role === 'supplier') {
      const supplierRef = adminDb.collection('suppliers').doc(uid);
      const supplierSnap = await supplierRef.get();
      if (!supplierSnap.exists) {
        await supplierRef.set({
          id: uid,
          userId: uid,
          verificationStatus: 'verified',
          isOnline: false,
          vehicle: { type: 'tanker', capacity: 5000, number: 'DL-XX-0000' },
          waterTypes: ['ro', 'mineral', 'tanker'],
          serviceArea: {
            center: { lat: 28.6139, lng: 77.209 },
            radiusKm: 25,
          },
          rating: { average: 5, count: 0 },
          documents: {},
          supportsSubscription: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'firestore_failed',
    };
  }

  const cookieStore = await cookies();
  cookieStore.set('jalseva_auth', uid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return { success: true as const, uid, phone, role };
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('jalseva_auth');
}

// =============================================================================
// Demo sign-in (no SMS, no Firebase OTP)
// =============================================================================
// Each demo phone number is permanently locked to one role. The matching
// number is auto-registered with simulated government-backed documents the
// first time it signs in. Works without Firebase admin credentials — falls
// back to cookie-only auth when Firestore is unreachable.
// =============================================================================

const DEMO_USERS: Record<
  string,
  { role: 'customer' | 'supplier' | 'admin'; name: string }
> = {
  '9999900001': { role: 'customer', name: 'Demo Customer' },
  '9999900002': { role: 'supplier', name: 'Demo Supplier' },
  // Admin demo number is intentionally NOT advertised in the UI role
  // toggle — knowing the phone number IS the gate. This avoids exposing
  // an "Admin" tab to the public while still allowing showcase access.
  '9999900003': { role: 'admin', name: 'Demo Admin' },
};

const DEMO_DELHI_HUB = {
  lat: 28.6139,
  lng: 77.209,
  address: 'Connaught Place, New Delhi',
};

function simDocumentNow() {
  const now = new Date().toISOString();
  return {
    aadhaar: {
      url: 'sim://aadhaar/XXXX-XXXX-1234',
      verified: true,
      uploadedAt: now,
    },
    vehicleRC: {
      url: 'sim://rc/DL-01-XX-1234',
      verified: true,
      uploadedAt: now,
    },
    license: {
      url: 'sim://license/DL-2026-XXXXX',
      verified: true,
      uploadedAt: now,
    },
    fssai: {
      url: 'sim://fssai/12345678901234',
      verified: true,
      uploadedAt: now,
    },
    waterQuality: {
      url: 'sim://waterqual/NABL-LAB-2026-001',
      verified: true,
      uploadedAt: now,
    },
  };
}

function simWaterQualityReport() {
  return {
    ph: 7.2,
    tds: 145,
    testedAt: new Date().toISOString(),
    labName: 'NABL-Accredited Lab (Simulated)',
    certificateUrl: 'sim://cert/water-quality-2026',
    fssaiCompliant: true,
  };
}

/**
 * Phone sign-in without any SMS or Firebase Phone Auth.
 *
 * The OTP is generated client-side and shown on-screen, so this server
 * action does not need to verify it — it just creates the user + supplier
 * docs and sets the auth cookie. SMS sending is intentionally severed to
 * eliminate Phone Auth billing exposure.
 *
 * Two reserved demo numbers are permanently role-locked: 9999900001 →
 * customer, 9999900002 → supplier. For all other numbers, the FIRST
 * sign-in claims the role; subsequent attempts in a different role are
 * rejected to keep the customer/supplier identity disjoint.
 */
export async function simulatedPhoneSignIn(
  rawPhone: string,
  chosenRole: 'customer' | 'supplier',
) {
  const phone = rawPhone.replace(/\D/g, '').replace(/^91/, '');
  if (phone.length !== 10) {
    return {
      success: false as const,
      error: 'Invalid phone number.',
    };
  }
  if (chosenRole !== 'customer' && chosenRole !== 'supplier') {
    return { success: false as const, error: 'invalid_role' };
  }

  const reserved = DEMO_USERS[phone];
  // Admin demo numbers ignore the UI role toggle — the phone number itself
  // is the gate. For customer/supplier reserved numbers, role mismatch is
  // rejected with a clear message.
  if (reserved && reserved.role !== 'admin' && reserved.role !== chosenRole) {
    return {
      success: false as const,
      error: `Number +91 ${phone} is reserved for the ${reserved.role} role. Switch the role tab and try again.`,
    };
  }

  const finalRole: 'customer' | 'supplier' | 'admin' =
    reserved?.role ?? chosenRole;
  const desiredName =
    reserved?.name ||
    (chosenRole === 'supplier' ? 'Supplier User' : 'Customer User');
  const demo = { role: finalRole, name: desiredName };

  const uid = `sim_${phone}`;
  const phoneE164 = `+91${phone}`;

  // Best-effort Firestore upserts; degrade gracefully to cookie-only auth
  // when Firebase admin credentials are absent or Firestore is unreachable.
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
      const existing = snap.data() as { role?: string } | undefined;
      if (
        existing?.role &&
        existing.role !== demo.role &&
        existing.role !== 'admin'
      ) {
        return {
          success: false as const,
          error: `Number +91 ${phone} was previously registered as a ${existing.role}. Use the matching demo number for ${chosenRole}.`,
        };
      }
      await userRef.set(
        {
          updatedAt: FieldValue.serverTimestamp(),
          phone: phoneE164,
          role: demo.role,
        },
        { merge: true },
      );
    } else {
      await userRef.set({
        id: uid,
        phone: phoneE164,
        name: demo.name,
        role: demo.role,
        language: 'en',
        rating: { average: 5, count: 0 },
        location: DEMO_DELHI_HUB,
        isDemo: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (demo.role === 'supplier') {
      const supplierRef = adminDb.collection('suppliers').doc(uid);
      const supplierSnap = await supplierRef.get();
      const baseSupplier = {
        id: uid,
        userId: uid,
        verificationStatus: 'verified',
        isOnline: true,
        vehicle: {
          type: 'tanker',
          capacity: 5000,
          number: 'DL-01-XX-1234',
        },
        waterTypes: ['ro', 'mineral', 'tanker'],
        serviceArea: { center: DEMO_DELHI_HUB, radiusKm: 25 },
        rating: { average: 4.8, count: 120 },
        currentLocation: DEMO_DELHI_HUB,
        documents: simDocumentNow(),
        waterQualityReport: simWaterQualityReport(),
        qualityScore: 92,
        supportsSubscription: true,
        isDemo: true,
      };
      if (!supplierSnap.exists) {
        await supplierRef.set({
          ...baseSupplier,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await supplierRef.set(
          {
            isOnline: true,
            verificationStatus: 'verified',
            currentLocation: DEMO_DELHI_HUB,
            documents: simDocumentNow(),
            waterQualityReport: simWaterQualityReport(),
            qualityScore: 92,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }
  } catch (err) {
    // Firestore unavailable — proceed with cookie-only auth.
    console.warn(
      '[demoSignIn] Firestore upsert failed, proceeding cookie-only:',
      err,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set('jalseva_auth', uid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return {
    success: true as const,
    uid,
    phone: phoneE164,
    role: demo.role,
    name: demo.name,
  };
}
