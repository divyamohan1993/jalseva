// =============================================================================
// JalSeva API - Send OTP / Create User Profile (Optimized for 50K RPS)
// =============================================================================
// POST /api/auth/send-otp
// Receives a phone number and creates/updates the user profile in Firestore.
// Actual OTP delivery is handled by Firebase Auth client SDK; this endpoint
// ensures the user document exists server-side.
//
// Optimizations:
//   1. L1 cache for user-by-phone lookup (avoids Firestore query on repeat logins)
//   2. Batch writer for non-critical timestamp updates (non-blocking)
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';
import { batchWriter } from '@/lib/batch-writer';
import { hotCache } from '@/lib/cache';
import type { User, UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, role = 'customer' } = body as { phone: string; role?: UserRole };

    // Validate phone number (Indian format)
    if (!phone || !/^\+91\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be in +91XXXXXXXXXX format.' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: UserRole[] = ['customer', 'supplier', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be customer, supplier, or admin.' },
        { status: 400 }
      );
    }

    // --- L1 cache: fast path for repeat logins ---
    const phoneCacheKey = `user:phone:${phone}`;
    const cachedUserId = hotCache.get(phoneCacheKey) as string | undefined;

    if (cachedUserId) {
      // User exists in cache - update timestamp via batch writer (non-blocking)
      batchWriter.update('users', cachedUserId, {
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          success: true,
          userId: cachedUserId,
          isNewUser: false,
          message: 'Existing user found. OTP sent via Firebase client SDK.',
        },
        { status: 200 }
      );
    }

    // --- Firestore: check if user exists by phone ---
    const usersRef = adminDb.collection('users');
    const existingUserSnapshot = await firestoreBreaker.execute(
      () => usersRef
        .where('phone', '==', phone)
        .limit(1)
        .get(),
      () => ({ empty: true, docs: [] } as unknown as FirebaseFirestore.QuerySnapshot)
    );

    let userId: string;
    let isNewUser = false;

    if (!existingUserSnapshot.empty) {
      // User exists - cache for future lookups
      const existingDoc = existingUserSnapshot.docs[0];
      userId = existingDoc.id;
      hotCache.set(phoneCacheKey, userId, 3600); // 1 hour TTL

      // Update last login timestamp via batch writer (non-blocking)
      batchWriter.update('users', userId, {
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new user document
      isNewUser = true;
      const newUserRef = usersRef.doc();
      userId = newUserRef.id;

      const newUser: Omit<User, 'createdAt' | 'updatedAt'> & {
        createdAt: string;
        updatedAt: string;
      } = {
        id: userId,
        phone,
        name: '',
        role,
        language: 'hi', // Default to Hindi
        rating: { average: 0, count: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestoreBreaker.execute(
        () => newUserRef.set(newUser)
      );

      // Cache new user for future lookups
      hotCache.set(phoneCacheKey, userId, 3600);
    }

    return NextResponse.json(
      {
        success: true,
        userId,
        isNewUser,
        message: isNewUser
          ? 'New user created. OTP sent via Firebase client SDK.'
          : 'Existing user found. OTP sent via Firebase client SDK.',
      },
      { status: isNewUser ? 201 : 200 }
    );
  } catch (error) {
    console.error('[POST /api/auth/send-otp] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing OTP request.' },
      { status: 500 }
    );
  }
}
