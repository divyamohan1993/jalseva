'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '@/lib/utils';
import type { OrderPrice } from '@/types';

export interface PriceBreakdownProps {
  price: OrderPrice;
  showBreakdown?: boolean;
  className?: string;
}

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  price,
  showBreakdown: initialShowBreakdown = false,
  className,
}) => {
  const [expanded, setExpanded] = useState(initialShowBreakdown);
  const hasSurge = price.surge > 0;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 font-medium">Total Price</p>
          {hasSurge ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
              <Flame size={12} />
              Surge
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              Best price
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(price.total)}
        </p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-blue-600 font-medium hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        {expanded ? 'Hide' : 'View'} breakdown
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Base price</span>
                <span className="text-gray-700 font-medium">
                  {formatCurrency(price.base)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Distance charge</span>
                <span className="text-gray-700 font-medium">
                  {price.distance > 0
                    ? `+ ${formatCurrency(price.distance)}`
                    : 'Free'}
                </span>
              </div>

              {hasSurge && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-600 flex items-center gap-1">
                    <Flame size={12} />
                    Surge charge
                  </span>
                  <span className="text-orange-600 font-medium">
                    + {formatCurrency(price.surge)}
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-gray-200 pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-gray-800">Total</span>
                <span className="text-gray-900">
                  {formatCurrency(price.total)}
                </span>
              </div>

              {hasSurge && (
                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                  <Flame size={10} />
                  High demand in your area. Prices may reduce shortly.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

PriceBreakdown.displayName = 'PriceBreakdown';

export { PriceBreakdown };
