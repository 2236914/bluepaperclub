/*
 * Coach marks for the landing page. The page is dimmed except for a
 * spotlight on one part at a time, with a small card that says what it is
 * for. The card sits beside the part on wide screens and is docked to the
 * bottom on phones. Parts that are not on the page are skipped.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button, cx } from '../../design/components';
import { useI18n } from '../../i18n';
import { usePreferences, useReducedMotion } from '../Preferences';
import { ReadAloudButton } from '../ReadAloudButton';

export type TourStep = 'easybar' | 'files' | 'settings' | 'details' | 'submit' | 'track' | 'guided';

const FULL_FORM: TourStep[] = ['easybar', 'files', 'settings', 'details', 'submit', 'track'];
const GUIDED_FORM: TourStep[] = ['easybar', 'guided', 'track'];

const PAD = 8; // space between the part and the spotlight edge
const GAP = 16; // space between the spotlight and the card
const MARGIN = 16; // space between the card and the screen edge
const PHONE = 600; // under this width the card docks to the bottom

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function findTarget(step: TourStep): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${step}"]`);
  if (!el || el.getClientRects().length === 0) return null;
  return el;
}

function available(guided: boolean): TourStep[] {
  return (guided ? GUIDED_FORM : FULL_FORM).filter((s) => findTarget(s) !== null);
}

/** Height hidden under the sticky header, unless the part is in the header itself. */
function topInset(el: HTMLElement): number {
  const header = document.querySelector<HTMLElement>('.pp-site-header');
  if (!header || header.contains(el)) return 0;
  return header.offsetHeight;
}

interface Layout {
  spot: CSSProperties;
  card: CSSProperties;
  docked: boolean;
}

interface TourProps {
  open: boolean;
  onClose: () => void;
  /** where the focus goes when the tour ends (default: what had focus when it started, else the main content) */
  returnFocus?: HTMLElement | null;
}

export function Tour({ open, onClose, returnFocus }: TourProps) {
  if (!open) return null;
  return <TourInner onClose={onClose} returnFocus={returnFocus} />;
}

