import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabsProps<V extends string> {
  tabs: Array<{ value: V; label: ReactNode; count?: number }>;
  value: V;
  onChange: (value: V) => void;
  label: string;
  idBase: string;
  className?: string;
}

/** Text tabs with a 2px underline on the current one. Arrow keys move between tabs. */
export function Tabs<V extends string>({ tabs, value, onChange, label, idBase, className }: TabsProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  };
  return (
    <div className={cx('mn-tabs-list', className)} role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => void (refs.current[i] = el)}
          type="button"
          role="tab"
          id={`${idBase}-tab-${t.value}`}
          aria-controls={`${idBase}-panel-${t.value}`}
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          className="mn-tab"
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
          {t.count != null && <span className="mn-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ idBase, value, children }: { idBase: string; value: string; children: ReactNode }) {
  return (
    <div className="mn-tab-panel" role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} tabIndex={0}>
      {children}
    </div>
  );
}
