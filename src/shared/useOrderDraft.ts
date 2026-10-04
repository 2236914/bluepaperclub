/*
 * The order being put together: files (with page counts), print settings,
 * the customer's details, validation and the submit with per-file progress.
 *
 * The full form (OrderForm) and the step-by-step mode (GuidedOrder) both use
 * this hook. The draft lives in a small module-level store, one per mode, so
 * switching between the two (or leaving the page and coming back) keeps the
 * files and everything typed so far. A successful submit clears it.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { api, errorMessage, type ColorMode, type PaperSize, type Sides } from '../api';
import { countPages, fileProblem, takeFiles, type FileProblem } from '../lib/files';
import { isEmail } from '../lib/format';
import { addRecentOrder, forgetMe, getRemembered, isRemembered, rememberDetails, type RememberedDetails } from '../lib/remember';
import type { SubmittedOrder } from './OrderForm';

export type OrderMode = 'customer' | 'walk_in';

export interface PickedFile {
  key: string;
  file: File;
  /** undefined while counting; null when we can't count it here (Word, unreadable PDF) */
  pages: number | null | undefined;
  /** why we can't print it, or null when it's fine */
  problem: FileProblem | null;
  /** 0–100 while sending, else null */
  progress: number | null;
}

export interface OrderDraft {
  files: PickedFile[];
  /** how many files the last pick left out because of the file limit */
  skipped: number;
  paper: PaperSize;
  color: ColorMode;
  sides: Sides;
  /** as typed, digits only */
  copies: string;
  notes: string;
  name: string;
  email: string;
  phone: string;
  consent: boolean;
  /** first name shown in "Welcome back, …" when the details came from remember-me */
  welcomeName: string | null;
  /** the person typed in a detail field (or cleared them); stop refilling from remember-me */
  detailsTouched: boolean;
  /** the order was sent; start fresh the next time a form opens */
  sent: boolean;
}

export type DraftField = 'files' | 'name' | 'email' | 'phone' | 'copies' | 'consent';
/** the order fields are checked and focused in */
export const FIELD_ORDER: DraftField[] = ['files', 'name', 'email', 'phone', 'copies', 'consent'];

/** Validation problems as codes; the screens turn them into words (m.form.errors). */
export type DraftError =
  | 'filesNone'
  | 'filesBad'
  | 'nameMissing'
  | 'nameMissingWalkIn'
  | 'emailMissing'
  | 'emailInvalid'
  | 'phoneShort'
  | 'copiesRange'
  | 'consentMissing';

export type DraftErrors = Partial<Record<DraftField, DraftError>>;

export const MAX_COPIES = 999;

/* ---------- pure helpers (tested in lib/__tests__/files.test.ts) ---------- */

export function emptyDraft(mode: OrderMode, remembered: RememberedDetails | null = null): OrderDraft {
  const r = mode === 'customer' ? remembered : null;
  return {
    files: [],
    skipped: 0,
    paper: 'short',
    color: 'bw',
    sides: 'one',
    copies: '1',
    notes: '',
    name: r?.name ?? '',
    email: r?.email ?? '',
    phone: r?.phone ?? '',
    consent: false,
    welcomeName: r ? firstWord(r.name) : null,
    detailsTouched: false,
    sent: false,
  };
}

function firstWord(name: string): string | null {
  return name.trim().split(/\s+/)[0] || null;
}

/** "12" → 12; anything else (empty, 0, over the limit) → NaN-safe number the validator rejects. */
export function parseCopies(value: string): number {
  return /^\d+$/.test(value) ? Number.parseInt(value, 10) : Number.NaN;
}

/** The stepper buttons: one more or one fewer, kept between 1 and MAX_COPIES. */
export function stepCopies(value: string, delta: number): string {
  const n = parseCopies(value);
  const base = Number.isFinite(n) ? n : delta > 0 ? 0 : 1;
  return String(Math.min(MAX_COPIES, Math.max(1, base + delta)));
}

