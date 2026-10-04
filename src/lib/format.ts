import type { ColorMode, Order, OrderStatus, PaperSize, Sides } from '../api/types';

export const PAPER_LABEL: Record<PaperSize, string> = { short: 'Short', a4: 'A4', long: 'Long' };
export const PAPER_HINT: Record<PaperSize, string> = {
  short: '8.5 × 11 in',
  a4: '210 × 297 mm',
  long: '8.5 × 13 in',
};
export const COLOR_LABEL: Record<ColorMode, string> = { bw: 'Black and white', color: 'Colored' };
export const COLOR_SHORT: Record<ColorMode, string> = { bw: 'B&W', color: 'Colored' };
export const SIDES_LABEL: Record<Sides, string> = { one: 'One-sided', two: 'Two-sided' };

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  printing: 'Printing',
  ready: 'Ready for pickup',
  claimed: 'Claimed',
  file_issue: 'File issue',
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const timeFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const longDayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso)).replace(/\s?(am|pm)$/i, (m) => m.toUpperCase());
}

/** "4 Oct · 2:41 PM" */
export function formatDateTime(iso: string): string {
  return `${dayFmt.format(new Date(iso))} · ${formatTime(iso)}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function isToday(iso: string, now = new Date()): boolean {
  return startOfDay(new Date(iso)) === startOfDay(now);
}

/** "Today · 2:41 PM", "Yesterday · 9:05 AM", else "2 Oct · 4:10 PM" */
export function formatWhen(iso: string, now = new Date()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (diffDays === 0) return `Today · ${formatTime(iso)}`;
  if (diffDays === 1) return `Yesterday · ${formatTime(iso)}`;
  return formatDateTime(iso);
}

/** "Sunday 4 Oct" */
export function formatLongDay(d = new Date()): string {
  return longDayFmt.format(d).replace(',', '');
}

/** "1 h 12 min", "8 min", "just now" */
export function formatDuration(fromIso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return plural(d, 'day');
}

export function totalPages(order: Pick<Order, 'files'>): number | null {
  let sum = 0;
  for (const f of order.files) {
    if (f.pages == null) return null;
    sum += f.pages;
  }
  return sum;
}

/** "3 files · 51 pages" (pages left out while a Word file is converting) */
export function filesSummary(order: Pick<Order, 'files'>): string {
  const pages = totalPages(order);
  const files = plural(order.files.length, 'file');
  return pages == null ? files : `${files} · ${plural(pages, 'page')}`;
}

/** "Long · B&W · Two-sided · 2 copies" */
export function settingsSummary(o: Pick<Order, 'paper' | 'color' | 'sides' | 'copies'>, long = false): string {
  const parts = [PAPER_LABEL[o.paper], long ? COLOR_LABEL[o.color] : COLOR_SHORT[o.color]];
  if (o.sides === 'two' || long) parts.push(SIDES_LABEL[o.sides]);
  parts.push(plural(o.copies, 'copy', 'copies'));
  return parts.join(' · ');
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
