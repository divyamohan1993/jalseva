'use client';

// =============================================================================
// JalSeva - Admin Panel Layout
// =============================================================================
// Sidebar navigation on desktop, hamburger menu on mobile/tablet.
// Verifies admin role and redirects non-admins to /.
// =============================================================================

import type React from 'react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  Settings,
  MessageSquareWarning,
  Droplets,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

// =============================================================================
// Navigation Configuration
// =============================================================================

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

// =============================================================================
// Admin Layout Component
// =============================================================================

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Auth & Role Guard
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.replace('/');
      return;
    }
  }, [initialized, user, router]);

  // --------------------------------------------------------------------------
  // Close sidebar on route change (mobile)
  // --------------------------------------------------------------------------
  // biome-ignore lint/correctness/useExhaustiveDependencies: sidebar must close on route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-10 h-10 text-blue-600 animate-pulse" />
          <p className="text-gray-500 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content for non-admin users
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-10 h-10 text-red-500" />
          <p className="text-gray-600 font-medium">Access Denied</p>
          <p className="text-gray-400 text-sm">Admin privileges required</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    router.replace('/');
  };

  // --------------------------------------------------------------------------
  // Sidebar Content (shared between desktop and mobile)
  // --------------------------------------------------------------------------
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-base leading-tight">
            JalSeva
          </h1>
          <p className="text-[11px] text-blue-600 font-semibold tracking-wide uppercase">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0',
                  active ? 'text-blue-600' : 'text-gray-400'
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
              {active && (
                <ChevronRight className="w-4 h-4 text-blue-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Info & Logout */}
      <div className="px-3 py-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || 'Admin'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================================================================== */}
      {/* Mobile Overlay Sidebar                                             */}
      {/* ================================================================== */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar Panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl">
            <div className="absolute right-3 top-4 z-10">
              <button
                onClick={() => setSidebarOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Desktop Sidebar                                                    */}
      {/* ================================================================== */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-gray-200 z-40">
        <SidebarContent />
      </aside>

      {/* ================================================================== */}
      {/* Main Content Area                                                  */}
      {/* ================================================================== */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm lg:hidden">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">
                Jal<span className="text-blue-600">Seva</span>
              </span>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                ADMIN
              </span>
            </div>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm items-center justify-between px-8 h-14">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {NAV_ITEMS.find((item) => isActive(item.href))?.label || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
