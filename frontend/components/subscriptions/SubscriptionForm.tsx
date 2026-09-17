'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CATEGORIES, BILLING_CYCLES, STATUS_OPTIONS } from '@/lib/constants';
import { Subscription } from './SubscriptionCard';
import { Sparkles, Calendar, DollarSign } from 'lucide-react';

interface SubscriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
  initialData?: Subscription | null;
}

const COMMON_SUGGESTIONS = [
  { name: 'Netflix', category: 'entertainment', amount: 649, frequency: 'monthly' },
  { name: 'Spotify', category: 'music', amount: 119, frequency: 'monthly' },
  { name: 'YouTube Premium', category: 'entertainment', amount: 129, frequency: 'monthly' },
  { name: 'Amazon Prime', category: 'entertainment', amount: 299, frequency: 'monthly' },
  { name: 'ChatGPT Plus', category: 'ai', amount: 1650, frequency: 'monthly' },
  { name: 'Claude Pro', category: 'ai', amount: 1650, frequency: 'monthly' },
  { name: 'GitHub Copilot', category: 'software', amount: 830, frequency: 'monthly' },
  { name: 'Google One', category: 'cloud', amount: 130, frequency: 'monthly' },
  { name: 'iCloud+', category: 'cloud', amount: 75, frequency: 'monthly' },
];

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [category, setCategory] = useState('entertainment');
  const [status, setStatus] = useState('active');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setAmount(String(initialData.amount) || '');
      setCurrency(initialData.currency || 'INR');
      setBillingFrequency(initialData.billing_frequency || 'monthly');
      setNextRenewalDate(initialData.next_renewal_date || '');
      setCategory(initialData.category || 'other');
      setStatus(initialData.status || 'active');
      setIsTrial(Boolean(initialData.is_trial));
      setTrialEndDate(initialData.trial_end_date || '');
      setPaymentMethod(initialData.payment_method || '');
      setNotes(initialData.notes || '');
      setTagsInput(initialData.tags ? initialData.tags.join(', ') : '');
    } else {
      // Default to today + 1 month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const formattedDate = nextMonth.toISOString().split('T')[0];

      setName('');
      setAmount('');
      setCurrency('INR');
      setBillingFrequency('monthly');
      setNextRenewalDate(formattedDate);
      setCategory('entertainment');
      setStatus('active');
      setIsTrial(false);
      setTrialEndDate('');
      setPaymentMethod('');
      setNotes('');
      setTagsInput('');
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSuggestionClick = (item: typeof COMMON_SUGGESTIONS[0]) => {
    setName(item.name);
    setCategory(item.category);
    setAmount(String(item.amount));
    setBillingFrequency(item.frequency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Subscription name is required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!nextRenewalDate) {
      setError('Next renewal date is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      amount: parsedAmount,
      currency,
      billing_frequency: billingFrequency,
      next_renewal_date: nextRenewalDate,
      category,
      status,
      is_trial: isTrial,
      trial_end_date: isTrial && trialEndDate ? trialEndDate : null,
      payment_method: paymentMethod.trim() || null,
      notes: notes.trim() || null,
      tags,
    };

    setIsLoading(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save subscription.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Subscription' : 'Add New Subscription'}
      description={
        isEditing
          ? 'Update details for this recurring subscription'
          : 'Track a new subscription, trial, or recurring bill'
      }
      maxWidth="lg"
    >
      {!isEditing && (
        <div className="mb-4">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick Suggestions
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SUGGESTIONS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSuggestionClick(item)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Service Name *"
            placeholder="e.g. Netflix, Spotify"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({
              value: c.id,
              label: `${c.emoji} ${c.label}`,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Amount *"
            type="number"
            step="0.01"
            placeholder="649.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'INR', label: 'INR (₹)' },
              { value: 'USD', label: 'USD ($)' },
              { value: 'EUR', label: 'EUR (€)' },
              { value: 'GBP', label: 'GBP (£)' },
            ]}
          />

          <Select
            label="Frequency"
            value={billingFrequency}
            onChange={(e) => setBillingFrequency(e.target.value)}
            options={BILLING_CYCLES.map((b) => ({
              value: b.id,
              label: b.label,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Next Renewal Date *"
            type="date"
            value={nextRenewalDate}
            onChange={(e) => setNextRenewalDate(e.target.value)}
            required
          />

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS.map((s) => ({
              value: s.id,
              label: s.label,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Payment Method"
            placeholder="e.g. HDFC Credit Card, UPI"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />

          <Input
            label="Tags (comma separated)"
            placeholder="personal, work, entertainment"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {/* Free trial toggle */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200">
              Is this a Free Trial?
            </span>
            <input
              type="checkbox"
              checked={isTrial}
              onChange={(e) => setIsTrial(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          {isTrial && (
            <Input
              label="Trial End Date"
              type="date"
              value={trialEndDate}
              onChange={(e) => setTrialEndDate(e.target.value)}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Add Subscription'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
