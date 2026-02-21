'use client';

import type React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import type { WaterType } from '@/types';

interface WaterTypeOption {
  type: WaterType;
  icon: string;
  tKey: string;
  descKey: string;
  color: string;
  bgColor: string;
  borderColor: string;
  pricePerUnit: number;
}

const waterTypes: WaterTypeOption[] = [
  {
    type: 'ro',
    icon: '\uD83D\uDCA7',
    tKey: 'purifiedRo',
    descKey: 'roDescLong',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    pricePerUnit: 30,
  },
  {
    type: 'mineral',
    icon: '\uD83C\uDFD4\uFE0F',
    tKey: 'mineralWater',
    descKey: 'mineralDescLong',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-500',
    pricePerUnit: 40,
  },
  {
    type: 'tanker',
    icon: '\uD83D\uDE9B',
    tKey: 'tankerWater',
    descKey: 'tankerDescLong',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-500',
    pricePerUnit: 15,
  },
];

export interface WaterTypeSelectorProps {
  value?: WaterType;
  onChange?: (type: WaterType) => void;
  className?: string;
}

const WaterTypeSelector: React.FC<WaterTypeSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const { t } = useT();

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
              'min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
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
                {t('water.' + water.tKey)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('water.' + water.descKey)}
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
              <p className="text-[10px] text-gray-400">{t('water.per20L')}</p>
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
