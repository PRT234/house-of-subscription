'use client';

import React, { useState, useMemo } from 'react';
import { Subscription, SubscriptionCard } from './SubscriptionCard';
import { CATEGORIES, STATUS_OPTIONS } from '@/lib/constants';
import { Search, Filter, ArrowUpDown, Plus, Sparkles, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SubscriptionGridProps {
  subscriptions: Subscription[];
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export const SubscriptionGrid: React.FC<SubscriptionGridProps> = ({
  subscriptions,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'renewal' | 'cost_desc' | 'cost_asc' | 'name'>('renewal');

  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sub.notes && sub.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (sub.tags && sub.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

        const matchesCategory = selectedCategory === 'all' || sub.category === selectedCategory;
        const matchesStatus = selectedStatus === 'all' || sub.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'renewal') {
          return new Date(a.next_renewal_date).getTime() - new Date(b.next_renewal_date).getTime();
        }
        if (sortBy === 'cost_desc') {
          return Number(b.amount) - Number(a.amount);
        }
        if (sortBy === 'cost_asc') {
          return Number(a.amount) - Number(b.amount);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [subscriptions, searchQuery, selectedCategory, selectedStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-dark/40 border border-white/10 backdrop-blur-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search subscriptions, tags, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl glass-input placeholder:text-slate-500"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl glass-input bg-slate-900 text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl glass-input bg-slate-900 text-slate-200 focus:outline-none max-w-[160px]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl glass-input bg-slate-900 text-slate-200 focus:outline-none"
          >
            <option value="renewal">Renewal (Earliest)</option>
            <option value="cost_desc">Cost (High to Low)</option>
            <option value="cost_asc">Cost (Low to High)</option>
            <option value="name">Name (A-Z)</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={onAddNew}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New
          </Button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredSubscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 bg-surface-dark/20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-white">No subscriptions found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your search query or filters to find what you are looking for.'
              : 'Start tracking your recurring payments by adding your first subscription.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={onAddNew}
            icon={<Plus className="w-4 h-4" />}
          >
            Add First Subscription
          </Button>
        </div>
      )}
    </div>
  );
};
