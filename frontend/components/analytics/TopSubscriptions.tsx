'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { monthlyCost, annualizeCost } from '@/lib/utils/dateHelpers';
import { getCategoryMeta } from '@/lib/constants';

interface Subscription {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  billing_frequency: string;
  category: string;
  status: string;
}

interface TopSubscriptionsProps {
  subscriptions: Subscription[];
  currency?: string;
}

export const TopSubscriptions: React.FC<TopSubscriptionsProps> = ({
  subscriptions,
  currency = 'INR',
}) => {
  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const totalAnnual = activeSubs.reduce(
    (sum, s) => sum + annualizeCost(Number(s.amount), s.billing_frequency),
    0
  );

  const sorted = [...activeSubs].sort((a, b) => {
    const costA = annualizeCost(Number(a.amount), a.billing_frequency);
    const costB = annualizeCost(Number(b.amount), b.billing_frequency);
    return costB - costA;
  });

  return (
    <div className="rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
      <div className="pb-4 border-b border-white/5 mb-4">
        <h3 className="text-base font-bold text-white tracking-tight">Top Subscriptions by Cost</h3>
        <p className="text-xs text-slate-400 mt-0.5">Ranked by annual financial commitment</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8 text-slate-400 text-xs">
          No active subscriptions to rank
        </div>
      ) : (
        <div className="space-y-3.5 flex-1">
          {sorted.slice(0, 5).map((sub, index) => {
            const cat = getCategoryMeta(sub.category);
            const annualized = annualizeCost(Number(sub.amount), sub.billing_frequency);
            const mCost = monthlyCost(Number(sub.amount), sub.billing_frequency);
            const share = totalAnnual > 0 ? ((annualized / totalAnnual) * 100).toFixed(1) : '0';

            return (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-white/5 text-slate-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border border-white/5"
                    style={{ backgroundColor: cat.bgLight }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{sub.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      {formatCurrency(mCost, sub.currency)}/mo • {sub.billing_frequency}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-white">
                    {formatCurrency(annualized, sub.currency)}/yr
                  </div>
                  <div className="text-[11px] font-medium text-indigo-400">{share}% of budget</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
