import { useId, type ReactNode } from 'react';
import { cx } from './cx';

export interface SwitchProps {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** A square toggle for a setting that applies straight away. Position tells the state. */
export function Switch({ label, hint, checked, onChange, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cx('mn-switch', className)}>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mn-switch-track"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="mn-switch-thumb" />
      </button>
      <span className="mn-check-text">
        <label htmlFor={id} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>{label}</label>
        {hint && <span className="mn-check-hint" id={`${id}-hint`}>{hint}</span>}
      </span>
    </div>
  );
}
