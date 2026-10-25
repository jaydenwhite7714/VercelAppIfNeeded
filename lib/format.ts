import { CURRENCIES, type ChangeOrder, type Currency } from './types';

export function currencySymbol(currency: Currency): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$';
}

export function money(amount: number, currency: Currency, opts: { compact?: boolean; cents?: boolean } = {}): string {
  const { compact = false, cents = false } = opts;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
      notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${Math.round(amount).toLocaleString('en-US')}`;
  }
}

export function hoursLabel(hours: number): string {
  if (hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}

export function formatDate(ts: number | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof ts === 'string' ? new Date(`${ts}T12:00:00`) : new Date(ts);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts }).format(date);
}

export function formatShortDate(ts: number): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(ts));
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ts);
}

export function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfMonth(ts = Date.now()): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function changeOrderTotal(order: Pick<ChangeOrder, 'items'>): number {
  return order.items.reduce((sum, item) => sum + item.amount, 0);
}

export function addBusinessDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
