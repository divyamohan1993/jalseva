'use client';

import { usePathname } from 'next/navigation';
import { CapstoneCredit } from './CapstoneCredit';

// Pages where we deliberately skip the credit bar (pitch/report have their
// own treatment; full-screen flows would be broken by a footer).
const SKIP_EXACT = new Set<string>([
  '/pitch',
  '/report',
  '/demo',
]);

const SKIP_PREFIX = [
  '/booking',
  '/tracking/',
  '/supplier/delivery',
];

export function RouteCapstoneCredit() {
  const pathname = usePathname() || '/';
  if (SKIP_EXACT.has(pathname)) return null;
  if (SKIP_PREFIX.some((p) => pathname.startsWith(p))) return null;
  return <CapstoneCredit compact />;
}
