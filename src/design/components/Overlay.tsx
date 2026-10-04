import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Icon } from './Icon';
import { cx } from './cx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus in, Tab stays inside, Esc closes, focus returns to what opened it, page doesn't scroll behind. */
function useModal(open: boolean, onClose: (() => void) | undefined, panel: React.RefObject<HTMLDivElement | null>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
      } else if (e.key === 'Tab' && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    node?.addEventListener('keydown', onKey);
    return () => {
      node?.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open, panel]);
}

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** quiet Cancel, then the primary action */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** role="alertdialog" for confirmations */
  alert?: boolean;
}

/** A modal for one task. Under 600px it becomes a bottom sheet with stacked 48px buttons. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', alert }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useModal(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div className="mn-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panel}
        className={cx('mn-dialog', `mn-dialog-${size}`)}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
      >
        <div className="mn-dialog-head">
          <h2 className="mn-dialog-title" id={`${id}-title`}>{title}</h2>
          {onClose && (
            <button type="button" className="mn-dialog-close" aria-label="Close" onClick={onClose}>
              <Icon icon={X} />
            </button>
          )}
        </div>
        <div className="mn-dialog-body">
          {description && <p className="mn-dialog-desc" id={`${id}-desc`}>{description}</p>}
          {children}
        </div>
        {footer && <div className="mn-dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  width?: number;
  /** extra content in the header row, before the close button */
  headerExtra?: ReactNode;
}

/** A full-height panel from the side; full width on phones. */
export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 440, headerExtra }: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useModal(open, onClose, panel);
  if (!open) return null;
  return createPortal(
    <div
      className={cx('mn-overlay', 'mn-overlay-drawer', side === 'left' && 'mn-overlay-left')}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panel}
        className="mn-drawer pp-drawer"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
      >
        <div className="mn-dialog-head">
          <h2 className="mn-dialog-title" id={`${id}-title`}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {headerExtra}
            {onClose && (
              <button type="button" className="mn-dialog-close" aria-label="Close" onClick={onClose}>
                <Icon icon={X} />
              </button>
            )}
          </div>
        </div>
        <div className="mn-drawer-body">{children}</div>
        {footer && <div className="mn-dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
