'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, relativeDate } from '@/lib/utils/dateHelpers';
import { getCategoryMeta } from '@/lib/constants';

export interface UpcomingItem {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  next_renewal_date: string;
  category: string;
  days_until: number;
}

interface UpcomingListProps {
  items: UpcomingItem[];
  title?: string;
  maxItems?: number;
}

export const UpcomingList: React.FC<UpcomingListProps> = ({
  items,
  title = 'Upcoming Renewals',
  maxItems = 5,
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="rounded-2xl glass-card border border-white/10 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Next bills scheduled for renewal</p>
        </div>
        <Link
          href="/subscriptions"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <span className="text-sm font-semibold text-white">All clear!</span>
          <span className="text-xs text-slate-400 mt-1">No renewals scheduled right now.</span>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {displayItems.map((item) => {
            const cat = getCategoryMeta(item.category);
            const isImminent = item.days_until >= 0 && item.days_until <= 3;
            const isOverdue = item.days_until < 0;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border border-white/5"
                    style={{ backgroundColor: cat.bgLight }}
                  >
                    {cat.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDate(item.next_renewal_date)}</span>
                      <span>•</span>
                      <span
                        className={`font-medium ${
                          isImminent
                            ? 'text-amber-400'
                            : isOverdue
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {relativeDate(item.next_renewal_date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-bold text-white tracking-tight">
                    {formatCurrency(item.amount, item.currency)}
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">
                    {cat.label.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
