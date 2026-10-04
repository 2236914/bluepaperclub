import { Inbox, PackageCheck, Printer, Check, TriangleAlert } from 'lucide-react';
import type { OrderStatus } from '../../api/types';
import { useI18n } from '../../i18n';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

/* No colour carries meaning: each status is fill weight + icon + word, always all three. */
const LOOK: Record<OrderStatus, { cls: string; icon: IconType }> = {
  received: { cls: 'mn-tag-draft', icon: Inbox }, // dashed edge
  printing: { cls: 'mn-tag-review', icon: Printer }, // grey block
  ready: { cls: 'mn-tag-approved', icon: Check }, // solid inverse
  claimed: { cls: 'mn-tag-scheduled', icon: PackageCheck }, // sunk + hair edge
  file_issue: { cls: 'mn-tag-changes', icon: TriangleAlert }, // 2px strong edge
};

export const STATUS_ICON: Record<OrderStatus, IconType> = Object.fromEntries(
  Object.entries(LOOK).map(([k, v]) => [k, v.icon]),
) as Record<OrderStatus, IconType>;

export interface StatusTagProps {
  status: OrderStatus;
  /** use the short word ("Ready" instead of "Ready for pickup"); the word is never removed */
  short?: boolean;
  /** a custom word, rarely needed */
  children?: string;
  className?: string;
}

export function StatusTag({ status, short, children, className }: StatusTagProps) {
  const { m } = useI18n();
  const look = LOOK[status];
  return (
    <span className={cx('mn-tag', look.cls, className)}>
      <Icon icon={look.icon} size={12} />
      {children ?? (short ? m.common.statusShort[status] : m.common.status[status])}
    </span>
  );
}
