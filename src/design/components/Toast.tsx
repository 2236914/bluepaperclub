import { useEffect, useRef, useState, type ReactNode } from 'react';
import { OctagonX, X } from 'lucide-react';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

interface ToastItem {
  id: number;
  message: ReactNode;
  icon?: IconType;
  tone: 'default' | 'error';
  action?: { label: string; onClick: () => void };
  duration: number;
}

type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const publish = () => listeners.forEach((l) => l(items));

function push(message: ReactNode, opts: { icon?: IconType; tone?: 'default' | 'error'; action?: ToastItem['action']; duration?: number } = {}) {
  const tone = opts.tone ?? 'default';
  const item: ToastItem = {
    id: nextId++,
    message,
    icon: opts.icon,
    tone,
    action: opts.action,
    duration: opts.duration ?? (opts.action || tone === 'error' ? 8000 : 5000),
  };
  items = [...items, item].slice(-3); // at most three, newest at the bottom
  publish();
  return item.id;
}

/** One line, past tense: "Order PRT-7K3QM marked ready". Needs one <Toaster /> mounted. */
export function toast(message: ReactNode, opts?: Parameters<typeof push>[1]) {
  return push(message, opts);
}
toast.error = (message: string, opts?: Omit<NonNullable<Parameters<typeof push>[1]>, 'tone'>) =>
  push(`Error: ${message.replace(/^Error:\s*/, '')}`, { ...opts, tone: 'error' });
toast.dismiss = (id?: number) => {
  items = id == null ? [] : items.filter((t) => t.id !== id);
  publish();
};

function ToastView({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  useEffect(() => {
    if (paused || item.duration === 0) return;
    const started = Date.now();
    const t = setTimeout(() => toast.dismiss(item.id), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - started;
    };
  }, [paused, item.id, item.duration]);
  const icon = item.tone === 'error' ? OctagonX : item.icon;
  return (
    <div
      className={cx('mn-toast', item.tone === 'error' && 'mn-toast-error')}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {icon && <Icon icon={icon} />}
      <span className="mn-toast-msg">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="mn-toast-action"
          onClick={() => {
            item.action!.onClick();
            toast.dismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      )}
      <button type="button" className="mn-toast-x" aria-label="Dismiss" onClick={() => toast.dismiss(item.id)}>
        <Icon icon={X} />
      </button>
    </div>
  );
}

export function Toaster() {
  const [list, setList] = useState(items);
  useEffect(() => {
    listeners.add(setList);
    return () => void listeners.delete(setList);
  }, []);
  return (
    <div className="mn-toaster" aria-live="polite">
      {list.map((t) => (
        <ToastView key={t.id} item={t} />
      ))}
    </div>
  );
}
