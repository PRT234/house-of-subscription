'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getCategoryMeta } from '@/lib/constants';

export interface CategorySummary {
  category: string;
  total_monthly: number;
  count: number;
}

interface CategoryChartProps {
  data: CategorySummary[];
  currency?: string;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({
  data,
  currency = 'INR',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = data.map((item) => {
    const meta = getCategoryMeta(item.category);
    return {
      name: meta.label,
      value: item.total_monthly,
      count: item.count,
      color: meta.color,
      emoji: meta.emoji,
    };
  });

  const totalMonthly = data.reduce((sum, item) => sum + item.total_monthly, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const percentage = totalMonthly > 0 ? ((p.value / totalMonthly) * 100).toFixed(1) : 0;
      return (
        <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <div className="flex items-center gap-2 font-semibold text-white mb-1">
            <span>{p.emoji}</span>
            <span>{p.name}</span>
          </div>
          <div className="text-slate-300 font-bold text-sm">
            {formatCurrency(p.value, currency)} / mo
          </div>
          <div className="text-slate-400 text-[11px] mt-0.5">
            {percentage}% of total ({p.count} subscription{p.count > 1 ? 's' : ''})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
      <div className="pb-4 border-b border-white/5 mb-4">
        <h3 className="text-base font-bold text-white tracking-tight">Spending by Category</h3>
        <p className="text-xs text-slate-400 mt-0.5">Monthly allocation breakdown</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-400 text-xs">
          <span>No category data available yet</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="h-56 w-full relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total
              </span>
              <span className="text-sm font-black text-white">
                {formatCurrency(totalMonthly, currency)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5">
            {chartData.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 truncate">{item.name}</span>
                <span className="text-slate-500 font-semibold ml-auto">
                  {formatCurrency(item.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
