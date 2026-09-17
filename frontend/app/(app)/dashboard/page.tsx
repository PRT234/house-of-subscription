'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { StatCard } from '@/components/dashboard/StatCard';
import { UpcomingList, UpcomingItem } from '@/components/dashboard/UpcomingList';
import { CategoryChart, CategorySummary } from '@/components/dashboard/CategoryChart';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { Subscription } from '@/components/subscriptions/SubscriptionCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  X,
  AlertTriangle,
} from 'lucide-react';

interface DashboardSummary {
  monthly_total: number;
  yearly_projected: number;
  active_count: number;
  categories_count: number;
  upcoming: UpcomingItem[];
  by_category: CategorySummary[];
  due_this_week: number;
  due_this_month: number;
}

interface DuplicateCategoryGroup {
  category: string;
  category_label: string;
  count: number;
  subscriptions: { id: string; name: string; amount: number; currency: string }[];
  combined_monthly: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCategoryGroup[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<string[]>([]);
  const [priceHikedSubs, setPriceHikedSubs] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumData, dupsData, subsData] = await Promise.all([
        api.get<DashboardSummary>('/api/subscriptions/summary'),
        api.get<DuplicateCategoryGroup[]>('/api/subscriptions/duplicates'),
        api.get<Subscription[]>('/api/subscriptions/'),
      ]);
      setSummary(sumData);
      setDuplicates(dupsData || []);
      setPriceHikedSubs((subsData || []).filter((s) => s.price_increased));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('hos_dismissed_duplicates') || '[]');
        setDismissedDuplicates(saved);
      } catch (e) {}
    }
    fetchDashboardData();
  }, []);

  const handleDismissDuplicate = (category: string) => {
    const next = [...dismissedDuplicates, category];
    setDismissedDuplicates(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hos_dismissed_duplicates', JSON.stringify(next));
    }
  };

  const handleAddSubscription = async (formData: any) => {
    await api.post('/api/subscriptions/', formData);
    await fetchDashboardData();
  };

  const visibleDuplicates = duplicates.filter((d) => !dismissedDuplicates.includes(d.category));

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {user?.display_name?.split(' ')[0] || 'Member'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Here is your financial overview and upcoming billing schedule.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDashboardData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Subscription
          </Button>
        </div>
      </div>

      {/* Duplicate Subscriptions Dismissible Banners */}
      {visibleDuplicates.map((dup) => (
        <div
          key={dup.category}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-100 backdrop-blur-md animate-fadeIn"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg flex-shrink-0">
              🔄
            </div>
            <p className="text-xs sm:text-sm font-medium">
              You have <span className="font-bold text-white">{dup.count} subscriptions</span> in{' '}
              <span className="font-bold text-white">{dup.category_label}</span> (combined{' '}
              <span className="font-bold text-white">{formatCurrency(dup.combined_monthly, 'INR')}</span>/mo).
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              href={`/subscriptions?category=${dup.category}`}
              className="text-xs font-semibold text-indigo-300 hover:text-white transition-colors underline underline-offset-4"
            >
              Review duplicates →
            </Link>
            <button
              onClick={() => handleDismissDuplicate(dup.category)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Price Increase Alert Banner */}
      {priceHikedSubs.length > 0 && (
        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-orange-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Recent Price Hike Detected</h4>
              <p className="text-xs text-orange-300/80 mt-0.5">
                {priceHikedSubs.length} active service{priceHikedSubs.length > 1 ? 's' : ''} ({priceHikedSubs.map((s) => s.name).join(', ')}) increased in cost recently.
              </p>
            </div>
          </div>
          <Link
            href="/subscriptions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 hover:text-white bg-orange-500/20 hover:bg-orange-500/30 px-3 py-1.5 rounded-xl border border-orange-500/30 transition-all self-start sm:self-auto"
          >
            Review Changes →
          </Link>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Monthly Expense"
          value={formatCurrency(summary?.monthly_total ?? 0, 'INR')}
          subtitle="Total committed / month"
          icon={<CreditCard className="w-5 h-5 text-indigo-400" />}
          gradient="from-indigo-600/30 to-purple-600/10"
        />

        <StatCard
          title="Yearly Projected"
          value={formatCurrency(summary?.yearly_projected ?? 0, 'INR')}
          subtitle="Annualized expenditure"
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          gradient="from-purple-600/30 to-pink-600/10"
        />

        <StatCard
          title="Active Services"
          value={String(summary?.active_count ?? 0)}
          subtitle={`Across ${summary?.categories_count ?? 0} categories`}
          icon={<Layers className="w-5 h-5 text-emerald-400" />}
          badge={`${summary?.active_count ?? 0} active`}
          gradient="from-emerald-600/30 to-teal-600/10"
        />

        <StatCard
          title="Due This Month"
          value={String(summary?.due_this_month ?? 0)}
          subtitle={`${summary?.due_this_week ?? 0} due within 7 days`}
          icon={<Calendar className="w-5 h-5 text-amber-400" />}
          badge={summary?.due_this_week ? 'Urgent' : 'Scheduled'}
          gradient="from-amber-600/30 to-orange-600/10"
        />
      </div>

      {/* Main Grid: Upcoming List + Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <UpcomingList items={summary?.upcoming ?? []} />
        </div>

        <div className="lg:col-span-5">
          <CategoryChart data={summary?.by_category ?? []} currency="INR" />
        </div>
      </div>

      {/* Modal Form */}
      <SubscriptionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddSubscription}
      />
    </div>
  );
}

