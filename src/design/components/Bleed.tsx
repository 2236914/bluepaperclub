import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface BleedProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** inverse (default) = copper blue, block = grey, sunk, surface */
  tone?: 'inverse' | 'block' | 'sunk' | 'surface';
  title?: ReactNode;
  as?: 'section' | 'header' | 'footer' | 'div';
  innerClassName?: string;
}

/** A full-width block, edge to edge. Stack them directly; the change of fill is the divider. */
export function Bleed({ tone = 'inverse', title, as: Tag = 'section', className, innerClassName, children, ...rest }: BleedProps) {
  return (
    <Tag className={cx('mn-bleed', `mn-bleed-${tone}`, className)} {...rest}>
      <div className={cx('mn-bleed-inner', innerClassName)}>
        {title && <h2 className="mn-bleed-title">{title}</h2>}
        {children}
      </div>
    </Tag>
  );
}
