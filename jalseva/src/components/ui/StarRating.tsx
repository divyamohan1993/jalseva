'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  count?: number;
  averageLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  count,
  averageLabel = false,
  size = 'md',
  interactive = false,
  className,
}) => {
  const [hoverValue, setHoverValue] = useState<number>(0);

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 36,
  };

  const starSize = sizeMap[size];

  const touchTargetSize = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const handleClick = useCallback(
    (star: number) => {
      if (interactive && onChange) {
        onChange(star);
      }
    },
    [interactive, onChange]
  );

  const handleMouseEnter = useCallback(
    (star: number) => {
      if (interactive) {
        setHoverValue(star);
      }
    },
    [interactive]
  );

  const handleMouseLeave = useCallback(() => {
    if (interactive) {
      setHoverValue(0);
    }
  }, [interactive]);

  const activeValue = hoverValue || value;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className="flex items-center"
        onMouseLeave={handleMouseLeave}
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={`Rating: ${value} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(activeValue);
          const halfFilled =
            !filled &&
            star === Math.ceil(activeValue) &&
            activeValue % 1 >= 0.25;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              className={cn(
                'flex items-center justify-center transition-transform',
                touchTargetSize[size],
                interactive &&
                  'cursor-pointer hover:scale-110 active:scale-95',
                !interactive && 'cursor-default'
              )}
              onClick={() => handleClick(star)}
              onMouseEnter={() => handleMouseEnter(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              role={interactive ? 'radio' : undefined}
              aria-checked={interactive ? star === value : undefined}
            >
              {halfFilled ? (
                <div className="relative">
                  <Star
                    size={starSize}
                    className="text-gray-200"
                    fill="currentColor"
                  />
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: '50%' }}
                  >
                    <Star
                      size={starSize}
                      className="text-yellow-400"
                      fill="currentColor"
                    />
                  </div>
                </div>
              ) : (
                <Star
                  size={starSize}
                  className={cn(
                    'transition-colors duration-150',
                    filled ? 'text-yellow-400' : 'text-gray-200'
                  )}
                  fill="currentColor"
                />
              )}
            </button>
          );
        })}
      </div>

      {averageLabel && (
        <div className="flex items-center gap-1 ml-1">
          <span className="text-sm font-semibold text-gray-800">
            {value.toFixed(1)}
          </span>
          {typeof count === 'number' && (
            <span className="text-xs text-gray-500">({count})</span>
          )}
        </div>
      )}
    </div>
  );
};

StarRating.displayName = 'StarRating';

export { StarRating };
