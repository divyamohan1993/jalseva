'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { WaterType } from '@/types';

interface WaterTypeOption {
  type: WaterType;
  icon: string;
  labelEn: string;
  labelHi: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pricePerUnit: number;
}

const waterTypes: WaterTypeOption[] = [
  {
    type: 'ro',
    icon: '\uD83D\uDCA7',
    labelEn: 'Purified RO',
    labelHi: '\u0936\u0941\u0926\u094D\u0927 RO \u092A\u093E\u0928\u0940',
    description: 'Reverse osmosis purified',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    pricePerUnit: 30,
  },
  {
    type: 'mineral',
    icon: '\uD83C\uDFD4\uFE0F',
    labelEn: 'Mineral Water',
    labelHi: '\u092E\u093F\u0928\u0930\u0932 \u0935\u0949\u091F\u0930',
    description: 'Natural mineral rich',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-500',
    pricePerUnit: 40,
  },
  {
    type: 'tanker',
    icon: '\uD83D\uDE9B',
    labelEn: 'Tanker Water',
    labelHi: '\u091F\u0948\u0902\u0915\u0930 \u092A\u093E\u0928\u0940',
    description: 'Bulk water delivery',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-500',
    pricePerUnit: 15,
  },
];

export interface WaterTypeSelectorProps {
  value?: WaterType;
  onChange?: (type: WaterType) => void;
  language?: string;
  className?: string;
}

const WaterTypeSelector: React.FC<WaterTypeSelectorProps> = ({
  value,
  onChange,
  language = 'en',
  className,
}) => {
  const isHindi = language === 'hi';

  return (
    <div className={cn('grid grid-cols-1 gap-3', className)}>
      {waterTypes.map((water) => {
        const isSelected = value === water.type;

        return (
          <motion.button
            key={water.type}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange?.(water.type)}
            className={cn(
              'relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left',
              'min-h-[80px]',
              isSelected
                ? cn(water.bgColor, water.borderColor, 'shadow-md')
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-14 h-14 rounded-xl text-3xl shrink-0',
                isSelected ? water.bgColor : 'bg-gray-50'
              )}
            >
              {water.icon}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-bold text-base',
                  isSelected ? water.color : 'text-gray-900'
                )}
              >
                {isHindi ? water.labelHi : water.labelEn}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {water.description}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p
                className={cn(
                  'text-lg font-bold',
                  isSelected ? water.color : 'text-gray-900'
                )}
              >
                {formatCurrency(water.pricePerUnit)}
              </p>
              <p className="text-[10px] text-gray-400">per 20L</p>
            </div>

            {isSelected && (
              <motion.div
                layoutId="water-type-check"
                className={cn(
                  'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center',
                  water.type === 'ro'
                    ? 'bg-blue-500'
                    : water.type === 'mineral'
                    ? 'bg-teal-500'
                    : 'bg-cyan-500'
                )}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-3.5 h-3.5 text-white"
                >
                  <path
                    d="M3 8.5L6.5 12L13 4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

WaterTypeSelector.displayName = 'WaterTypeSelector';

export { WaterTypeSelector, waterTypes };