function TourInner({ onClose, returnFocus }: Omit<TourProps, 'open'>) {
  const { m, lang } = useI18n();
  const t = m.help.tour;
  const { prefs } = usePreferences();
  const reduced = useReducedMotion();
  const id = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [opener] = useState(() => [returnFocus, document.activeElement as HTMLElement | null]);
  const [steps, setSteps] = useState<TourStep[]>(() => available(prefs.guided));
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [announce, setAnnounce] = useState('');
  const [isPhone, setIsPhone] = useState(() => window.innerWidth < PHONE);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const firstStep = useRef(true);

  const step = steps[Math.min(index, steps.length - 1)] as TourStep | undefined;
  const total = steps.length;

  // Nothing to show: end straight away.
  useEffect(() => {
    if (steps.length === 0) closeRef.current();
  }, [steps.length]);

  /** Put the spotlight on the part and the card next to it, for where things are right now. */
  const position = useCallback(() => {
    if (!step) return;
    const el = findTarget(step);
    const card = cardRef.current;
    if (!el) {
      // the part went away (for example the form changed): drop it and carry on
      const left = available(prefs.guided);
      setSteps(left);
      setIndex((i) => Math.min(i, Math.max(0, left.length - 1)));
      return;
    }
    if (!card) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    let top = r.top - PAD;
    let bottom = r.bottom + PAD;
    let left = Math.max(r.left - PAD, 3);
    let right = Math.min(r.right + PAD, vw - 3);
    // keep the outline on screen when the part is taller than the screen
    if (bottom > 3 && top < vh - 3) {
      top = Math.max(top, 3);
      bottom = Math.min(bottom, vh - 3);
    }
    if (right < left) [left, right] = [right, left];
    const spot: CSSProperties = { top, left, width: right - left, height: Math.max(0, bottom - top) };

    const phone = vw < PHONE;
    if (phone) {
      setLayout({ spot, card: {}, docked: true });
      return;
    }
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const clampTop = (y: number) => Math.max(MARGIN, Math.min(y, vh - ch - MARGIN));
    const clampLeft = (x: number) => Math.max(MARGIN, Math.min(x, vw - cw - MARGIN));
    let pos: CSSProperties | null = null;
    if (right + GAP + cw <= vw - MARGIN) pos = { left: right + GAP, top: clampTop(top) };
    else if (left - GAP - cw >= MARGIN) pos = { left: left - GAP - cw, top: clampTop(top) };
    else if (bottom + GAP + ch <= vh - MARGIN) pos = { left: clampLeft(left), top: bottom + GAP };
    else if (top - GAP - ch >= MARGIN) pos = { left: clampLeft(left), top: top - GAP - ch };
    else pos = { left: clampLeft(vw - cw - MARGIN), top: clampTop(vh - ch - MARGIN) };
    setLayout({ spot, card: pos, docked: false });
  }, [step, prefs.guided]);

  /** Scroll so the part and the card both fit on screen, when they can. */
  const scrollToStep = useCallback(() => {
    if (!step) return;
    const el = findTarget(step);
    const card = cardRef.current;
    if (!el || !card) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const inset = topInset(el);
    const r = el.getBoundingClientRect();
    const h = r.height + 2 * PAD;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let want: number; // where the part's top edge should end up on screen
    if (vw < PHONE) {
      const room = vh - ch - inset;
      want = h <= room - 2 * MARGIN ? inset + (room - h) / 2 + PAD : inset + MARGIN + PAD;
    } else {
      const besideRoom = vw - (r.right + PAD) - GAP - MARGIN >= cw || r.left - PAD - GAP - MARGIN >= cw;
      const room = vh - inset;
      if (besideRoom) want = h <= room - 2 * MARGIN ? inset + (room - h) / 2 + PAD : inset + MARGIN + PAD;
      else {
        const block = h + GAP + ch;
        want = block <= room - 2 * MARGIN ? inset + (room - block) / 2 + PAD : inset + MARGIN + PAD;
      }
    }
    const delta = r.top - want;
    if (Math.abs(delta) < 2) return;
    window.scrollTo({ top: window.scrollY + delta, behavior: reduced ? 'auto' : 'smooth' });
  }, [step, reduced]);

  // New step, new text size or language: move the card, then scroll the part into view.
  useLayoutEffect(() => {
    position();
    scrollToStep();
    position();
  }, [position, scrollToStep, prefs.textSize, lang, isPhone]);

  // Follow scrolling, resizing and anything that changes the part's or the card's size.
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setIsPhone(window.innerWidth < PHONE);
        position();
      });
    };
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro && cardRef.current) ro.observe(cardRef.current);
    const el = step ? findTarget(step) : null;
    if (ro && el) ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
    };
  }, [position, step]);

  // Focus goes into the card, and back to where it was when the tour ends.
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
    return () => {
      const back = opener.find((el) => el && el.isConnected && el !== document.body) ?? document.getElementById('main');
      back?.focus({ preventScroll: true });
    };
  }, [opener]);

  // Esc ends the tour wherever the focus is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  // Tell screen readers about each new step; keep the focus inside the card.
  useEffect(() => {
    if (!step) return;
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    setAnnounce(t.announce(index + 1, total, t.steps[step].title));
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !cardRef.current) return;
    const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === cardRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!step) return null;
  const copy = t.steps[step];
  const last = index >= total - 1;

  return createPortal(
    <div className="pp-tour">
      <div className="pp-tour-blocker" aria-hidden="true" />
      {layout && <div className="pp-tour-spot" style={layout.spot} aria-hidden="true" />}
      <div
        ref={cardRef}
        className={cx('pp-tour-card', (layout?.docked ?? isPhone) && 'is-docked')}
        style={layout?.docked === false ? layout.card : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-step ${id}-title`}
        aria-describedby={`${id}-body`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <p className="t-meta pp-tour-count" id={`${id}-step`}>{t.stepOf(index + 1, total)}</p>
        <h2 className="t-title pp-tour-title" id={`${id}-title`}>{copy.title}</h2>
        <p className="pp-tour-body" id={`${id}-body`}>{copy.body}</p>
        <ReadAloudButton text={`${copy.title}. ${copy.body}`} />
        <div className="pp-tour-nav">
          {index > 0 && (
            <Button size="lg" icon={ArrowLeft} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              {m.common.back}
            </Button>
          )}
          {last ? (
            <Button size="lg" variant="primary" icon={Check} onClick={() => closeRef.current()}>
              {t.finish}
            </Button>
          ) : (
            <Button size="lg" variant="primary" iconEnd={ArrowRight} onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
              {m.common.next}
            </Button>
          )}
        </div>
        <Button variant="quiet" className="pp-tour-skip" onClick={() => closeRef.current()}>
          {t.skip}
        </Button>
        <p className="pp-help-vh" aria-live="polite" aria-atomic="true">{announce}</p>
      </div>
    </div>,
    document.body,
  );
}
