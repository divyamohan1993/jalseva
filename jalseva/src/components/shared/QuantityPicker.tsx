'use client';

import type React from 'react';
import { useState, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { WaterType } from '@/types';

export interface QuantityPickerProps {
  value: number;
  onChange: (litres: number) => void;
  waterType?: WaterType;
  language?: string;
  className?: string;
}

const JAR_SIZE = 20;
const MIN_JARS = 1;
const MAX_JARS = 50;
const TANKER_MIN = 500;
const TANKER_MAX = 10000;
const TANKER_STEP = 500;

const WaterJar: React.FC<{ index: number; filled: boolean }> = ({
  index,
  filled,
}) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    exit={{ scale: 0 }}
    transition={{ delay: index * 0.03, type: 'spring', damping: 15 }}
    className={cn(
      'w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors',
      filled
        ? 'bg-blue-100 border-blue-400 text-blue-600'
        : 'bg-gray-50 border-gray-200 text-gray-400'
    )}
  >
    {index + 1}
  </motion.div>
);

const QuantityPicker: React.FC<QuantityPickerProps> = ({
  value,
  onChange,
  waterType = 'ro',
  language = 'en',
  className,
}) => {
  const isTanker = waterType === 'tanker';
  const isHindi = language === 'hi';

  const [sliderValue, setSliderValue] = useState(
    isTanker ? Math.max(TANKER_MIN, value) : value
  );

  const jarCount = isTanker ? 0 : Math.max(MIN_JARS, Math.ceil(value / JAR_SIZE));
  const totalLitres = isTanker ? sliderValue : jarCount * JAR_SIZE;

  const handleIncrement = useCallback(() => {
    const newJars = Math.min(jarCount + 1, MAX_JARS);
    onChange(newJars * JAR_SIZE);
  }, [jarCount, onChange]);

  const handleDecrement = useCallback(() => {
    const newJars = Math.max(jarCount - 1, MIN_JARS);
    onChange(newJars * JAR_SIZE);
  }, [jarCount, onChange]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setSliderValue(val);
      onChange(val);
    },
    [onChange]
  );

  if (isTanker) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className="text-center">
          <p className="text-3xl font-bold text-cyan-700">
            {sliderValue.toLocaleString('en-IN')}L
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {isHindi ? 'टैंकर पानी' : 'Tanker Water'}
          </p>
        </div>

        <div className="px-2">
          <input
            type="range"
            min={TANKER_MIN}
            max={TANKER_MAX}
            step={TANKER_STEP}
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-cyan-600
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-600
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-cyan-600
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{TANKER_MIN}L</span>
            <span>{(TANKER_MAX / 2).toLocaleString('en-IN')}L</span>
            <span>{TANKER_MAX.toLocaleString('en-IN')}L</span>
          </div>
        </div>

        <div className="bg-cyan-50 rounded-xl p-3 text-center">
          <p className="text-sm text-cyan-800">
            {isHindi
              ? `~ ${Math.ceil(sliderValue / 1000)} टैंकर लोड`
              : `~ ${Math.ceil(sliderValue / 1000)} tanker load${Math.ceil(sliderValue / 1000) > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center justify-center gap-6">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleDecrement}
          disabled={jarCount <= MIN_JARS}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
            'border-2 shadow-sm active:shadow-none',
            jarCount <= MIN_JARS
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
          )}
          aria-label="Remove jar"
        >
          <Minus size={24} strokeWidth={3} />
        </motion.button>

        <div className="text-center min-w-[120px]">
          <p className="text-4xl font-bold text-gray-900">{jarCount}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {isHindi
              ? `${jarCount} जार \u00D7 20L = ${totalLitres}L`
              : `${jarCount} jar${jarCount > 1 ? 's' : ''} \u00D7 20L = ${totalLitres}L`}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleIncrement}
          disabled={jarCount >= MAX_JARS}
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
            'border-2 shadow-sm active:shadow-none',
            jarCount >= MAX_JARS
              ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
          )}
          aria-label="Add jar"
        >
          <Plus size={24} strokeWidth={3} />
        </motion.button>
      </div>

      {jarCount <= 10 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <AnimatePresence>
            {Array.from({ length: jarCount }).map((_, i) => (
              <WaterJar key={i} index={i} filled={true} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {jarCount > 10 && (
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-sm text-blue-700 font-medium">
            {isHindi
              ? `${jarCount} जार = ${totalLitres} लीटर पानी`
              : `${jarCount} jars = ${totalLitres} litres of water`}
          </p>
        </div>
      )}
    </div>
  );
};

QuantityPicker.displayName = 'QuantityPicker';

export { QuantityPicker };
