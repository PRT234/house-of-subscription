'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/dashboard/StatCard';
import { UpcomingList, UpcomingItem } from '@/components/dashboard/UpcomingList';
import { CategoryChart, CategorySummary } from '@/components/dashboard/CategoryChart';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<DashboardSummary>('/api/subscriptions/summary');
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleAddSubscription = async (formData: any) => {
    await api.post('/api/subscriptions/', formData);
    await fetchSummary();
  };

  return (
    <div className="space-y-8">
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
            onClick={fetchSummary}
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
