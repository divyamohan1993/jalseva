// =============================================================================
// JalSeva API - User Profile
// =============================================================================
// GET  /api/auth/profile?userId=xxx  - Fetch user profile
// PUT  /api/auth/profile             - Update user profile
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// ---------------------------------------------------------------------------
// GET - Fetch user profile by userId
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: userId' },
        { status: 400 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: userDoc.id, ...userDoc.data() },
    });
  } catch (error) {
    console.error('[GET /api/auth/profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching profile.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT - Update user profile
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, language, avatar, location } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Name must be at least 2 characters.' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (language !== undefined) {
      const supportedLanguages = ['hi', 'en', 'ta', 'te', 'kn', 'mr', 'bn', 'gu', 'pa', 'ml'];
      if (!supportedLanguages.includes(language)) {
        return NextResponse.json(
          { error: `Unsupported language. Supported: ${supportedLanguages.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.language = language;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (location !== undefined) {
      if (
        typeof location !== 'object' ||
        typeof location.lat !== 'number' ||
        typeof location.lng !== 'number'
      ) {
        return NextResponse.json(
          { error: 'Location must have valid lat and lng numbers.' },
          { status: 400 }
        );
      }
      updateData.location = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
      };
    }

    await userRef.update(updateData);

    const updatedDoc = await userRef.get();

    return NextResponse.json({
      success: true,
      user: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('[PUT /api/auth/profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating profile.' },
      { status: 500 }
    );
  }
}
