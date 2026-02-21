import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set(['/', '/login']);
const PUBLIC_PREFIXES = ['/api/', '/manifest.json', '/sw.js', '/icons/', '/_next/', '/favicon'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public prefixes - O(n) but n is small and constant
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Skip exact public paths - O(1) Set lookup
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('jalseva_auth');
  if (!authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|sw.js).*)'],
};
