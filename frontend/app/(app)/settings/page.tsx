'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  User,
  Settings as SettingsIcon,
  KeyRound,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  ExternalLink,
  Bell,
  BellRing,
  BellOff,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface SettingsData {
  currency: string;
  reminder_days: number;
  theme: string;
  notifications_enabled: boolean;
  has_own_key: boolean;
  ai_imports_used: number;
  ai_imports_limit: number;
}

export default function SettingsPage() {
  const { user } = useAuth();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // Prefs form
  const [currency, setCurrency] = useState('INR');
  const [reminderDays, setReminderDays] = useState(3);
  const [theme, setTheme] = useState('dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Gemini key form
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);

  // Web Push Notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            setIsPushSubscribed(!!sub);
          }).catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  const handleTogglePush = async () => {
    if (!pushSupported) {
      alert('Browser Push Notifications are not supported in your current browser.');
      return;
    }

    setIsPushLoading(true);
    setPushMessage(null);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (isPushSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          try {
            await api.post('/api/notifications/unsubscribe', { endpoint });
          } catch (e) {
            console.warn('Backend unsubscribe warning:', e);
          }
          await sub.unsubscribe();
        }
        setIsPushSubscribed(false);
        setPushMessage({ type: 'success', text: 'Browser push notifications have been disabled.' });
      } else {
        const perm = await Notification.requestPermission();
        setPushPermission(perm);
        if (perm !== 'granted') {
          throw new Error('Notification permission was not granted by your browser.');
        }

        const vapidRes = await api.get<{ public_key: string }>('/api/notifications/vapid-public-key');
        if (!vapidRes.public_key) {
          throw new Error('Server did not return a valid VAPID public key.');
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidRes.public_key);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        const subJson = sub.toJSON();
        await api.post('/api/notifications/subscribe', {
          endpoint: sub.endpoint,
          p256dh_key: subJson.keys?.p256dh || '',
          auth_key: subJson.keys?.auth || '',
        });

        setIsPushSubscribed(true);
        setPushMessage({
          type: 'success',
          text: 'Push notifications activated! You will receive alerts 24 hours before your renewals.',
        });
      }
    } catch (err: any) {
      console.error('Failed to toggle push notifications:', err);
      setPushMessage({
        type: 'error',
        text: err?.message || 'Failed to update push subscription.',
      });
    } finally {
      setIsPushLoading(false);
      setTimeout(() => setPushMessage(null), 5000);
    }
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<SettingsData>('/api/settings/');
      setSettings(data);
      setCurrency(data.currency || 'INR');
      setReminderDays(data.reminder_days || 3);
      setTheme(data.theme || 'dark');
      setNotificationsEnabled(data.notifications_enabled ?? true);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefsSuccess(false);

    try {
      const updated = await api.put<SettingsData>('/api/settings/', {
        currency,
        reminder_days: Number(reminderDays),
        theme,
        notifications_enabled: notificationsEnabled,
      });
      setSettings(updated);
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setKeySuccess(null);

    if (!geminiKeyInput.trim()) {
      setKeyError('Please enter a valid Gemini API key.');
      return;
    }

    setIsSavingKey(true);
    try {
      const res = await api.post<{ has_own_key: boolean }>('/api/settings/gemini-key', {
        api_key: geminiKeyInput.trim(),
      });
      setGeminiKeyInput('');
      setKeySuccess('Gemini API key encrypted and activated successfully!');
      fetchSettings();
    } catch (err: any) {
      setKeyError(err?.message || 'Failed to save Gemini key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (window.confirm('Remove your personal Gemini API key and revert to standard tier?')) {
      try {
        await api.delete('/api/settings/gemini-key');
        setKeySuccess('Custom Gemini key removed.');
        fetchSettings();
      } catch (err: any) {
        setKeyError(err?.message || 'Failed to remove Gemini key.');
      }
    }
  };

  // Data Export functions
  const handleExportJson = async () => {
    try {
      const subscriptions = await api.get<any[]>('/api/subscriptions/');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(subscriptions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `house_of_subscriptions_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export JSON');
    }
  };

  const handleExportCsv = async () => {
    try {
      const subscriptions = await api.get<any[]>('/api/subscriptions/');
      if (subscriptions.length === 0) {
        alert('No subscriptions to export.');
        return;
      }

      const headers = ['name', 'amount', 'currency', 'billing_frequency', 'next_renewal_date', 'category', 'status', 'is_trial', 'payment_method', 'notes'];
      const rows = subscriptions.map((s) => [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        s.amount,
        `"${s.currency}"`,
        `"${s.billing_frequency}"`,
        `"${s.next_renewal_date}"`,
        `"${s.category}"`,
        `"${s.status}"`,
        s.is_trial,
        `"${(s.payment_method || '').replace(/"/g, '""')}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', encodeURI(csvContent));
      downloadAnchor.setAttribute('download', `house_of_subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Customize currency displays, alert thresholds, encryption keys, and export your data.
          </p>
        </div>
        <Link href="/settings/privacy">
          <Button variant="secondary" size="md" className="gap-2">
            <Shield className="w-4 h-4" />
            Privacy & Data
          </Button>
        </Link>
      </div>

      {/* SECTION 1: PROFILE */}
      <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Account Profile</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your identity and authentication provider</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Display Name
            </span>
            <span className="text-sm font-bold text-white mt-1 block">
              {user?.display_name || 'Member'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Email Address
            </span>
            <span className="text-sm font-bold text-white mt-1 block truncate">
              {user?.email}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Auth Provider
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 mt-1 inline-block uppercase">
              {user?.auth_provider || 'Email'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PREFERENCES */}
      <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">General Preferences</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize currency and renewal reminders</p>
            </div>
          </div>

          {prefsSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Default Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                { value: 'USD', label: 'USD ($ - US Dollar)' },
                { value: 'EUR', label: 'EUR (€ - Euro)' },
                { value: 'GBP', label: 'GBP (£ - British Pound)' },
              ]}
            />

            <Select
              label="Renewal Alert Threshold"
              value={String(reminderDays)}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              options={[
                { value: '1', label: '1 day in advance' },
                { value: '2', label: '2 days in advance' },
                { value: '3', label: '3 days in advance (Recommended)' },
                { value: '5', label: '5 days in advance' },
                { value: '7', label: '7 days in advance' },
              ]}
            />
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Banner Notifications</span>
              <span className="text-[11px] text-slate-400">
                Display top banner alert when subscriptions are scheduled for renewal
              </span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="md" isLoading={isSavingPrefs}>
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION: BROWSER PUSH NOTIFICATIONS */}
      <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Browser Push Notifications</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Receive native desktop and mobile renewal reminders 24h in advance
              </p>
            </div>
          </div>

          <div>
            {isPushSubscribed ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Subscribed</span>
              </span>
            ) : pushPermission === 'denied' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Blocked in Browser</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-400">
                Disabled
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Stay on top of charges before they hit your bank card. When enabled, your browser will securely register a web push token to receive renewal notifications even when House of Subscriptions isn&apos;t open.
        </p>

        {pushMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              pushMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {pushMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{pushMessage.text}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-white block">Renewal Alert Push Channel</span>
            <span className="text-[11px] text-slate-400">
              {isPushSubscribed
                ? 'Active • Web Push notifications will trigger 24h prior to subscription renewals'
                : 'Inactive • Click Enable to grant browser permission and receive instant alerts'}
            </span>
          </div>

          <Button
            variant={isPushSubscribed ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleTogglePush}
            isLoading={isPushLoading}
            icon={isPushSubscribed ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
          >
            {isPushSubscribed ? 'Disable Push Alerts' : 'Enable Push Notifications'}
          </Button>
        </div>
      </div>

      {/* SECTION 3: AI IMPORT KEY (BYOK) */}
      <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                AI Statement Key (BYOK)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bring Your Own Key for unlimited bank statement & PDF extractions
              </p>
            </div>
          </div>

          {settings?.has_own_key ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Custom Key Active</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300">
              Free Tier ({10 - (settings?.ai_imports_used || 0)}/10 free)
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          We provide 10 free AI extractions per account. You can connect your personal Google Gemini API key to unlock unlimited extractions. Your key is encrypted using{' '}
          <strong className="text-white">Fernet 128-bit AES encryption</strong> in our database and is never exposed to the client.
        </p>

        {keySuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{keySuccess}</span>
          </div>
        )}

        {keyError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{keyError}</span>
          </div>
        )}

        {settings?.has_own_key ? (
          <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                Personal Gemini Key Configured
              </span>
              <span className="text-[11px] text-slate-400">
                Encrypted with Fernet • Unlimited statement parsing enabled
              </span>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveGeminiKey}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Remove Key
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSaveGeminiKey} className="space-y-3">
            <Input
              label="Gemini API Key"
              type="password"
              placeholder="AIzaSy..."
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              helperText="Get your free API key from Google AI Studio"
              rightElement={
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium hover:underline"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              }
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingKey}
                icon={<Sparkles className="w-4 h-4 text-amber-300" />}
              >
                Save & Encrypt Key
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION 4: DATA EXPORT */}
      <div className="rounded-2xl glass-card border border-white/10 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Data Export & Backup</h3>
            <p className="text-xs text-slate-400 mt-0.5">Download your subscription history anytime</p>
          </div>
        </div>

        <p className="text-xs text-slate-300">
          House of Subscriptions is privacy-first. You own all your data. Export your entire catalog in open, portable formats with a single click.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export as JSON
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export as CSV Spreadsheet
          </Button>
        </div>
      </div>
    </div>
  );
}
