/*
 * Fills an email template. {{name}} is escaped text; {{{name}}} is trusted HTML
 * built here (the files table). The Edge Function will do the same on the server.
 */
import type { Order, ShopSettings } from '../api/types';
import { COLOR_LABEL, PAPER_LABEL, SIDES_LABEL, filesSummary, firstName, formatDateTime, plural, settingsSummary } from '../lib/format';
import receivedHtml from './received.html?raw';
import readyHtml from './ready.html?raw';
import fileIssueHtml from './file-issue.html?raw';

export type EmailTemplate = 'order_received' | 'ready_for_pickup' | 'file_issue';

export const TEMPLATES: Record<EmailTemplate, { html: string; subject: (o: Order) => string; label: string }> = {
  order_received: { html: receivedHtml, subject: (o) => `Order ${o.code} received`, label: 'Order received' },
  ready_for_pickup: { html: readyHtml, subject: (o) => `Order ${o.code} is ready for pickup`, label: 'Ready for pickup' },
  file_issue: { html: fileIssueHtml, subject: (o) => `Order ${o.code}: a problem with a file`, label: 'File issue' },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function fillTemplate(html: string, text: Record<string, string>, raw: Record<string, string> = {}): string {
  return html
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k: string) => raw[k] ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => escapeHtml(text[k] ?? ''));
}

export function renderEmail(template: EmailTemplate, order: Order, shop: ShopSettings, opts: { trackingUrl: string; issueMessage?: string }): { subject: string; html: string } {
  const label = 'padding:8px 0;border-bottom:1px solid #d5d9e3;width:40%;vertical-align:top;font-family:\'IBM Plex Mono\',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;';
  const cell = 'padding:8px 0;border-bottom:1px solid #d5d9e3;';
  const filesRows = `<tr><td style="${label}">Files</td><td style="${cell}">${order.files
    .map((f) => `${escapeHtml(f.originalName)}${f.pages != null ? ` <span style="color:#5e657b;">(${plural(f.pages, 'page')})</span>` : ''}`)
    .join('<br>')}</td></tr>`;
  const text = {
    order_code: order.code,
    customer_first_name: firstName(order.customerName),
    shop_name: shop.name,
    shop_address: shop.address,
    shop_hours: shop.hours,
    shop_phone: shop.phone,
    tracking_url: opts.trackingUrl,
    files_summary: filesSummary(order),
    settings_summary: settingsSummary(order, true),
    paper: PAPER_LABEL[order.paper],
    color: COLOR_LABEL[order.color],
    sides: SIDES_LABEL[order.sides],
    copies: String(order.copies),
    submitted_at: formatDateTime(order.createdAt),
    issue_message: opts.issueMessage ?? '',
    unclaimed_days: String(shop.unclaimedDays),
  };
  const t = TEMPLATES[template];
  return { subject: t.subject(order), html: fillTemplate(t.html, text, { files_rows: filesRows }) };
}
