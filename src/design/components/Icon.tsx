import type { LucideIcon, LucideProps } from 'lucide-react';
import { cx } from './cx';

export type IconType = LucideIcon;

export interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
  /** px; 16 in buttons and text, 12 in tags, 20 for standalone toolbar icons */
  size?: number;
  /** accessible name; omit for decorative icons next to a word */
  title?: string;
}

/** Lucide in Monari's line style: 1.5px stroke, square caps, miter joins, currentColor. */
export function Icon({ icon: Glyph, size = 16, title, className, style, ...rest }: IconProps) {
  return (
    <Glyph
      size={size}
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cx('mn-icon', className)}
      style={size === 16 ? style : { width: size, height: size, ...style }}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    />
  );
}
