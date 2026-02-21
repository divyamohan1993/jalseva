'use server';

import { batchWriter } from '@/lib/batch-writer';
import { cookies } from 'next/headers';

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

export async function setAuthCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set('jalseva_auth', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('jalseva_auth');
}
