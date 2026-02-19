'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  UserCircle,
  Droplets,
  Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useSupplierStore } from '@/store/supplierStore';

// =============================================================================
// Bottom Navigation Items
// =============================================================================

const NAV_ITEMS = [
  { href: '/supplier', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/orders', label: 'Orders', icon: ClipboardList },
  { href: '/supplier/earnings', label: 'Earnings', icon: Wallet },
  { href: '/supplier/profile', label: 'Profile', icon: UserCircle },
] as const;

// =============================================================================
// Supplier Layout
// =============================================================================

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized } = useAuthStore();
  const { supplier, isOnline, setOnline } = useSupplierStore();

  // --------------------------------------------------------------------------
  // Auth & Role Guard
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!initialized) return;

    // Not logged in -> redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    // Logged in but not a supplier -> redirect to registration
    // Skip redirect if already on the register page
    if (user.role !== 'supplier' && !pathname.startsWith('/supplier/register')) {
      router.replace('/supplier/register');
      return;
    }

    // Is a supplier but profile not loaded & not on register page
    if (
      user.role === 'supplier' &&
      !supplier &&
      !pathname.startsWith('/supplier/register')
    ) {
      // Supplier profile hasn't loaded yet -- we allow rendering while it loads
    }
  }, [initialized, user, supplier, pathname, router]);

  // --------------------------------------------------------------------------
  // Don't render until auth is initialized
  // --------------------------------------------------------------------------
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Droplets className="w-10 h-10 text-green-600 animate-bounce-subtle" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If on the register page, render without the supplier shell
  if (pathname.startsWith('/supplier/register')) {
    return <>{children}</>;
  }

  // --------------------------------------------------------------------------
  // Online / Offline Toggle Handler
  // --------------------------------------------------------------------------
  const handleToggleOnline = () => {
    setOnline(!isOnline);
  };

  // Determine active nav item
  const isActive = (href: string) => {
    if (href === '/supplier') return pathname === '/supplier';
    return pathname.startsWith(href);
  };

  // Hide bottom nav on delivery page (full-screen map)
  const hideBottomNav = pathname.startsWith('/supplier/delivery');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ================================================================== */}
      {/* Top Header Bar                                                     */}
      {/* ================================================================== */}
      {!hideBottomNav && (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
            {/* Branding */}
            <div className="flex items-center gap-2">
              <Droplets className="w-6 h-6 text-green-600" />
              <span className="font-bold text-lg text-gray-900">
                Jal<span className="text-green-600">Seva</span>
              </span>
              <span className="text-xs text-gray-400 font-medium ml-0.5">
                Supplier
              </span>
            </div>

            {/* Online / Offline Toggle */}
            <button
              onClick={handleToggleOnline}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300',
                isOnline
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              )}
            >
              <motion.div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
                animate={
                  isOnline
                    ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                    : { scale: 1 }
                }
                transition={
                  isOnline
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : {}
                }
              />
              {isOnline ? 'Online' : 'Offline'}
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}

      {/* ================================================================== */}
      {/* Main Content Area                                                  */}
      {/* ================================================================== */}
      <main
        className={cn(
          'flex-1 max-w-lg mx-auto w-full',
          !hideBottomNav && 'pb-20'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ================================================================== */}
      {/* Bottom Navigation Bar                                              */}
      {/* ================================================================== */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 w-16 h-full rounded-lg transition-colors duration-200',
                    active
                      ? 'text-green-600'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <div className="relative">
                    <Icon
                      className={cn('w-5 h-5', active && 'stroke-[2.5px]')}
                    />
                    {active && (
                      <motion.div
                        layoutId="supplier-nav-indicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-600"
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      active && 'font-semibold'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Safe area for devices with home indicators */}
          <div className="h-safe-area-inset-bottom bg-white" />
        </nav>
      )}
    </div>
  );
}
