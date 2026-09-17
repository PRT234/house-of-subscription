'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface SpendingTrendProps {
  monthlyTotal: number;
  currency?: string;
}

export const SpendingTrend: React.FC<SpendingTrendProps> = ({
  monthlyTotal,
  currency = 'INR',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate 6-month projection trend based on current recurring cost
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();

  const trendData = Array.from({ length: 6 }).map((_, i) => {
    const monthName = months[(currentMonthIdx + i) % 12];
    return {
      month: monthName,
      spending: Math.round(monthlyTotal * (1 + (i > 0 ? (i * 0.02 - 0.01) : 0))), // slight projection variation
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <div className="font-semibold text-slate-300 mb-1">{label} Projected</div>
          <div className="text-indigo-400 font-bold text-sm">
            {formatCurrency(payload[0].value, currency)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Spending Projection</h3>
          <p className="text-xs text-slate-400 mt-0.5">Estimated recurring cost over next 6 months</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Projected Run-rate</span>
          <div className="text-sm font-bold text-indigo-400">
            {formatCurrency(monthlyTotal * 12, currency)}/yr
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${formatCurrency(v, currency).split('.')[0]}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="spending"
                stroke="#6366F1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#spendingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
