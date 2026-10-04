import { Inbox, PackageCheck, Printer, Check, TriangleAlert } from 'lucide-react';
import type { OrderStatus } from '../../api/types';
import { STATUS_LABEL } from '../../lib/format';
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
  /** shorten the word ("Ready"), never remove it */
  children?: string;
  className?: string;
}

export function StatusTag({ status, children, className }: StatusTagProps) {
  const look = LOOK[status];
  return (
    <span className={cx('mn-tag', look.cls, className)}>
      <Icon icon={look.icon} size={12} />
      {children ?? STATUS_LABEL[status]}
    </span>
  );
}
