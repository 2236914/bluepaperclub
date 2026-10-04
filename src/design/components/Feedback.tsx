import type { ReactNode } from 'react';
import { CircleCheck, Info, OctagonX, TriangleAlert, X } from 'lucide-react';
import { Icon, type IconType } from './Icon';
import { IconButton } from './Button';
import { cx } from './cx';
import { useI18n } from '../../i18n';

/* ---------- Progress: a 4px inverse bar ---------- */
export function Progress({ value, label, showLabel, className }: { value?: number; label: string; showLabel?: boolean; className?: string }) {
  const pct = value == null ? undefined : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx('mn-progress-wrap', className)}>
      {showLabel && (
        <div className="mn-progress-head mn-meta">
          <span>{label}</span>
          {pct != null && <span>{pct}%</span>}
        </div>
      )}
      <div
        className={cx('mn-progress', pct == null && 'mn-progress-ind')}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="mn-progress-bar" style={pct == null ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Skeleton: flat sunk blocks, no shimmer ---------- */
export function Skeleton({ lines = 1, width, height, className }: { lines?: number; width?: number | string; height?: number | string; className?: string }) {
  if (height != null) return <span className={cx('mn-skel', className)} style={{ width: width ?? '100%', height }} aria-hidden="true" />;
  return (
    <span className={cx('mn-skel-stack', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="mn-skel mn-skel-line" style={{ width: i === lines - 1 && lines > 1 ? '60%' : width ?? '100%' }} />
      ))}
    </span>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon, title, children, action, tone = 'default', className }: {
  icon: IconType;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'sunk';
  className?: string;
}) {
  return (
    <div className={cx('mn-empty', tone === 'sunk' && 'mn-empty-sunk', className)}>
      <span className="mn-empty-icon"><Icon icon={icon} size={20} /></span>
      <h3 className="mn-empty-title">{title}</h3>
      {children && <p className="mn-empty-body">{children}</p>}
      {action && <div className="mn-empty-actions">{action}</div>}
    </div>
  );
}

/* ---------- Alert: tone told by icon and first word, never colour ---------- */
const ALERT_ICON: Record<'info' | 'success' | 'warning' | 'error', IconType> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: OctagonX,
};

export function Alert({ tone = 'info', title, children, action, onClose, variant = 'default', icon, className, role }: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  variant?: 'default' | 'inverse';
  icon?: IconType;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const { m } = useI18n();
  return (
    <div
      className={cx('mn-alert', tone === 'error' && 'mn-alert-error', tone === 'warning' && 'mn-alert-warning', variant === 'inverse' && 'mn-alert-inverse', className)}
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
    >
      <span className="mn-alert-icon"><Icon icon={icon ?? ALERT_ICON[tone]} /></span>
      <div className="mn-alert-text">
        {title && <span className="mn-alert-title">{title}</span>}
        {children && <div className="mn-alert-body">{children}</div>}
        {action && <div className="mn-alert-actions">{action}</div>}
      </div>
      {onClose && <IconButton icon={X} label={m.common.dismiss} size="sm" className="mn-alert-close" onClick={onClose} />}
    </div>
  );
}

/* ---------- Timeline: square markers on a soft rail ---------- */
export interface TimelineItem {
  title: ReactNode;
  body?: ReactNode;
  time?: ReactNode;
  icon?: IconType;
  strong?: boolean;
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cx('mn-timeline', className)}>
      {items.map((item, i) => (
        <li key={i} className={cx('mn-tl-item', item.strong && 'mn-tl-strong')}>
          <span className="mn-tl-marker" aria-hidden="true">
            {item.icon && <Icon icon={item.icon} size={12} />}
          </span>
          <div className="mn-tl-body">
            <span className="mn-tl-title">{item.title}</span>
            {item.body && <span className="mn-tl-text">{item.body}</span>}
            {item.time && <span className="mn-meta mn-ink-3">{item.time}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
