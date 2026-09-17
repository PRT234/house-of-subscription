'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getCategoryMeta } from '@/lib/constants';

interface CategoryBarChartProps {
  categories: {
    category: string;
    total_monthly: number;
    count: number;
  }[];
  currency?: string;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  categories,
  currency = 'INR',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = categories.map((c) => {
    const meta = getCategoryMeta(c.category);
    return {
      name: meta.label,
      total: c.total_monthly,
      count: c.count,
      color: meta.color,
      emoji: meta.emoji,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <span>{p.emoji}</span>
            <span>{p.name}</span>
          </div>
          <div className="text-indigo-300 font-bold text-sm">
            {formatCurrency(p.total, currency)} / mo
          </div>
          <div className="text-slate-400 text-[11px] mt-0.5">
            {p.count} active subscription{p.count > 1 ? 's' : ''}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
      <div className="pb-4 border-b border-white/5 mb-4">
        <h3 className="text-base font-bold text-white tracking-tight">Category Breakdown</h3>
        <p className="text-xs text-slate-400 mt-0.5">Total monthly expense per category</p>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-slate-400 text-xs">
          No category records found
        </div>
      ) : (
        <div className="h-64 w-full">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v, currency).split('.')[0]}
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};
