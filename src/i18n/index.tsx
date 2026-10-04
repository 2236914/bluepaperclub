/*
 * Translations. Filipino is the default; people switch with the language
 * control in the header (customer site) or the menu (staff dashboard), and
 * the choice is remembered on the device.
 *
 *   const { m, fmt, lang, setLang } = useI18n();
 *   m.common.next            // "Susunod"
 *   m.common.files(3)        // "3 file"
 *   fmt.when(order.createdAt) // "Ngayon · 2:41 PM"
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Order } from '../api/types';
import { MESSAGES, type Messages } from './messages';

export type Lang = 'en' | 'fil';
export const DEFAULT_LANG: Lang = 'fil';
const STORAGE_KEY = 'print-portal:lang';

function readLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'fil' ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Formatting that follows the language: dates, durations, sizes and order summaries. */
export function makeFormat(lang: Lang, m: Messages) {
  const locale = lang === 'fil' ? 'fil-PH' : 'en-PH';
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  const day = new Intl.DateTimeFormat(lang === 'fil' ? 'fil-PH' : 'en-GB', { day: 'numeric', month: 'short' });
  const longDay = new Intl.DateTimeFormat(lang === 'fil' ? 'fil-PH' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const c = m.common;

  const fmt = {
    time: (iso: string) => time.format(new Date(iso)).replace(/\s?(am|pm)$/i, (s) => ` ${s.trim().toUpperCase()}`).replace(/ /g, ' '),
    /** "4 Okt · 2:41 PM" */
    dateTime: (iso: string) => `${day.format(new Date(iso))} · ${fmt.time(iso)}`,
    /** "Ngayon · 2:41 PM", "Kahapon · 9:05 AM", else the date */
    when: (iso: string, now = new Date()) => {
      const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
      if (diff === 0) return `${c.today} · ${fmt.time(iso)}`;
      if (diff === 1) return `${c.yesterday} · ${fmt.time(iso)}`;
      return fmt.dateTime(iso);
    },
    /** "Linggo, 4 Okt" */
    longDay: (d = new Date()) => longDay.format(d).replace(',', ''),
    /** "1 oras 12 min" */
    duration: (fromIso: string, now = Date.now()) => {
      const mins = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 60_000));
      if (mins < 1) return c.underAMinute;
      if (mins < 60) return c.minutes(mins);
      const h = Math.floor(mins / 60);
      if (h < 24) return c.hoursMinutes(h, mins % 60);
      return c.days(Math.floor(h / 24));
    },
    bytes: (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    },
    /** "3 file · 51 pahina" (pages left out while a Word file is converting) */
    filesSummary: (order: Pick<Order, 'files'>) => {
      let pages: number | null = 0;
      for (const f of order.files) {
        if (f.pages == null) {
          pages = null;
          break;
        }
        pages += f.pages;
      }
      return pages == null ? c.files(order.files.length) : `${c.files(order.files.length)} · ${c.pages(pages)}`;
    },
    /** "Long · Itim at puti · Harap at likod · 2 kopya" */
    settingsSummary: (o: Pick<Order, 'paper' | 'color' | 'sides' | 'copies'>, long = false) => {
      const parts = [c.paper[o.paper], long ? c.color[o.color] : c.colorShort[o.color]];
      if (o.sides === 'two' || long) parts.push(c.sides[o.sides]);
      parts.push(c.copies(o.copies));
      return parts.join(' · ');
    },
    /** "48 pahina · 3.4 MB", or the conversion state for Word files */
    fileLine: (f: Order['files'][number]) => {
      if (f.conversion === 'pending') return `${c.converting} · ${fmt.bytes(f.sizeBytes)}`;
      if (f.conversion === 'failed') return `${c.couldntConvert} · ${fmt.bytes(f.sizeBytes)}`;
      return f.pages != null ? `${c.pages(f.pages)} · ${fmt.bytes(f.sizeBytes)}` : fmt.bytes(f.sizeBytes);
    },
    /** "May mali: …" */
    error: (message: string) => `${c.errorPrefix} ${message.replace(/^(Error:|May mali:)\s*/, '')}`,
  };
  return fmt;
}

export type Format = ReturnType<typeof makeFormat>;

interface I18nCtx {
  lang: Lang;
  setLang: (lang: Lang) => void;
  m: Messages;
  fmt: Format;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice still applies for this visit */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'fil' ? 'fil' : 'en';
  }, [lang]);
  const value = useMemo(() => {
    const m = MESSAGES[lang];
    return { lang, setLang, m, fmt: makeFormat(lang, m) };
  }, [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallback: I18nCtx = {
  lang: DEFAULT_LANG,
  setLang: () => {},
  m: MESSAGES[DEFAULT_LANG],
  fmt: makeFormat(DEFAULT_LANG, MESSAGES[DEFAULT_LANG]),
};

/** Works outside the provider too (tests, portals), falling back to the default language. */
export function useI18n(): I18nCtx {
  return useContext(Ctx) ?? fallback;
}

export type { Messages };
