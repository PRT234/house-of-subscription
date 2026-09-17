'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Subscription } from '@/components/subscriptions/SubscriptionCard';
import { SubscriptionGrid } from '@/components/subscriptions/SubscriptionGrid';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Subscription[]>('/api/subscriptions/');
      setSubscriptions(data);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCreateOrUpdate = async (formData: any) => {
    if (editingSub) {
      await api.put(`/api/subscriptions/${editingSub.id}`, formData);
    } else {
      await api.post('/api/subscriptions/', formData);
    }
    await fetchSubscriptions();
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await api.delete(`/api/subscriptions/${id}`);
        await fetchSubscriptions();
      } catch (err) {
        console.error('Failed to delete subscription:', err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingSub(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Subscriptions Catalog
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage, edit, filter, and audit all active and past recurring subscriptions.
        </p>
      </div>

      <SubscriptionGrid
        subscriptions={subscriptions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNew={handleAddNew}
        onRefresh={fetchSubscriptions}
      />

      <SubscriptionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSub(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingSub}
      />
    </div>
  );
}
