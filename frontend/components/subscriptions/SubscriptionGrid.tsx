'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subscription, SubscriptionCard } from './SubscriptionCard';
import { CATEGORIES, STATUS_OPTIONS } from '@/lib/constants';
import { Search, Filter, ArrowUpDown, Plus, Sparkles, Inbox, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SubscriptionGridProps {
  subscriptions: Subscription[];
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const SubscriptionGrid: React.FC<SubscriptionGridProps> = ({
  subscriptions,
  onEdit,
  onDelete,
  onAddNew,
  onRefresh,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'renewal' | 'cost_desc' | 'cost_asc' | 'name'>('renewal');

  // AI Search states
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<Subscription[] | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read URL query params (e.g. ?category=entertainment)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      if (catParam) {
        setSelectedCategory(catParam);
      }
    }
  }, []);

  const triggerAiSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setAiResults(null);
      return;
    }
    setIsAiSearching(true);
    try {
      const { api } = await import('@/lib/api');
      const results = await api.post<Subscription[]>('/api/subscriptions/search', {
        query: queryText.trim(),
      });
      setAiResults(results);
    } catch (err) {
      console.error('AI search request failed:', err);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleAiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAiQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setAiResults(null);
      return;
    }

    if (val.trim().length >= 3) {
      debounceTimerRef.current = setTimeout(() => {
        triggerAiSearch(val);
      }, 500);
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && aiQuery.trim()) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      triggerAiSearch(aiQuery);
    }
  };

  const handleClearAiSearch = () => {
    setAiQuery('');
    setAiResults(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const baseList = aiResults !== null ? aiResults : subscriptions;

  const filteredSubscriptions = useMemo(() => {
    return baseList
      .filter((sub) => {
        const matchesSearch =
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (sub.notes && sub.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (sub.tags && sub.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

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
  }, [baseList, searchQuery, selectedCategory, selectedStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* AI Natural Language Search Bar */}
      <div className="relative rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 p-3.5 backdrop-blur-xl shadow-lg shadow-indigo-500/5 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Try 'streaming over ₹500' or 'annual subs due next month'..."
              value={aiQuery}
              onChange={handleAiInputChange}
              onKeyDown={handleAiKeyDown}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {isAiSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-indigo-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>AI searching...</span>
              </div>
            )}
          </div>
          {aiQuery && (
            <button
              onClick={handleClearAiSearch}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 flex-shrink-0"
              title="Clear AI search"
            >
              <span>Clear</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Visual indicator when AI search is active */}
        {aiResults !== null && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200 border border-indigo-500/35 text-[11px] font-bold shadow-sm">
                ✨ AI Search Active
              </span>
              <span>
                Found <strong className="text-white">{aiResults.length}</strong> matching subscription{aiResults.length === 1 ? '' : 's'} for &ldquo;{aiQuery}&rdquo;
              </span>
            </div>
            <button
              onClick={handleClearAiSearch}
              className="text-[11px] font-medium text-indigo-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              Restore full list
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-dark/40 border border-white/10 backdrop-blur-xl">
        {/* Quick Text Filter */}
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
              onReviewed={() => onRefresh && onRefresh()}
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
            {aiQuery || searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your search query or filters to find what you are looking for.'
              : 'Start tracking your recurring payments by adding your first subscription.'}
          </p>
          {aiQuery ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleClearAiSearch}
            >
              Clear AI Search
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={onAddNew}
              icon={<Plus className="w-4 h-4" />}
            >
              Add First Subscription
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

