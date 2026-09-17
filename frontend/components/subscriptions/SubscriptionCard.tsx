'use client';

import React from 'react';
import { Calendar, AlertCircle, Edit2, Trash2, Tag, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate, relativeDate, daysUntil, monthlyCost } from '@/lib/utils/dateHelpers';
import { getCategoryMeta, getStatusMeta } from '@/lib/constants';

export interface Subscription {
  id: string;
  name: string;
  amount: number | string;
  currency: string;
  billing_frequency: string;
  next_renewal_date: string;
  category: string;
  status: string;
  is_trial: boolean;
  trial_end_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  tags?: string[];
  needs_review?: boolean;
  previous_amount?: number | string | null;
  price_increased?: boolean;
  price_delta?: number | string | null;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (sub: Subscription) => void;
  onDelete: (id: string) => void;
  onReviewed?: (id: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onEdit,
  onDelete,
  onReviewed,
}) => {
  const [isReviewing, setIsReviewing] = React.useState(false);
  const category = getCategoryMeta(subscription.category);
  const statusMeta = getStatusMeta(subscription.status);
  const days = daysUntil(subscription.next_renewal_date);
  const amountNum = typeof subscription.amount === 'string' ? parseFloat(subscription.amount) : subscription.amount;
  const mCost = monthlyCost(amountNum, subscription.billing_frequency);
  const deltaNum = subscription.price_delta ? Number(subscription.price_delta) : 0;
  const prevNum = subscription.previous_amount ? Number(subscription.previous_amount) : null;

  const isRenewalSoon = days >= 0 && days <= 3 && subscription.status === 'active';
  const isOverdue = days < 0 && subscription.status === 'active';

  const handleReview = async () => {
    setIsReviewing(true);
    try {
      const { api } = await import('@/lib/api');
      await api.post(`/api/subscriptions/${subscription.id}/review`);
      if (onReviewed) {
        onReviewed(subscription.id);
      }
    } catch (err) {
      console.error('Failed to mark reviewed:', err);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl glass-card border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
        isRenewalSoon
          ? 'border-amber-500/40 bg-amber-500/[0.03] shadow-lg shadow-amber-500/5'
          : 'border-white/10 hover:border-indigo-500/40'
      }`}
    >
      {/* Top Header: Category Emoji & Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-white/10 shadow-sm"
              style={{ backgroundColor: category.bgLight }}
            >
              {category.emoji}
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight group-hover:text-indigo-300 transition-colors">
                {subscription.name}
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {category.label}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeBg} ${statusMeta.textColor}`}
            >
              {statusMeta.label}
            </span>
            {subscription.is_trial && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Trial
              </span>
            )}
            {subscription.needs_review && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReview();
                }}
                disabled={isReviewing}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all flex items-center gap-1 shadow-sm"
                title="Click to mark as reviewed"
              >
                🔍 Review?
              </button>
            )}
          </div>
        </div>

        {/* Pricing row with Price Increase Badge */}
        <div className="my-3 pt-2 border-t border-white/5 flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white tracking-tight">
                {formatCurrency(amountNum, subscription.currency)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                /{subscription.billing_frequency}
              </span>
            </div>
            {prevNum !== null && subscription.price_increased && (
              <span className="text-[10px] text-slate-500">
                Was {formatCurrency(prevNum, subscription.currency)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {subscription.price_increased && deltaNum > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm">
                ↑ +{formatCurrency(deltaNum, subscription.currency)}/mo
              </span>
            )}
            {subscription.billing_frequency !== 'monthly' && (
              <span className="text-[11px] text-slate-400">
                ~{formatCurrency(mCost, subscription.currency)}/mo
              </span>
            )}
          </div>
        </div>

        {/* Next Renewal Date */}
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5 my-2">
          <Calendar className={`w-3.5 h-3.5 ${isRenewalSoon ? 'text-amber-400' : 'text-slate-400'}`} />
          <span>Next renewal:</span>
          <span className="font-semibold text-white ml-auto">
            {formatDate(subscription.next_renewal_date)}
          </span>
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
              isRenewalSoon
                ? 'bg-amber-500/20 text-amber-300'
                : isOverdue
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-slate-400'
            }`}
          >
            {relativeDate(subscription.next_renewal_date)}
          </span>
        </div>

        {/* Tags or Payment Method */}
        {(subscription.payment_method || (subscription.tags && subscription.tags.length > 0)) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {subscription.payment_method && (
              <span className="inline-flex items-center text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                💳 {subscription.payment_method}
              </span>
            )}
            {subscription.tags?.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Review alert banner if updated > 90 days ago */}
        {subscription.needs_review && (
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-yellow-300 bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span>Unreviewed for 90+ days</span>
            </div>
            <button
              onClick={handleReview}
              disabled={isReviewing}
              className="px-2 py-0.5 text-[10px] rounded font-medium bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 border border-yellow-500/30 transition-colors"
            >
              {isReviewing ? 'Saving...' : 'Reviewed'}
            </button>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(subscription)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Edit Subscription"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(subscription.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Cancel Subscription"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

