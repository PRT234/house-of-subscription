export function formatCurrency(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';

  const locale = currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num);
  } catch {
    // Fallback if invalid currency code
    return `${currency.toUpperCase()} ${num.toFixed(2)}`;
  }
}