/** Keeps what someone types in the copies box to three digits. */
export function cleanCopies(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

/** Checks the whole draft, or only some fields (one wizard step). */
export function validateDraft(
  d: Pick<OrderDraft, 'files' | 'name' | 'email' | 'phone' | 'copies' | 'consent'>,
  mode: OrderMode,
  only: DraftField[] = FIELD_ORDER,
): DraftErrors {
  const walkIn = mode === 'walk_in';
  const e: DraftErrors = {};
  const want = (f: DraftField) => only.includes(f);
  if (want('files')) {
    if (!d.files.some((f) => !f.problem)) e.files = 'filesNone';
    else if (d.files.some((f) => f.problem)) e.files = 'filesBad';
  }
  if (want('name') && !d.name.trim()) e.name = walkIn ? 'nameMissingWalkIn' : 'nameMissing';
  if (want('email')) {
    if (!walkIn && !d.email.trim()) e.email = 'emailMissing';
    else if (d.email.trim() && !isEmail(d.email)) e.email = 'emailInvalid';
  }
  if (want('phone') && d.phone.trim() && d.phone.replace(/\D/g, '').length < 7) e.phone = 'phoneShort';
  if (want('copies')) {
    const n = parseCopies(d.copies);
    if (!Number.isInteger(n) || n < 1 || n > MAX_COPIES) e.copies = 'copiesRange';
  }
  if (want('consent') && !walkIn && !d.consent) e.consent = 'consentMissing';
  return e;
}

/** The files we will send, their page total (null while any is unknown), size and average upload progress. */
export function draftTotals<F extends Pick<PickedFile, 'file' | 'pages' | 'problem' | 'progress'>>(files: F[]) {
  const good = files.filter((f) => !f.problem);
  let pages: number | null = 0;
  for (const f of good) {
    if (f.pages == null) {
      pages = null;
      break;
    }
    pages += f.pages;
  }
  const bytes = good.reduce((s, f) => s + f.file.size, 0);
  const overall = good.length ? good.reduce((s, f) => s + (f.progress ?? 0), 0) / good.length : 0;
  return { good, pages, bytes, overall };
}

/* ---------- the store ---------- */

interface Store {
  state: OrderDraft;
  listeners: Set<() => void>;
}

const stores = new Map<OrderMode, Store>();
let keySeq = 0;

function storeFor(mode: OrderMode): Store {
  let s = stores.get(mode);
  if (!s) {
    s = { state: emptyDraft(mode, mode === 'customer' ? getRemembered() : null), listeners: new Set() };
    stores.set(mode, s);
  }
  return s;
}

function update(mode: OrderMode, fn: (d: OrderDraft) => OrderDraft) {
  const s = storeFor(mode);
  const next = fn(s.state);
  if (next === s.state) return;
  s.state = next;
  s.listeners.forEach((l) => l());
}

function patchFile(mode: OrderMode, key: string, patch: Partial<PickedFile>) {
  update(mode, (d) => ({ ...d, files: d.files.map((f) => (f.key === key ? { ...f, ...patch } : f)) }));
}

/** Brings the detail fields in line with remember-me while the person hasn't typed in them. */
function syncRemembered(mode: OrderMode) {
  if (mode !== 'customer') return;
  update(mode, (d) => {
    if (d.detailsTouched) return d;
    const r = getRemembered();
    const name = r?.name ?? '';
    const email = r?.email ?? '';
    const phone = r?.phone ?? '';
    const welcomeName = r ? firstWord(r.name) : null;
    if (d.name === name && d.email === email && d.phone === phone && d.welcomeName === welcomeName) return d;
    return { ...d, name, email, phone, welcomeName };
  });
}

export type DraftPatch = Partial<Pick<OrderDraft, 'paper' | 'color' | 'sides' | 'copies' | 'notes' | 'name' | 'email' | 'phone' | 'consent' | 'skipped'>>;

/* ---------- the hook ---------- */

export function useOrderDraft(mode: OrderMode) {
  const walkIn = mode === 'walk_in';
  const subscribe = useCallback(
    (l: () => void) => {
      const s = storeFor(mode);
      s.listeners.add(l);
      return () => {
        s.listeners.delete(l);
      };
    },
    [mode],
  );
  const draft = useSyncExternalStore(subscribe, () => storeFor(mode).state);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A form opening after a sent order starts fresh; otherwise pick up remember-me changes made elsewhere.
  useEffect(() => {
    const s = storeFor(mode);
    if (s.state.sent) {
      s.state = emptyDraft(mode, mode === 'customer' ? getRemembered() : null);
      s.listeners.forEach((l) => l());
    } else {
      syncRemembered(mode);
    }
  }, [mode]);

  const set = useCallback(
    (patch: DraftPatch) => {
      const touchesDetails = 'name' in patch || 'email' in patch || 'phone' in patch;
      update(mode, (d) => ({ ...d, ...patch, detailsTouched: d.detailsTouched || touchesDetails }));
      setErrors((e) => {
        let changed = false;
        const next = { ...e };
        for (const k of Object.keys(patch) as Array<keyof DraftPatch>) {
          if (k in next) {
            delete next[k as DraftField];
            changed = true;
          }
        }
        return changed ? next : e;
      });
    },
    [mode],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      const { accepted, skipped } = takeFiles(storeFor(mode).state.files.length, incoming);
      const picked: PickedFile[] = accepted.map((file) => ({
        key: `f${++keySeq}`,
        file,
        pages: undefined,
        problem: fileProblem(file),
        progress: null,
      }));
      update(mode, (d) => ({ ...d, skipped, files: [...d.files, ...picked] }));
      setErrors((e) => (e.files ? { ...e, files: undefined } : e));
      for (const p of picked) {
        if (p.problem) continue;
        countPages(p.file).then((pages) => patchFile(mode, p.key, { pages }));
      }
      return picked;
    },
    [mode],
  );

  const removeFile = useCallback(
    (key: string) => {
      update(mode, (d) => ({ ...d, skipped: 0, files: d.files.filter((f) => f.key !== key) }));
      setErrors((e) => (e.files ? { ...e, files: undefined } : e));
    },
    [mode],
  );

  /** "Not you?": forget this phone's remembered details and empty the fields. */
  const forget = useCallback(() => {
    forgetMe();
    update(mode, (d) => ({ ...d, name: '', email: '', phone: '', welcomeName: null, detailsTouched: true }));
  }, [mode]);

  /** Checks some fields (default all), shows their errors and returns them. */
  const validate = useCallback(
    (only: DraftField[] = FIELD_ORDER): DraftErrors => {
      const found = validateDraft(storeFor(mode).state, mode, only);
      setErrors((e) => {
        const next = { ...e };
        for (const f of only) delete next[f];
        return { ...next, ...found };
      });
      return found;
    },
    [mode],
  );

  /**
   * Validates everything and sends the order. Returns the errors when something
   * is missing (nothing is sent), or null once the order went through and
   * onSubmitted was called. A failed send shows submitError.
   */
  const submit = useCallback(
    async (onSubmitted: (result: SubmittedOrder) => void): Promise<DraftErrors | null> => {
      setSubmitError(null);
      const d = storeFor(mode).state;
      const found = validateDraft(d, mode);
      setErrors(found);
      if (Object.keys(found).length) return found;

      const toSend = d.files.filter((f) => !f.problem);
      const sendKeys = new Set(toSend.map((f) => f.key));
      setSubmitting(true);
      update(mode, (s) => ({ ...s, files: s.files.map((f) => (sendKeys.has(f.key) ? { ...f, progress: 0 } : f)) }));
      const name = d.name.trim();
      const email = d.email.trim();
      const phone = d.phone.trim();
      try {
        const { code } = await api.submitOrder(
          {
            customerName: name,
            email: email || null,
            phone: phone || null,
            paper: d.paper,
            color: d.color,
            sides: d.sides,
            copies: parseCopies(d.copies),
            notes: d.notes.trim() || null,
            files: toSend.map((f) => f.file),
            source: walkIn ? 'walk_in' : 'online',
            turnstileToken: walkIn ? null : 'mock-token',
          },
          (index, pct) => {
            const key = toSend[index]?.key;
            if (key) patchFile(mode, key, { progress: pct });
          },
        );
        let remembered = false;
        if (!walkIn && isRemembered()) {
          rememberDetails({ name, email, phone });
          addRecentOrder({ code, email, createdAt: new Date().toISOString() });
          remembered = true;
        }
        // Keep the filled form on screen (disabled) while the page moves on; the next form starts fresh.
        update(mode, (s) => ({ ...s, sent: true }));
        onSubmitted({ code, name, email: email || null, phone: phone || null, remembered });
        return null;
      } catch (err) {
        setSubmitError(errorMessage(err));
        update(mode, (s) => ({ ...s, files: s.files.map((f) => ({ ...f, progress: null })) }));
        setSubmitting(false);
        return null;
      }
    },
    [mode, walkIn],
  );

  const totals = draftTotals(draft.files);

  return {
    mode,
    walkIn,
    draft,
    set,
    addFiles,
    removeFile,
    forget,
    errors,
    validate,
    submit,
    submitting,
    submitError,
    clearSubmitError: () => setSubmitError(null),
    goodFiles: totals.good,
    pageTotal: totals.pages,
    sizeTotal: totals.bytes,
    overall: totals.overall,
    copiesNum: parseCopies(draft.copies),
  };
}

export type OrderDraftApi = ReturnType<typeof useOrderDraft>;
