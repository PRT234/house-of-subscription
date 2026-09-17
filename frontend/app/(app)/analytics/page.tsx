'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CategoryBarChart } from '@/components/analytics/CategoryBarChart';
import { SpendingTrend } from '@/components/analytics/SpendingTrend';
import { TopSubscriptions } from '@/components/analytics/TopSubscriptions';
import { Subscription } from '@/components/subscriptions/SubscriptionCard';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { annualizeCost, monthlyCost } from '@/lib/utils/dateHelpers';
import {
  TrendingUp,
  PieChart as PieIcon,
  DollarSign,
  Zap,
  BarChart2,
} from 'lucide-react';

interface AnalyticsSummary {
  monthly_total: number;
  yearly_projected: number;
  active_count: number;
  categories_count: number;
  by_category: {
    category: string;
    total_monthly: number;
    count: number;
  }[];
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [sumData, subsData] = await Promise.all([
          api.get<AnalyticsSummary>('/api/subscriptions/summary'),
          api.get<Subscription[]>('/api/subscriptions/'),
        ]);
        setSummary(sumData);
        setSubscriptions(subsData);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeSubs = subscriptions.filter((s) => s.status === 'active');
  const avgMonthlyCost =
    activeSubs.length > 0 ? (summary?.monthly_total ?? 0) / activeSubs.length : 0;

  const topCategory = summary?.by_category?.[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Financial Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Deep dive into category distributions, long-term projections, and commitment tiers.
        </p>
      </div>

      {/* 4 Summary Stat Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl glass-card border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Monthly Run-rate
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {formatCurrency(summary?.monthly_total ?? 0, 'INR')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl glass-card border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Annual Commitment
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {formatCurrency(summary?.yearly_projected ?? 0, 'INR')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl glass-card border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Average / Service
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {formatCurrency(avgMonthlyCost, 'INR')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl glass-card border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Dominant Category
            </span>
            <div className="text-xl font-bold text-white mt-1 truncate max-w-[150px]">
              {topCategory ? topCategory.category.charAt(0).toUpperCase() + topCategory.category.slice(1) : 'None'}
            </div>
            {topCategory && (
              <span className="text-[11px] text-slate-400">
                {formatCurrency(topCategory.total_monthly, 'INR')}/mo
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <PieIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Row 1: Category Bar Chart & Spending Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <CategoryBarChart
            categories={summary?.by_category ?? []}
            currency="INR"
          />
        </div>

        <div className="lg:col-span-6">
          <SpendingTrend
            monthlyTotal={summary?.monthly_total ?? 0}
            currency="INR"
          />
        </div>
      </div>

      {/* Row 2: Top Subscriptions Ranked */}
      <div>
        <TopSubscriptions subscriptions={subscriptions} currency="INR" />
      </div>
    </div>
  );
}
