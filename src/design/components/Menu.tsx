import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonSize, type ButtonVariant } from './Button';
import { Icon, type IconType } from './Icon';
import { cx } from './cx';

export interface MenuItem {
  id: string;
  /** visible words; also used for type-to-jump */
  label: string;
  icon?: IconType;
  onSelect: () => void;
  /** stays focusable (so the reason can be read) but does nothing */
  disabled?: boolean;
  /** a second line under the label, e.g. why the item is disabled */
  hint?: ReactNode;
  /** draw a 1px line above this item */
  separatorBefore?: boolean;
}

export interface MenuProps {
  /** visible words on the trigger button */
  label: ReactNode;
  /** accessible name for the trigger when the visible words need context ("More for report.pdf"); must contain the visible words */
  ariaLabel?: string;
  icon?: IconType;
  iconEnd?: IconType;
  items: MenuItem[];
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** which edge of the trigger the menu lines up with */
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
}

const GAP = 4;
const EDGE = 8;

/**
 * A button that opens a list of actions (WAI-ARIA menu button pattern).
 * Enter, Space or Arrow keys open it; Arrow keys, Home and End move; typing a letter jumps;
 * Esc, Tab or a click outside closes it and focus goes back to the button.
 * The list is portalled to <body> with fixed positioning so scrolling panels and drawers don't clip it.
 */
export function Menu({ label, ariaLabel, icon, iconEnd, items, variant = 'secondary', size = 'md', align = 'end', disabled, className }: MenuProps) {
  const id = useId();
  const triggerId = `${id}-trigger`;
  const menuId = `${id}-menu`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) trigger.current?.focus();
  }, []);

  const openAt = (index: number) => {
    if (disabled || items.length === 0) return;
    setActive((index + items.length) % items.length);
    setOpen(true);
  };

  /* Position under the trigger (or above it when there is no room), kept inside the viewport. */
  const place = useCallback(() => {
    const t = trigger.current;
    const mEl = menu.current;
    if (!t || !mEl) return;
    const r = t.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const w = mEl.offsetWidth;
    const h = mEl.offsetHeight;
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(EDGE, Math.min(left, vw - w - EDGE));
    let top = r.bottom + GAP;
    if (top + h > vh - EDGE && r.top - GAP - h >= EDGE) top = r.top - GAP - h;
    top = Math.max(EDGE, Math.min(top, vh - h - EDGE));
    setPos({ top, left, minWidth: r.width });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place, items.length]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return;
      close(false);
      // If the click landed on nothing focusable, put focus back on the button instead of losing it.
      requestAnimationFrame(() => {
        const a = document.activeElement;
        if (!a || a === document.body) trigger.current?.focus();
      });
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, place, close]);

  // Move focus to the active item once the list is placed.
  useEffect(() => {
    if (open && pos) itemRefs.current[active]?.focus({ preventScroll: true });
  }, [open, pos, active]);

  // Esc must not reach a drawer or dialog the menu sits in, so it is handled natively on the list itself.
  useEffect(() => {
    const node = menu.current;
    if (!open || !node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [open, close]);

  const select = (item: MenuItem) => {
    if (item.disabled) return;
    close();
    item.onSelect();
  };

  const onTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openAt(items.length - 1);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const n = items.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => (i + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => (i - 1 + n) % n);
        break;
      case 'Home':
      case 'PageUp':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
      case 'PageDown':
        e.preventDefault();
        setActive(n - 1);
        break;
      case 'Tab':
        e.preventDefault();
        close();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        select(items[active]);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ch = e.key.toLocaleLowerCase();
          for (let step = 1; step <= n; step++) {
            const i = (active + step) % n;
            if (items[i].label.toLocaleLowerCase().startsWith(ch)) {
              setActive(i);
              break;
            }
          }
        }
    }
  };

  return (
    <>
      <Button
        ref={trigger}
        id={triggerId}
        variant={variant}
        size={size}
        icon={icon}
        iconEnd={iconEnd}
        className={className}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={onTriggerKey}
      >
        {label}
      </Button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            aria-orientation="vertical"
            className="mn-menu"
            style={pos ? { top: pos.top, left: pos.left, minWidth: pos.minWidth } : { top: 0, left: 0, visibility: 'hidden' }}
            onKeyDown={onMenuKey}
          >
            {items.map((item, i) => (
              <div key={item.id} role="none" className={cx(item.separatorBefore && i > 0 && 'mn-menu-sep')}>
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={i === active ? 0 : -1}
                  aria-disabled={item.disabled || undefined}
                  className="mn-menu-item"
                  onClick={() => select(item)}
                  onMouseEnter={() => setActive(i)}
                >
                  {item.icon ? <Icon icon={item.icon} /> : <span className="mn-menu-icon-gap" aria-hidden="true" />}
                  <span className="mn-menu-text">
                    <span>{item.label}</span>
                    {item.hint && <span className="mn-menu-hint">{item.hint}</span>}
                  </span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
