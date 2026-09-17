'use client';

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
  footer,
  hoverEffect = false,
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-surface-dark/60 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300 ${
        hoverEffect ? 'hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            {title && <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-3.5 bg-white/[0.02] border-t border-white/5">{footer}</div>}
    </div>
  );
};
