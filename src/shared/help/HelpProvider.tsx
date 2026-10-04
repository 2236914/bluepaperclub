/*
 * Help for first-time and older customers: the welcome popup, the guided
 * tour of the landing page, and the display settings dialog. Any component
 * can open them through useHelp().
 *
 * STUB — the help agent replaces this with the real implementation.
 */
import { createContext, useContext, type ReactNode } from 'react';

export interface HelpCtx {
  /** start the highlighted tour of the landing page (goes to "/" first if needed) */
  startTour: () => void;
  /** open the welcome popup again (language, text size, how to start) */
  openWelcome: () => void;
  /** open the display and help settings dialog */
  openSettings: () => void;
}

const Ctx = createContext<HelpCtx>({ startTour: () => {}, openWelcome: () => {}, openSettings: () => {} });

export function HelpProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={{ startTour: () => {}, openWelcome: () => {}, openSettings: () => {} }}>{children}</Ctx.Provider>;
}

export const useHelp = () => useContext(Ctx);
