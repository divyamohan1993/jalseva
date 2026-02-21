'use client';

import type React from 'react';
import Link from 'next/link';
import {
  Droplet,
  ListOrdered,
  Clock,
  User,
  Home,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavTab {
  label: string;
  labelHi: string;
  href: string;
  icon: React.ReactNode;
}

const customerTabs: NavTab[] = [
  {
    label: 'Home',
    labelHi: 'होम',
    href: '/customer',
    icon: <Droplet size={22} />,
  },
  {
    label: 'Orders',
    labelHi: 'ऑर्डर',
    href: '/customer/orders',
    icon: <ListOrdered size={22} />,
  },
  {
    label: 'History',
    labelHi: 'इतिहास',
    href: '/customer/history',
    icon: <Clock size={22} />,
  },
  {
    label: 'Profile',
    labelHi: 'प्रोफाइल',
    href: '/customer/profile',
    icon: <User size={22} />,
  },
];

const supplierTabs: NavTab[] = [
  {
    label: 'Dashboard',
    labelHi: 'डैशबोर्ड',
    href: '/supplier',
    icon: <Home size={22} />,
  },
  {
    label: 'Orders',
    labelHi: 'ऑर्डर',
    href: '/supplier/orders',
    icon: <ListOrdered size={22} />,
  },
  {
    label: 'Earnings',
    labelHi: 'कमाई',
    href: '/supplier/earnings',
    icon: <IndianRupee size={22} />,
  },
  {
    label: 'Profile',
    labelHi: 'प्रोफाइल',
    href: '/supplier/profile',
    icon: <User size={22} />,
  },
];

export interface BottomNavProps {
  role: UserRole;
  activeTab: string;
  language?: string;
  className?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({
  role,
  activeTab,
  language = 'en',
  className,
}) => {
  const tabs = role === 'supplier' ? supplierTabs : customerTabs;
  const isHindi = language === 'hi';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 px-1 transition-colors',
                'min-w-0 relative',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full" />
              )}
              <span
                className={cn(
                  'transition-transform',
                  isActive && 'scale-110'
                )}
              >
                {tab.icon}
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium truncate max-w-full',
                  isActive && 'font-semibold'
                )}
              >
                {isHindi ? tab.labelHi : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

BottomNav.displayName = 'BottomNav';

export { BottomNav };
