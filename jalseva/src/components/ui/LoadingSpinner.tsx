'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const sizeConfig = {
  sm: { drop: 'w-6 h-8', text: 'text-xs' },
  md: { drop: 'w-10 h-14', text: 'text-sm' },
  lg: { drop: 'w-16 h-20', text: 'text-base' },
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className,
}) => {
  const config = sizeConfig[size];

  return (
    <output
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className
      )}
      aria-label={text || 'Loading'}
    >
      <div className={cn('relative', config.drop)}>
        <svg
          viewBox="0 0 40 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full animate-water-drop"
        >
          <path
            d="M20 0C20 0 0 28 0 40C0 48.8366 8.95431 56 20 56C31.0457 56 40 48.8366 40 40C40 28 20 0 20 0Z"
            className="fill-blue-500"
          />
          <path
            d="M20 4C20 4 4 28.5 4 39C4 46.732 11.1634 53 20 53C28.8366 53 36 46.732 36 39C36 28.5 20 4 20 4Z"
            className="fill-blue-400"
          />
          <ellipse
            cx="14"
            cy="36"
            rx="4"
            ry="6"
            className="fill-blue-300 opacity-60"
            transform="rotate(-15 14 36)"
          />
        </svg>

        <div className="absolute inset-0 flex items-end justify-center">
          <div className="w-3/4 h-1/4 bg-blue-300/30 rounded-full animate-water-ripple" />
        </div>
      </div>

      {text && (
        <p className={cn('text-gray-500 font-medium animate-pulse', config.text)}>
          {text}
        </p>
      )}

      <style jsx>{`
        @keyframes water-drop {
          0% {
            transform: translateY(-8px) scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: translateY(2px) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateY(-8px) scale(0.95);
            opacity: 0.7;
          }
        }
        @keyframes water-ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.4;
          }
        }
        :global(.animate-water-drop) {
          animation: water-drop 1.5s ease-in-out infinite;
        }
        :global(.animate-water-ripple) {
          animation: water-ripple 1.5s ease-in-out infinite 0.3s;
        }
      `}</style>
    </output>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
