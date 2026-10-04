/*
 * Help for first-time and older customers: the welcome popup, the guided
 * tour of the landing page, and the display settings dialog. Any component
 * under the customer layout can open them through useHelp(). Nothing here
 * shows on the staff pages.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePreferences } from '../Preferences';
import { PreferencesDialog } from './PreferencesDialog';
import { Tour } from './Tour';
import { WelcomeDialog } from './WelcomeDialog';

export interface HelpCtx {
  /** start the highlighted tour of the landing page (goes to "/" first if needed) */
  startTour: () => void;
  /** open the welcome popup again (language, text size, how to start) */
  openWelcome: () => void;
  /** open the display and help settings dialog */
  openSettings: () => void;
}

const Ctx = createContext<HelpCtx>({ startTour: () => {}, openWelcome: () => {}, openSettings: () => {} });

interface HelpInternal {
  /** the first-visit popup (Welcome.tsx decides when) */
  showFirstWelcome: () => void;
}
const InternalCtx = createContext<HelpInternal>({ showFirstWelcome: () => {} });

/** Router state that asks the landing page to start the tour once it has rendered. */
interface TourRouteState {
  helpTour?: number;
}

/** Long enough for the page to render and the layout to finish its own scroll and focus. */
const START_DELAY = 150;

export function HelpProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPref } = usePreferences();
  const onStaff = location.pathname.startsWith('/staff');
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const timer = useRef<number>();
  /** where the focus goes back to when the tour ends */
  const tourOpener = useRef<HTMLElement | null>(null);

  const beginTour = useCallback(() => {
    window.clearTimeout(timer.current);
    setTourOpen(false);
    timer.current = window.setTimeout(() => {
      setTourRun((n) => n + 1);
      setTourOpen(true);
    }, START_DELAY);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const startTour = useCallback(() => {
    tourOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setWelcomeOpen(false);
    setSettingsOpen(false);
    if (pathRef.current !== '/') {
      const state: TourRouteState = { helpTour: Date.now() };
      navigate('/', { state });
    } else {
      beginTour();
    }
  }, [navigate, beginTour]);

  // Arrived on "/" asking for the tour (works even when the layout was mounted fresh).
  const askedTour = (location.state as TourRouteState | null)?.helpTour;
  useEffect(() => {
    if (location.pathname !== '/' || !askedTour) return;
    navigate('/', { replace: true, state: null });
    beginTour();
  }, [askedTour, location.pathname, navigate, beginTour]);

  // The tour belongs to the landing page; leaving it (for example with Back) ends it.
  useEffect(() => {
    if (location.pathname !== '/') {
      window.clearTimeout(timer.current);
      setTourOpen(false);
    }
  }, [location.pathname]);

  const openWelcome = useCallback(() => {
    setSettingsOpen(false);
    setTourOpen(false);
    setWelcomeOpen(true);
  }, []);

  const openSettings = useCallback(() => {
    setWelcomeOpen(false);
    setTourOpen(false);
    setSettingsOpen(true);
  }, []);

  const showFirstWelcome = useCallback(() => setWelcomeOpen(true), []);

  const onGuided = () => {
    setPref('guided', true);
    setWelcomeOpen(false);
    // bring the step-by-step form into view once the popup has closed
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[data-tour="guided"]');
      if (!el) return;
      const header = document.querySelector<HTMLElement>('.pp-site-header');
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - (header?.offsetHeight ?? 0) - 16 });
    }, START_DELAY);
  };

  const value = useMemo(() => ({ startTour, openWelcome, openSettings }), [startTour, openWelcome, openSettings]);
  const internal = useMemo(() => ({ showFirstWelcome }), [showFirstWelcome]);

  return (
    <Ctx.Provider value={value}>
      <InternalCtx.Provider value={internal}>
        {children}
        {!onStaff && (
          <>
            <Tour key={tourRun} open={tourOpen} returnFocus={tourOpener.current} onClose={() => setTourOpen(false)} />
            <WelcomeDialog open={welcomeOpen} onClose={() => setWelcomeOpen(false)} onGuided={onGuided} onTour={startTour} />
            <PreferencesDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </>
        )}
      </InternalCtx.Provider>
    </Ctx.Provider>
  );
}

export const useHelp = () => useContext(Ctx);

/** For Welcome.tsx only. */
export const useHelpInternal = () => useContext(InternalCtx);
