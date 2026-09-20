'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  Trash2,
  Mail,
  Building,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EmailAccount {
  id: string;
  email_address: string;
  connected_at: string;
  last_scanned_at: string | null;
}

interface BankConnection {
  id: string;
  institution_name: string;
  connected_at: string;
}

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { features, loading: featuresLoading } = useFeatures();

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!featuresLoading) {
      if (features.email_scan) fetchEmailAccounts();
      if (features.bank_link) fetchBankConnections();
    }
  }, [featuresLoading, features]);

  const fetchEmailAccounts = async () => {
    try {
      const res = await api.get<EmailAccount[]>('/api/email/accounts');
      setEmailAccounts(res);
    } catch (e) {
      console.error('Failed to fetch email accounts', e);
    }
  };

  const fetchBankConnections = async () => {
    try {
      const res = await api.get<BankConnection[]>('/api/plaid/connections');
      setBankConnections(res);
    } catch (e) {
      console.error('Failed to fetch bank connections', e);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete your account, all subscriptions, and remove all associated data. This action CANNOT be undone. Are you sure you want to proceed?')) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete('/api/auth/delete-account');
      await logout();
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const handleDisconnectEmail = async (id: string) => {
    if (!window.confirm('Disconnect this email account?')) return;
    try {
      await api.delete(`/api/email/accounts/${id}`);
      fetchEmailAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDisconnectBank = async (id: string) => {
    if (!window.confirm('Disconnect this bank account?')) return;
    try {
      await api.delete(`/api/plaid/connections/${id}`);
      fetchBankConnections();
    } catch (e) {
      console.error(e);
    }
  };

  if (featuresLoading) {
    return <div className="text-white text-sm">Loading privacy settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Privacy & Integrations
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your connected accounts, data integrations, and account deletion.
        </p>
      </div>

      {/* EMAIL SCANNING */}
      {features.email_scan && (
        <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Gmail Inbox Scanning</h3>
              <p className="text-xs text-slate-400 mt-0.5">Allow our AI to securely scan for subscription receipts.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {emailAccounts.length === 0 ? (
              <p className="text-sm text-slate-400">No email accounts connected.</p>
            ) : (
              emailAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">{acc.email_address}</p>
                    <p className="text-[11px] text-slate-400">Connected: {new Date(acc.connected_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDisconnectEmail(acc.id)}>Disconnect</Button>
                </div>
              ))
            )}
            
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={() => alert('Gmail OAuth flow placeholder')}>
                Connect Gmail Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BANK LINKING */}
      {features.bank_link && (
        <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Bank Accounts (Plaid)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Securely link your bank to track subscription charges.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {bankConnections.length === 0 ? (
              <p className="text-sm text-slate-400">No bank accounts connected.</p>
            ) : (
              bankConnections.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-white">{acc.institution_name}</p>
                    <p className="text-[11px] text-slate-400">Connected: {new Date(acc.connected_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDisconnectBank(acc.id)}>Disconnect</Button>
                </div>
              ))
            )}
            
            <div className="pt-2">
              <Button variant="secondary" size="sm" onClick={() => alert('Plaid Link flow placeholder')}>
                Link Bank Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DANGER ZONE */}
      <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-500 tracking-tight">Danger Zone</h3>
            <p className="text-xs text-rose-400/80 mt-0.5">Permanently delete all your data.</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-300 leading-relaxed">
          Deleting your account will immediately remove all your personal data, subscription records, connected accounts, and configuration. <strong>This action cannot be undone.</strong>
        </p>

        {deleteError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5" />
            <p className="text-sm text-rose-400 font-medium">{deleteError}</p>
          </div>
        )}

        <div className="pt-2">
          <Button 
            variant="danger" 
            size="md" 
            onClick={handleDeleteAccount}
            isLoading={isDeleting}
            className="gap-2 font-bold"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </Button>
        </div>
      </div>
    </div>
  );
}
