'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Truck, Phone, Star, X, MapPin, Droplet, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { Card } from '@/components/ui/Card';
import type { Order, OrderStatus, WaterType } from '@/types';

const waterTypeLabels: Record<WaterType, string> = {
  ro: 'RO Water',
  mineral: 'Mineral Water',
  tanker: 'Tanker Water',
};

const waterTypeIcons: Record<WaterType, string> = {
  ro: '\uD83D\uDCA7',
  mineral: '\uD83C\uDFD4\uFE0F',
  tanker: '\uD83D\uDE9B',
};

function formatETA(seconds: number): string {
  if (seconds <= 0) return 'Arriving now';
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export interface OrderStatusCardProps {
  order: Order;
  supplierName?: string;
  supplierRating?: number;
  onTrack?: () => void;
  onCancel?: () => void;
  onRate?: (rating: number) => void;
  onCall?: () => void;
  className?: string;
}

const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  order,
  supplierName,
  supplierRating,
  onTrack,
  onCancel,
  onRate,
  onCall,
  className,
}) => {
  const [eta, setEta] = useState(order.tracking?.eta || 0);
  const [userRating, setUserRating] = useState(0);

  useEffect(() => {
    if (order.status !== 'en_route' && order.status !== 'arriving') return;

    const interval = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [order.status]);

  useEffect(() => {
    setEta(order.tracking?.eta || 0);
  }, [order.tracking?.eta]);

  const showTrack = order.status === 'en_route' || order.status === 'arriving';
  const showCancel = order.status === 'searching' || order.status === 'accepted';
  const showRate = order.status === 'delivered' && !order.rating?.customerRating;
  const showCall = order.status === 'accepted' || order.status === 'en_route' || order.status === 'arriving';

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {waterTypeIcons[order.waterType]}
            </span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {waterTypeLabels[order.waterType]}
              </p>
              <p className="text-xs text-gray-500">
                {order.quantityLitres}L
              </p>
            </div>
          </div>
          <Badge variant={order.status as OrderStatus} size="sm" />
        </div>

        {(order.status === 'en_route' || order.status === 'arriving') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-xl p-3 mb-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  ETA
                </span>
              </div>
              <span className="text-lg font-bold text-blue-700">
                {formatETA(eta)}
              </span>
            </div>
            {eta > 0 && (
              <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: order.tracking?.eta || 0,
                    ease: 'linear',
                  }}
                />
              </div>
            )}
          </motion.div>
        )}

        {supplierName && order.status !== 'searching' && order.status !== 'cancelled' && (
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Truck size={16} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {supplierName}
                </p>
                {supplierRating && (
                  <div className="flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-yellow-400"
                      fill="currentColor"
                    />
                    <span className="text-xs text-gray-500">
                      {supplierRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {showCall && (
              <button
                onClick={onCall}
                className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                aria-label="Call supplier"
              >
                <Phone size={16} className="text-green-700" />
              </button>
            )}
          </div>
        )}

        {order.deliveryLocation?.address && (
          <div className="flex items-start gap-2 py-2 border-t border-gray-100">
            <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500 leading-snug">
              {order.deliveryLocation.address}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Droplet size={14} className="text-blue-500" />
            <span className="text-xs text-gray-500">
              {order.quantityLitres}L
            </span>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatCurrency(order.price.total)}
          </p>
        </div>
      </div>

      {showRate && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-600 mb-2">Rate your experience</p>
          <StarRating
            value={userRating}
            onChange={(rating) => {
              setUserRating(rating);
              onRate?.(rating);
            }}
            interactive
            size="lg"
          />
        </div>
      )}

      {(showTrack || showCancel) && (
        <div className="flex gap-2 px-4 pb-4">
          {showTrack && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onTrack}
              leftIcon={<MapPin size={16} />}
            >
              Track Order
            </Button>
          )}
          {showCancel && (
            <Button
              variant={showTrack ? 'ghost' : 'danger'}
              size="md"
              fullWidth={!showTrack}
              onClick={onCancel}
              leftIcon={<X size={16} />}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

OrderStatusCard.displayName = 'OrderStatusCard';

export { OrderStatusCard };
