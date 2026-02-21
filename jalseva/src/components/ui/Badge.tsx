'use client';

import type React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-semibold rounded-full whitespace-nowrap',
  {
    variants: {
      variant: {
        searching:
          'bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse',
        accepted: 'bg-blue-100 text-blue-800 border border-blue-300',
        en_route: 'bg-orange-100 text-orange-800 border border-orange-300',
        arriving: 'bg-purple-100 text-purple-800 border border-purple-300',
        delivered: 'bg-green-100 text-green-800 border border-green-300',
        cancelled: 'bg-red-100 text-red-800 border border-red-300',
        info: 'bg-gray-100 text-gray-800 border border-gray-300',
        success: 'bg-green-100 text-green-800 border border-green-300',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        verified: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        pending: 'bg-amber-100 text-amber-800 border border-amber-300',
        rejected: 'bg-red-100 text-red-800 border border-red-300',
      },
      size: {
        sm: 'text-xs px-2 py-0.5 gap-1',
        lg: 'text-sm px-3 py-1 gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'info',
      size: 'sm',
    },
  }
);

const statusLabels: Record<string, string> = {
  searching: 'Searching',
  accepted: 'Accepted',
  en_route: 'On the Way',
  arriving: 'Arriving',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
};

const statusDots: Record<string, string> = {
  searching: 'bg-yellow-500',
  accepted: 'bg-blue-500',
  en_route: 'bg-orange-500',
  arriving: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  info: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  verified: 'bg-emerald-500',
  pending: 'bg-amber-500',
  rejected: 'bg-red-500',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean;
  label?: string;
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'info',
  size,
  showDot = true,
  label,
  children,
  ...props
}) => {
  const displayText = label || children || statusLabels[variant || 'info'];

  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5',
            statusDots[variant || 'info'],
            variant === 'searching' && 'animate-ping'
          )}
        />
      )}
      {displayText}
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
