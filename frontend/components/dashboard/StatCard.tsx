'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    text?: string;
  };
  badge?: string;
  gradient?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  gradient = 'from-indigo-500/20 to-purple-500/10',
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl glass-card border border-white/10 p-6 flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div
        className={`absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${gradient} blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="text-3xl font-black text-white tracking-tight mt-2">
            {value}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        {subtitle && <span className="text-slate-400 font-medium">{subtitle}</span>}

        {trend && (
          <div
            className={`flex items-center gap-1 font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            <span>{trend.value}</span>
            {trend.text && <span className="text-slate-400 font-normal ml-0.5">{trend.text}</span>}
          </div>
        )}

        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-300">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
