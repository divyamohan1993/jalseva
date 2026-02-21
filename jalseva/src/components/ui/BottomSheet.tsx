'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type PanInfo, useAnimation } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SnapPoint = 'quarter' | 'half' | 'full';

const snapHeights: Record<SnapPoint, number> = {
  quarter: 25,
  half: 50,
  full: 90,
};

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoint?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  snapPoint = 'half',
  onSnapChange,
  children,
  className,
  showCloseButton = true,
}) => {
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = useState<SnapPoint>(snapPoint);

  const getSheetHeight = useCallback(
    (snap: SnapPoint) => snapHeights[snap],
    []
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(snapPoint);
      controls.start({
        height: `${getSheetHeight(snapPoint)}vh`,
        transition: { type: 'spring', damping: 30, stiffness: 300 },
      });
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, snapPoint, controls, getSheetHeight]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      if (velocity > 500 || offset > 150) {
        if (currentSnap === 'full') {
          const nextSnap = 'half';
          setCurrentSnap(nextSnap);
          onSnapChange?.(nextSnap);
          controls.start({
            height: `${getSheetHeight(nextSnap)}vh`,
            transition: { type: 'spring', damping: 30, stiffness: 300 },
          });
        } else if (currentSnap === 'half') {
          const nextSnap = 'quarter';
          setCurrentSnap(nextSnap);
          onSnapChange?.(nextSnap);
          controls.start({
            height: `${getSheetHeight(nextSnap)}vh`,
            transition: { type: 'spring', damping: 30, stiffness: 300 },
          });
        } else {
          onClose();
        }
      } else if (velocity < -500 || offset < -150) {
        if (currentSnap === 'quarter') {
          const nextSnap = 'half';
          setCurrentSnap(nextSnap);
          onSnapChange?.(nextSnap);
          controls.start({
            height: `${getSheetHeight(nextSnap)}vh`,
            transition: { type: 'spring', damping: 30, stiffness: 300 },
          });
        } else if (currentSnap === 'half') {
          const nextSnap = 'full';
          setCurrentSnap(nextSnap);
          onSnapChange?.(nextSnap);
          controls.start({
            height: `${getSheetHeight(nextSnap)}vh`,
            transition: { type: 'spring', damping: 30, stiffness: 300 },
          });
        }
      } else {
        controls.start({
          height: `${getSheetHeight(currentSnap)}vh`,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        });
      }
    },
    [currentSnap, controls, getSheetHeight, onClose, onSnapChange]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            initial={{ height: 0 }}
            animate={controls}
            exit={{ height: 0 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              'absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-10 flex flex-col',
              className
            )}
          >
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
                {title && (
                  <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 ml-auto"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-8 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

BottomSheet.displayName = 'BottomSheet';

export { BottomSheet };
