// =============================================================================
// JalSeva API - Send OTP / Create User Profile
// =============================================================================
// POST /api/auth/send-otp
// Receives a phone number and creates/updates the user profile in Firestore.
// Actual OTP delivery is handled by Firebase Auth client SDK; this endpoint
// ensures the user document exists server-side.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firestoreBreaker } from '@/lib/circuit-breaker';
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

    // Check if user already exists by phone number
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
      // User exists - return existing profile
      const existingDoc = existingUserSnapshot.docs[0];
      userId = existingDoc.id;

      // Update last login timestamp
      await firestoreBreaker.execute(
        () => existingDoc.ref.update({
          updatedAt: new Date().toISOString(),
        })
      );
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
