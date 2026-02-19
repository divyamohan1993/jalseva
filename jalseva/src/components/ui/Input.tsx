'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  voiceButton?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      voiceButton,
      size = 'md',
      fullWidth = true,
      type,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const sizeClasses = {
      sm: 'text-sm py-1.5 px-3',
      md: 'text-base py-2.5 px-4',
      lg: 'text-lg py-3.5 px-5',
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-gray-400 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'w-full rounded-xl border bg-white text-gray-900 placeholder:text-gray-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
                : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
              sizeClasses[size],
              leftIcon && 'pl-10',
              (rightIcon || isPassword || voiceButton) && 'pr-10',
              (rightIcon || isPassword) && voiceButton && 'pr-20',
              className
            )}
            {...props}
          />
          <div className="absolute right-3 flex items-center gap-1">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            {rightIcon && !isPassword && (
              <span className="text-gray-400">{rightIcon}</span>
            )}
            {voiceButton && <span className="ml-1">{voiceButton}</span>}
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mt-0.5">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
