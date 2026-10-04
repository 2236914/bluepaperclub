import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** default = surface + hair edge; inverse = the copper blue block; sunk = recessed fill */
  tone?: 'default' | 'inverse' | 'sunk';
  title?: ReactNode;
  /** heading level for the title; default h2 */
  titleAs?: 'h2' | 'h3';
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  as?: 'section' | 'div' | 'article' | 'aside';
}

/** A square panel for one thing. No shadow, no radius; the one card that matters most can be inverse. */
export function Card({ tone = 'default', title, titleAs: H = 'h2', meta, actions, footer, as: Tag = 'section', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('mn-card', tone === 'inverse' && 'mn-card-inverse', tone === 'sunk' && 'mn-card-sunk', className)} {...rest}>
      {(title || actions) && (
        <div className="mn-card-head">
          <div style={{ minWidth: 0 }}>
            {title && <H className="mn-card-title">{title}</H>}
            {meta && <p className="mn-card-meta">{meta}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
      {footer && <div className="mn-card-foot">{footer}</div>}
    </Tag>
  );
}
