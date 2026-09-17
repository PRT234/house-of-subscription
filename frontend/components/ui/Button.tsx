'use client';

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 focus:ring-indigo-500 border border-indigo-500/30',
      secondary: 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 focus:ring-slate-400',
      danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 focus:ring-rose-500 border border-rose-500/30',
      ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white focus:ring-slate-400',
      outline: 'bg-transparent border border-white/20 hover:border-white/40 text-slate-200 hover:bg-white/5 focus:ring-slate-400',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && icon}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
