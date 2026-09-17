export function daysUntil(targetDate: string | Date): number {
  const target = new Date(targetDate);
  const now = new Date();
  
  // Set both to midnight for pure day comparison
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function relativeDate(dateStr: string | Date): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < -1) return `${Math.abs(days)} days ago`;
  if (days <= 7) return `in ${days} days`;
  if (days <= 30) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function monthlyCost(amount: number, frequency: string): number {
  const factors: Record<string, number> = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  };
  return amount * (factors[frequency.toLowerCase()] || 1);
}

export function annualizeCost(amount: number, frequency: string): number {
  const factors: Record<string, number> = {
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    yearly: 1,
  };
  return amount * (factors[frequency.toLowerCase()] || 12);
}

export function getNextRenewal(dateStr: string | Date, cycle: string): Date {
  const date = new Date(dateStr);
  const next = new Date(date);
  
  switch (cycle.toLowerCase()) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'monthly':
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}
