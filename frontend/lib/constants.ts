export interface CategoryOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgLight: string;
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#EC4899', bgLight: 'rgba(236, 72, 153, 0.15)' },
  { id: 'music', label: 'Music & Audio', emoji: '🎵', color: '#10B981', bgLight: 'rgba(16, 185, 129, 0.15)' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', color: '#8B5CF6', bgLight: 'rgba(139, 92, 246, 0.15)' },
  { id: 'software', label: 'Software & Dev', emoji: '💻', color: '#3B82F6', bgLight: 'rgba(59, 130, 246, 0.15)' },
  { id: 'ai', label: 'AI & Machine Learning', emoji: '🤖', color: '#6366F1', bgLight: 'rgba(99, 102, 241, 0.15)' },
  { id: 'cloud', label: 'Cloud & Storage', emoji: '☁️', color: '#06B6D4', bgLight: 'rgba(6, 182, 212, 0.15)' },
  { id: 'fitness', label: 'Fitness & Health', emoji: '💪', color: '#F59E0B', bgLight: 'rgba(245, 158, 11, 0.15)' },
  { id: 'education', label: 'Education & Learning', emoji: '📚', color: '#14B8A6', bgLight: 'rgba(20, 184, 166, 0.15)' },
  { id: 'news', label: 'News & Media', emoji: '📰', color: '#EF4444', bgLight: 'rgba(239, 68, 68, 0.15)' },
  { id: 'food', label: 'Food & Delivery', emoji: '🍔', color: '#F97316', bgLight: 'rgba(249, 115, 22, 0.15)' },
  { id: 'utilities', label: 'Utilities & Bills', emoji: '⚡', color: '#EAB308', bgLight: 'rgba(234, 179, 8, 0.15)' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#64748B', bgLight: 'rgba(100, 116, 139, 0.15)' },
];

export interface BillingCycleOption {
  id: string;
  label: string;
  months: number;
}

export const BILLING_CYCLES: BillingCycleOption[] = [
  { id: 'weekly', label: 'Weekly', months: 52 / 12 },
  { id: 'monthly', label: 'Monthly', months: 1 },
  { id: 'quarterly', label: 'Quarterly', months: 3 },
  { id: 'yearly', label: 'Yearly', months: 12 },
];

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  textColor: string;
  badgeBg: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'active', label: 'Active', color: '#22C55E', textColor: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'trial', label: 'Trial', color: '#EAB308', textColor: 'text-amber-400', badgeBg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'paused', label: 'Paused', color: '#94A3B8', textColor: 'text-slate-400', badgeBg: 'bg-slate-500/10 border-slate-500/30' },
  { id: 'cancelled', label: 'Cancelled', color: '#EF4444', textColor: 'text-rose-400', badgeBg: 'bg-rose-500/10 border-rose-500/30' },
  { id: 'considering', label: 'Considering', color: '#A855F7', textColor: 'text-purple-400', badgeBg: 'bg-purple-500/10 border-purple-500/30' },
];

export const getCategoryMeta = (categoryId: string) => {
  return CATEGORIES.find(c => c.id.toLowerCase() === categoryId.toLowerCase()) || {
    id: categoryId,
    label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    emoji: '📦',
    color: '#64748B',
    bgLight: 'rgba(100, 116, 139, 0.15)',
  };
};

export const getStatusMeta = (statusId: string) => {
  return STATUS_OPTIONS.find(s => s.id === statusId) || STATUS_OPTIONS[0];
};
