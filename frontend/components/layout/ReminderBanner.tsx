'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { relativeDate } from '@/lib/utils/dateHelpers';

interface UpcomingItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  next_renewal_date: string;
  category: string;
  days_until: number;
}

interface SummaryData {
  upcoming: UpcomingItem[];
  due_this_week: number;
}

export const ReminderBanner: React.FC = () => {
  const [urgentRenewals, setUrgentRenewals] = useState<UpcomingItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await api.get<SummaryData>('/api/subscriptions/summary');
        // Find subscriptions due in 3 days or fewer
        const urgent = data.upcoming?.filter(item => item.days_until <= 3 && item.days_until >= 0) || [];
        setUrgentRenewals(urgent);
      } catch (err) {
        // Silently ignore if not logged in yet
      }
    };

    fetchSummary();
  }, []);

  if (isDismissed || urgentRenewals.length === 0) {
    return null;
  }

  const primaryItem = urgentRenewals[0];
  const count = urgentRenewals.length;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-200 backdrop-blur-md animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-300 flex-shrink-0">
            <Bell className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="truncate">
            <span className="font-semibold text-amber-300">Renewal Alert: </span>
            <span>
              <strong className="text-white">{primaryItem.name}</strong> ({formatCurrency(primaryItem.amount, primaryItem.currency)}) is renewing {relativeDate(primaryItem.next_renewal_date)}.
            </span>
            {count > 1 && (
              <span className="ml-1.5 text-amber-400/90 font-medium">
                (+{count - 1} other renewal{count > 2 ? 's' : ''} this week)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1 font-medium text-amber-300 hover:text-white hover:underline transition-colors ml-2"
          >
            <span>Review</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-amber-400/70 hover:text-white rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
