import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

interface FieldShell {
  label: ReactNode;
  hint?: ReactNode;
  /** shown as "Error: …" in ink, with a 2px edge on the input */
  error?: string | null;
  icon?: IconType;
  suffix?: ReactNode;
  className?: string;
}

function Shell({ id, label, hint, error, icon, suffix, className, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={cx('mn-field', error && 'mn-field-error', icon && 'mn-has-icon', className)}>
      <label className="mn-field-label" htmlFor={id}>{label}</label>
      <div className="mn-input-wrap">
        {icon && <span className="mn-input-icon"><Icon icon={icon} /></span>}
        {children}
        {suffix && <span className="mn-input-suffix">{suffix}</span>}
      </div>
      {(error || hint) && (
        <span className="mn-field-hint" id={`${id}-hint`}>
          {error ? `Error: ${error}` : hint}
        </span>
      )}
    </div>
  );
}

export type FieldProps = FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & { inputClassName?: string };

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, icon, suffix, className, inputClassName, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Shell id={id} label={label} hint={hint} error={error} icon={icon} suffix={suffix} className={className}>
      <input
        ref={ref}
        id={id}
        className={cx('mn-field-input', inputClassName)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Shell>
  );
});

export type TextAreaFieldProps = FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>;

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, hint, error, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        ref={ref}
        id={id}
        className="mn-field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-hint` : undefined}
        {...rest}
      />
    </Shell>
  );
});

export type SelectFieldProps = FieldShell &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { options: Array<{ value: string; label: string }> };

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, className, options, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <span className="mn-select" style={{ width: '100%' }}>
        <select
          ref={ref}
          id={id}
          className="mn-field-input mn-select-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-hint` : undefined}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="mn-select-chev"><Icon icon={ChevronDown} /></span>
      </span>
    </Shell>
  );
});
