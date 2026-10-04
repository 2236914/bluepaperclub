import { Check, Copy, PackageCheck, Printer, TriangleAlert, Inbox } from 'lucide-react';
import type { Order, OrderStatus } from '../api';
import { Icon, toast, Button } from '../design/components';
import { COLOR_LABEL, PAPER_LABEL, SIDES_LABEL, STATUS_LABEL, formatBytes, formatDateTime, plural } from '../lib/format';
import { FileBadge } from './FileBadge';

/** Paper · Color · Sides · Copies as a definition list. */
export function SettingsList({ order, columns = 4 }: { order: Pick<Order, 'paper' | 'color' | 'sides' | 'copies'>; columns?: 2 | 4 }) {
  return (
    <dl className={columns === 4 ? 'pp-dl pp-dl-4' : 'pp-dl'}>
      <div><dt className="t-label">Paper</dt><dd>{PAPER_LABEL[order.paper]}</dd></div>
      <div><dt className="t-label">Color</dt><dd>{COLOR_LABEL[order.color]}</dd></div>
      <div><dt className="t-label">Sides</dt><dd>{SIDES_LABEL[order.sides]}</dd></div>
      <div><dt className="t-label">Copies</dt><dd>{order.copies}</dd></div>
    </dl>
  );
}

export function fileLine(f: Order['files'][number]): string {
  if (f.conversion === 'pending') return `Converting to PDF · ${formatBytes(f.sizeBytes)}`;
  if (f.conversion === 'failed') return `Couldn't convert · ${formatBytes(f.sizeBytes)}`;
  return f.pages != null ? `${plural(f.pages, 'page')} · ${formatBytes(f.sizeBytes)}` : formatBytes(f.sizeBytes);
}

/** Read-only list of an order's files (customer screens). */
export function FileListReadOnly({ files }: { files: Order['files'] }) {
  return (
    <ul className="pp-file-list" aria-label="Files">
      {files.map((f) => (
        <li key={f.id} className="pp-file-row">
          <FileBadge name={f.originalName} />
          <div className="pp-file-info">
            <span className="pp-file-name" title={f.originalName}>{f.originalName}</span>
            <span className="t-meta">{fileLine(f)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: a hidden textarea and execCommand.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function CopyCodeButton({ code, size = 'md' }: { code: string; size?: 'md' | 'lg' }) {
  return (
    <Button
      size={size}
      icon={Copy}
      onClick={async () => {
        const ok = await copyText(code);
        if (ok) toast(`Copied ${code}`, { icon: Check });
        else toast.error('Could not copy. Select the order ID and copy it yourself.');
      }}
    >
      Copy order ID
    </Button>
  );
}

/* ---------- Customer-facing progress: Received → Printing → Ready → Claimed ---------- */

const STEP_ORDER: OrderStatus[] = ['received', 'printing', 'ready', 'claimed'];
const STEP_ICON = { received: Inbox, printing: Printer, ready: Check, claimed: PackageCheck } as const;

export function TrackingSteps({ order, phone }: { order: Order; phone: string }) {
  const events = [...order.events].reverse();
  const lastAt = (s: OrderStatus) => events.find((e) => e.type === 'status_change' && e.toStatus === s)?.createdAt;
  const issue = order.status === 'file_issue';
  const issueMessage = issue ? events.find((e) => e.toStatus === 'file_issue')?.message : undefined;
  // A file issue pauses the order where it was found: before printing, or mid-print.
  const current = issue ? (lastAt('printing') ? 1 : 0) : STEP_ORDER.indexOf(order.status);

  const text: Record<string, { done: string; current: string; todo: string }> = {
    received: { done: 'We have your files.', current: 'We have your files and will print them soon.', todo: '' },
    printing: { done: 'Printed.', current: 'Your order is on the printer.', todo: "We'll start soon." },
    ready: {
      done: 'Your order was ready at the counter.',
      current: 'Come to the counter with your order ID. You pay when you claim.',
      todo: "We'll email you as soon as it's ready.",
    },
    claimed: { done: 'Picked up. Thanks for printing with us.', current: '', todo: '' },
  };

  return (
    <ol className="pp-steps" aria-label="Order progress">
      {STEP_ORDER.map((s, i) => {
        const state: 'done' | 'current' | 'todo' =
          order.status === 'claimed' || i < current ? 'done' : i === current ? 'current' : 'todo';
        const flagged = issue && i === current;
        const at = state === 'todo' ? undefined : lastAt(s);
        return (
          <li key={s} className={`pp-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <div className="pp-step-rail">
              <span className="pp-step-mark">
                <Icon icon={flagged ? TriangleAlert : state === 'done' ? Check : STEP_ICON[s as keyof typeof STEP_ICON]} />
              </span>
              {i < STEP_ORDER.length - 1 && <span className="pp-step-line" />}
            </div>
            <div className="pp-step-body">
              <p className="pp-step-title">
                {STATUS_LABEL[s]}
                {state === 'current' && !flagged && <span className="t-meta"> · Now</span>}
              </p>
              <p className="t-meta">{at ? formatDateTime(at) : state === 'todo' ? 'Not yet' : ''}</p>
              {!flagged && text[s][state] && <p className="t-ink-2">{text[s][state]}</p>}
              {flagged && (
                <div className="pp-issue" role="status">
                  <p className="pp-step-title"><Icon icon={TriangleAlert} /> On hold: a problem with a file</p>
                  {issueMessage && <p>{issueMessage}</p>}
                  <p className="t-small">Reply to our email or call {phone}. We'll continue as soon as it's fixed.</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
