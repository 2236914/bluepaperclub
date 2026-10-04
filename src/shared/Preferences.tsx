/*
 * Display and help settings for people who find the site hard to use:
 * bigger text, high contrast, less motion, step-by-step mode and read-aloud
 * buttons. Saved on the device; applied as data attributes on <html> that
 * tokens.css and portal.css respond to.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TextSize = 'normal' | 'large' | 'xlarge';

export interface Preferences {
  textSize: TextSize;
  highContrast: boolean;
  reduceMotion: boolean;
  /** one question per screen with big buttons, instead of the full form */
  guided: boolean;
  /** show "Read aloud" buttons on help, steps and the thank-you message */
  readAloud: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  textSize: 'normal',
  highContrast: false,
  reduceMotion: false,
  guided: false,
  readAloud: true,
};

const STORAGE_KEY = 'print-portal:prefs';

function readPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const p = JSON.parse(raw) as Partial<Preferences>;
    return {
      textSize: p.textSize === 'large' || p.textSize === 'xlarge' ? p.textSize : 'normal',
      highContrast: p.highContrast === true,
      reduceMotion: p.reduceMotion === true,
      guided: p.guided === true,
      readAloud: p.readAloud !== false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface PrefsCtx {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

const Ctx = createContext<PrefsCtx>({ prefs: DEFAULT_PREFERENCES, setPref: () => {}, reset: () => {} });

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(readPrefs);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.textSize === 'normal') root.removeAttribute('data-text');
    else root.setAttribute('data-text', prefs.textSize);
    if (prefs.highContrast) root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    if (prefs.reduceMotion) root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* settings still apply for this visit */
    }
  }, [prefs]);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);
  const reset = useCallback(() => setPrefs(DEFAULT_PREFERENCES), []);
  const value = useMemo(() => ({ prefs, setPref, reset }), [prefs, setPref, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePreferences = () => useContext(Ctx);

/** True when motion should be kept to a minimum (system setting or the site setting). */
export function useReducedMotion(): boolean {
  const { prefs } = usePreferences();
  const [system, setSystem] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return prefs.reduceMotion || system;
}
