import { forwardRef, useEffect, useImperativeHandle, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { Icon } from './Icon';
import { cx } from './cx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
  indeterminate?: boolean;
}

/** Square checkbox; checked fills with the inverse blue. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, indeterminate, className, disabled, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current!);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className={cx('mn-check', disabled && 'mn-is-disabled', className)}>
      <input ref={inner} type="checkbox" className="mn-check-input" disabled={disabled} {...rest} />
      <span className="mn-check-box" aria-hidden="true">
        <Icon icon={Check} className="mn-check-on" />
        <Icon icon={Minus} className="mn-check-mixed" />
      </span>
      <span className="mn-check-text">
        <span>{label}</span>
        {hint && <span className="mn-check-hint">{hint}</span>}
      </span>
    </label>
  );
});
