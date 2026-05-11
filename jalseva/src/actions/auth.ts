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
