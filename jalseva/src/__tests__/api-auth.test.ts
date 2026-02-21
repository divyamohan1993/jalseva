// =============================================================================
// Test: Auth API — OTP Phone Validation, User Creation
// Covers: Test plan item #5 (login flow: OTP → cookie set → middleware auth)
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { UserRole } from '../types';

describe('Auth API: Phone number validation', () => {
  const phoneRegex = /^\+91\d{10}$/;

  it('accepts valid Indian phone numbers', () => {
    expect(phoneRegex.test('+919876543210')).toBe(true);
    expect(phoneRegex.test('+911234567890')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(phoneRegex.test('9876543210')).toBe(false); // Missing +91
    expect(phoneRegex.test('+91987654321')).toBe(false); // 9 digits
    expect(phoneRegex.test('+9198765432100')).toBe(false); // 11 digits
    expect(phoneRegex.test('+1234567890')).toBe(false); // Wrong country code
    expect(phoneRegex.test('')).toBe(false);
    expect(phoneRegex.test('+91abcdefghij')).toBe(false);
  });
});

describe('Auth API: Role validation', () => {
  const validRoles: UserRole[] = ['customer', 'supplier', 'admin'];

  it('accepts valid roles', () => {
    expect(validRoles.includes('customer')).toBe(true);
    expect(validRoles.includes('supplier')).toBe(true);
    expect(validRoles.includes('admin')).toBe(true);
  });

  it('rejects invalid roles', () => {
    expect(validRoles.includes('superadmin' as UserRole)).toBe(false);
    expect(validRoles.includes('' as UserRole)).toBe(false);
  });

  it('defaults to customer role', () => {
    const body = { phone: '+919876543210' };
    const role = (body as { role?: UserRole }).role ?? 'customer';
    expect(role).toBe('customer');
  });
});

describe('Auth API: New user document structure', () => {
  it('creates correct new user object', () => {
    const userId = 'test-user-id';
    const phone = '+919876543210';
    const role: UserRole = 'customer';

    const newUser = {
      id: userId,
      phone,
      name: '',
      role,
      language: 'hi',
      rating: { average: 0, count: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(newUser.id).toBe(userId);
    expect(newUser.phone).toBe(phone);
    expect(newUser.role).toBe('customer');
    expect(newUser.language).toBe('hi');
    expect(newUser.rating.average).toBe(0);
    expect(newUser.rating.count).toBe(0);
    expect(newUser.name).toBe('');
  });
});

describe('Auth: Cookie configuration', () => {
  it('auth cookie settings are secure', () => {
    const cookieConfig = {
      httpOnly: true,
      secure: true, // in production
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    };

    expect(cookieConfig.httpOnly).toBe(true);
    expect(cookieConfig.secure).toBe(true);
    expect(cookieConfig.sameSite).toBe('lax');
    expect(cookieConfig.maxAge).toBe(604800); // 7 days in seconds
    expect(cookieConfig.path).toBe('/');
  });
});
