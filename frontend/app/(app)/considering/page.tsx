'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Subscription } from '@/components/subscriptions/SubscriptionCard';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { Button } from '@/components/ui/Button';
import {
  BookmarkCheck,
  Plus,
  ArrowRightCircle,
  Trash2,
  Edit2,
  TrendingUp,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Users,
} from 'lucide-react';

export default function ConsideringPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConsideringSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Subscription[]>('/api/subscriptions/?status=considering');
      setItems(data);
    } catch (err) {
      console.error('Failed to load considering subscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsideringSubscriptions();
  }, []);

  const totalMonthlyProjected = useMemo(() => {
    return items.reduce((sum, item) => {
      const cost = Number(item.your_share !== undefined && item.your_share !== null ? item.your_share : item.amount) || 0;
      let monthly = cost;
      if (item.billing_frequency === 'weekly') monthly = cost * 4.333;
      else if (item.billing_frequency === 'quarterly') monthly = cost / 3;
      else if (item.billing_frequency === 'yearly') monthly = cost / 12;
      return sum + monthly;
    }, 0);
  }, [items]);

  const currencySymbol = useMemo(() => {
    if (items.length > 0) {
      const curr = items[0].currency;
      if (curr === 'USD') return '$';
      if (curr === 'EUR') return '€';
      if (curr === 'GBP') return '£';
      return '₹';
    }
    return '₹';
  }, [items]);

  const handleOpenAddForm = () => {
    setEditingSub(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: Subscription) => {
    setEditingSub(item);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingSub) {
        await api.put(`/api/subscriptions/${editingSub.id}`, formData);
        setStatusMessage({ type: 'success', text: `Updated "${formData.name}".` });
      } else {
        // Ensure status is considering if not overridden
        const payload = {
          ...formData,
          status: formData.status || 'considering',
        };
        await api.post('/api/subscriptions/', payload);
        setStatusMessage({ type: 'success', text: `Added "${formData.name}" to your wishlist.` });
      }
      setIsFormOpen(false);
      setEditingSub(null);
      await fetchConsideringSubscriptions();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save wishlist item:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save subscription.' });
    }
  };

  const handleActivate = async (item: Subscription) => {
    setActivatingId(item.id);
    try {
      // Calculate renewal date based on cycle
      const today = new Date();
      let nextDate = new Date(today);
      if (item.billing_frequency === 'weekly') {
        nextDate.setDate(today.getDate() + 7);
      } else if (item.billing_frequency === 'quarterly') {
        nextDate.setMonth(today.getMonth() + 3);
      } else if (item.billing_frequency === 'yearly') {
        nextDate.setFullYear(today.getFullYear() + 1);
      } else {
        // monthly
        nextDate.setMonth(today.getMonth() + 1);
      }

      const nextRenewalDateStr = nextDate.toISOString().split('T')[0];

      await api.put(`/api/subscriptions/${item.id}`, {
        status: 'active',
        next_renewal_date: nextRenewalDateStr,
      });

      setStatusMessage({
        type: 'success',
        text: `Moved "${item.name}" to Active Subscriptions! First renewal set to ${nextRenewalDateStr}.`,
      });

      await fetchConsideringSubscriptions();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to activate subscription:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to activate subscription.' });
    } finally {
      setActivatingId(null);
    }
  };

  const handleRemove = async (item: Subscription) => {
    if (window.confirm(`Are you sure you want to remove "${item.name}" from your wishlist?`)) {
      try {
        await api.delete(`/api/subscriptions/${item.id}`);
        setStatusMessage({ type: 'success', text: `Removed "${item.name}" from wishlist.` });
        await fetchConsideringSubscriptions();
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err: any) {
        console.error('Failed to remove item:', err);
        setStatusMessage({ type: 'error', text: err?.message || 'Failed to remove subscription.' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Wishlist & Pipeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              Considering ({items.length})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track subscriptions you are considering before subscribing. Analyze projected impact on monthly cashflow.
          </p>
        </div>

        <Button
          onClick={handleOpenAddForm}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          className="shadow-lg shadow-indigo-500/20"
        >
          Add to Wishlist
        </Button>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span className="text-xs sm:text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Monthly Projection Banner */}
      <div className="rounded-2xl relative overflow-hidden bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 border border-indigo-500/20 p-6 backdrop-blur-xl shadow-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300/80 block">
                Cashflow Impact Preview
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-2 mt-0.5">
                <span>
                  If added: +{currencySymbol}{totalMonthlyProjected.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs sm:text-sm text-slate-400 font-semibold">/ month</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:border-l sm:border-white/10 sm:pl-6 text-slate-300 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Yearly Projected</span>
              <span className="text-sm font-bold text-white">
                +{currencySymbol}{(totalMonthlyProjected * 12).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/yr
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Wishlist Items</span>
              <span className="text-sm font-bold text-white">{items.length} services</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Wishlist Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface-card/40 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <BookmarkCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Your Wishlist is Empty</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
              Thinking about trying a new streaming service, gym membership, or developer tool? Add it here to assess the cost impact before committing.
            </p>
          </div>
          <Button
            onClick={handleOpenAddForm}
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
          >
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const hasSplit = item.shares && item.shares.length > 0;
            const yourShare = item.your_share !== undefined && item.your_share !== null ? item.your_share : item.amount;

            return (
              <div
                key={item.id}
                className="group rounded-2xl glass-card border border-white/10 p-5 flex flex-col justify-between hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div>
                  {/* Card Header: Service name & Category badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:border-indigo-500/40 transition-colors">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasSplit && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>Split ({item.shares!.length})</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                        Wishlist
                      </span>
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-white">
                          {item.currency} {Number(yourShare).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/{item.billing_frequency}</span>
                      </div>

                      {hasSplit && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Total: <span className="line-through text-slate-500">{item.currency} {Number(item.amount).toLocaleString('en-IN')}</span>
                          {' • '}
                          <span className="text-cyan-300 font-medium">Your share</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                        Billing
                      </span>
                      <span className="text-xs font-semibold text-slate-300 capitalize">
                        {item.billing_frequency}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Split info */}
                  {item.notes && (
                    <p className="text-xs text-slate-400 mt-3 line-clamp-2 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                      {item.notes}
                    </p>
                  )}

                  {hasSplit && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.shares!.map((share) => (
                        <span
                          key={share.id || share.shared_with_name}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 border border-white/10 text-slate-300"
                        >
                          {share.shared_with_name}: {item.currency} {Number(share.share_amount).toLocaleString('en-IN')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditForm(item)}
                      title="Edit Wishlist Item"
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item)}
                      title="Remove from Wishlist"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    onClick={() => handleActivate(item)}
                    variant="primary"
                    size="sm"
                    isLoading={activatingId === item.id}
                    icon={<ArrowRightCircle className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold"
                  >
                    Add to Subscriptions
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Subscription Form Dialog */}
      <SubscriptionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSub(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={
          editingSub || ({
            name: '',
            amount: 0,
            currency: 'INR',
            billing_frequency: 'monthly',
            next_renewal_date: new Date().toISOString().split('T')[0],
            category: 'other',
            status: 'considering',
            is_trial: false,
          } as any)
        }
      />
    </div>
  );
}
