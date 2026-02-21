// =============================================================================
// JalSeva - Edge Middleware
// =============================================================================
// Runs on every request. At 50K RPS this must be O(1) per request.
// Handles: rate limiting, auth guard, security headers, cache control.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiLimiter, globalLimiter } from '@/lib/rate-limiter';

const PUBLIC_PATHS = new Set(['/', '/login']);
const PUBLIC_PREFIXES = ['/api/', '/manifest.json', '/sw.js', '/icons/', '/_next/', '/favicon'];
const STATIC_EXTENSIONS = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff2', '.woff', '.avif', '.webp']);

// Security headers applied to every response
const SECURITY_HEADERS: [string, string][] = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self)'],
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Global system rate limit (60K RPS ceiling) ---
  const globalResult = globalLimiter.consume('global');
  if (!globalResult.allowed) {
    return new NextResponse('Service temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': String(Math.ceil(globalResult.retryAfterMs / 1000)) },
    });
  }

  // --- Per-IP rate limit on API routes ---
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const result = apiLimiter.consume(ip);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
  }

  // --- Skip auth for public prefixes - O(n) but n is small and constant ---
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return addHeaders(NextResponse.next(), pathname);
  }

  // --- Skip auth for exact public paths - O(1) Set lookup ---
  if (PUBLIC_PATHS.has(pathname)) {
    return addHeaders(NextResponse.next(), pathname);
  }

  // --- Auth guard ---
  const authCookie = request.cookies.get('jalseva_auth');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return addHeaders(NextResponse.next(), pathname);
}

function addHeaders(response: NextResponse, pathname: string): NextResponse {
  // Security headers
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }

  // Request ID for distributed tracing
  response.headers.set('X-Request-Id', crypto.randomUUID());

  // Cache-Control for static assets (1 year, immutable)
  const dotIdx = pathname.lastIndexOf('.');
  if (dotIdx > 0) {
    const ext = pathname.substring(dotIdx);
    if (STATIC_EXTENSIONS.has(ext)) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|sw.js).*)'],
};
