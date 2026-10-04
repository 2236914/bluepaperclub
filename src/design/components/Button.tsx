import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Common {
  /** primary = the copper blue fill, once per view; secondary = outlined (default); quiet = no edge */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  iconEnd?: IconType;
  fullWidth?: boolean;
}

export function buttonClass({ variant = 'secondary', size = 'md', fullWidth }: Common, extra?: string) {
  return cx(
    'mn-btn',
    variant === 'primary' && 'mn-btn-primary',
    variant === 'quiet' && 'mn-btn-quiet',
    size === 'sm' && 'mn-btn-sm',
    size === 'lg' && 'mn-btn-lg',
    fullWidth && 'mn-btn-full',
    extra,
  );
}

function Content({ icon, iconEnd, loading, children }: { icon?: IconType; iconEnd?: IconType; loading?: boolean; children?: ReactNode }) {
  return (
    <>
      {loading ? <span className="mn-btn-spin" aria-hidden="true" /> : icon ? <Icon icon={icon} /> : null}
      {children}
      {iconEnd && !loading ? <Icon icon={iconEnd} /> : null}
    </>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Common {
  /** square spinner in place of the icon; disables the button and keeps the label */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconEnd, loading, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, fullWidth }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Content icon={icon} iconEnd={iconEnd} loading={loading}>{children}</Content>
    </button>
  );
});

/** A router link styled as a button. */
export function ButtonLink({ variant, size, icon, iconEnd, fullWidth, className, children, ...rest }: LinkProps & Common) {
  return (
    <Link className={buttonClass({ variant, size, fullWidth }, className)} {...rest}>
      <Content icon={icon} iconEnd={iconEnd}>{children}</Content>
    </Link>
  );
}

/** An external link (mailto:, tel:, file URLs) styled as a button. */
export function ButtonAnchor({ variant, size, icon, iconEnd, fullWidth, className, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & Common) {
  return (
    <a className={buttonClass({ variant, size, fullWidth }, className)} {...rest}>
      <Content icon={icon} iconEnd={iconEnd}>{children}</Content>
    </a>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconType;
  /** required: the accessible name, also shown as the native tooltip */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'quiet', size = 'md', loading, className, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={buttonClass({ variant, size }, cx('mn-icon-btn', className))}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="mn-btn-spin" aria-hidden="true" /> : <Icon icon={icon} />}
    </button>
  );
});
