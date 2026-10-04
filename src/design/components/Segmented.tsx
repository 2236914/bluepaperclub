import type { ReactNode } from 'react';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

export interface SegmentedOption<V extends string> {
  value: V;
  label: ReactNode;
  icon?: IconType;
  disabled?: boolean;
}

export interface SegmentedProps<V extends string> {
  options: Array<SegmentedOption<V>>;
  value: V;
  onChange: (value: V) => void;
  /** accessible name for the group (or use labelledBy) */
  label?: string;
  labelledBy?: string;
  /** sm = 32 high in mono (settings), md = 40 high in sans (view switches) */
  size?: 'sm' | 'md';
  /** let the options wrap onto a second line on narrow screens */
  wrap?: boolean;
  className?: string;
}

/** Two to four joined square options; exactly one is on (inverse fill). */
export function Segmented<V extends string>({ options, value, onChange, label, labelledBy, size = 'sm', wrap, className }: SegmentedProps<V>) {
  return (
    <div
      className={cx('mn-seg', size === 'md' && 'mn-seg-md', wrap && 'pp-seg-wrap', className)}
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="mn-seg-opt"
          aria-pressed={o.value === value}
          disabled={o.disabled}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.icon && <Icon icon={o.icon} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
