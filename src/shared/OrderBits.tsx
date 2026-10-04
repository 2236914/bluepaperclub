import { Check, Copy, PackageCheck, Printer, TriangleAlert, Inbox } from 'lucide-react';
import type { Order, OrderStatus } from '../api';
import { Icon, toast, Button } from '../design/components';
import { DEFAULT_LANG, makeFormat, useI18n, type Format } from '../i18n';
import { MESSAGES } from '../i18n/messages';
import { FileBadge } from './FileBadge';

/** Paper · Color · Sides · Copies as a definition list. */
export function SettingsList({ order, columns = 4 }: { order: Pick<Order, 'paper' | 'color' | 'sides' | 'copies'>; columns?: 2 | 4 }) {
  const { m } = useI18n();
  const c = m.common;
  return (
    <dl className={columns === 4 ? 'pp-dl pp-dl-4' : 'pp-dl'}>
      <div><dt className="t-label">{c.labels.paper}</dt><dd>{c.paper[order.paper]}</dd></div>
      <div><dt className="t-label">{c.labels.color}</dt><dd>{c.color[order.color]}</dd></div>
      <div><dt className="t-label">{c.labels.sides}</dt><dd>{c.sides[order.sides]}</dd></div>
      <div><dt className="t-label">{c.labels.copies}</dt><dd>{order.copies}</dd></div>
    </dl>
  );
}

const defaultFmt = makeFormat(DEFAULT_LANG, MESSAGES[DEFAULT_LANG]);

/**
 * "48 pahina · 3.4 MB", or the conversion state for Word files.
 * @deprecated Use `fmt.fileLine(file)` from useI18n(), which follows the chosen language.
 * Without `fmt` this answers in the default language (Filipino).
 */
export function fileLine(f: Order['files'][number], fmt: Format = defaultFmt): string {
  return fmt.fileLine(f);
}

/** Read-only list of an order's files (customer screens). */
export function FileListReadOnly({ files }: { files: Order['files'] }) {
  const { m, fmt } = useI18n();
  return (
    <ul className="pp-file-list" aria-label={m.customer.bits.filesLabel}>
      {files.map((f) => (
        <li key={f.id} className="pp-file-row">
          <FileBadge name={f.originalName} />
          <div className="pp-file-info">
            <span className="pp-file-name" title={f.originalName}>{f.originalName}</span>
            <span className="t-meta">{fmt.fileLine(f)}</span>
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

export function CopyCodeButton({
  code,
  size = 'md',
  variant = 'secondary',
  className,
}: {
  code: string;
  size?: 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { m } = useI18n();
  return (
    <Button
      size={size}
      variant={variant}
      icon={Copy}
      className={className}
      onClick={async () => {
        const ok = await copyText(code);
        if (ok) toast(m.common.copied(code), { icon: Check });
        else toast.error(m.common.copyFailed);
      }}
    >
      {m.common.copyOrderId}
    </Button>
  );
}

/* ---------- Customer-facing progress: Received → Printing → Ready → Claimed ---------- */

const STEP_ORDER = ['received', 'printing', 'ready', 'claimed'] as const;
type Step = (typeof STEP_ORDER)[number];
const STEP_ICON = { received: Inbox, printing: Printer, ready: Check, claimed: PackageCheck } as const;

export function TrackingSteps({ order, phone }: { order: Order; phone: string }) {
  const { m, fmt } = useI18n();
  const t = m.track.steps;
  const events = [...order.events].reverse();
  const lastAt = (s: OrderStatus) => events.find((e) => e.type === 'status_change' && e.toStatus === s)?.createdAt;
  const issue = order.status === 'file_issue';
  const issueMessage = issue ? events.find((e) => e.toStatus === 'file_issue')?.message : undefined;
  // A file issue pauses the order where it was found: before printing, or mid-print.
  const current = issue ? (lastAt('printing') ? 1 : 0) : STEP_ORDER.indexOf(order.status as Step);

  return (
    <ol className="pp-steps" aria-label={t.label}>
      {STEP_ORDER.map((s, i) => {
        const state: 'done' | 'current' | 'todo' =
          order.status === 'claimed' || i < current ? 'done' : i === current ? 'current' : 'todo';
        const flagged = issue && i === current;
        const at = state === 'todo' ? undefined : lastAt(s);
        const line = t[s][state];
        return (
          <li key={s} className={`pp-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <div className="pp-step-rail">
              <span className="pp-step-mark">
                <Icon icon={flagged ? TriangleAlert : state === 'done' ? Check : STEP_ICON[s]} />
              </span>
              {i < STEP_ORDER.length - 1 && <span className="pp-step-line" />}
            </div>
            <div className="pp-step-body">
              <p className="pp-step-title">
                {m.common.status[s]}
                {state === 'current' && !flagged && <span className="t-meta"> · {t.now}</span>}
              </p>
              {(at || state === 'todo') && <p className="t-meta">{at ? fmt.dateTime(at) : t.notYet}</p>}
              {!flagged && line && <p className="t-ink-2">{line}</p>}
              {flagged && (
                <div className="pp-issue" role="status">
                  <p className="pp-step-title"><Icon icon={TriangleAlert} /> {t.onHold}</p>
                  {issueMessage && <p>{issueMessage}</p>}
                  <p className="t-small">{t.issueHelp(phone)}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
