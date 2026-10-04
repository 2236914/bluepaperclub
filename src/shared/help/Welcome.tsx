/*
 * Shows the welcome popup once, on the first visit to the landing page.
 * The popup itself lives in HelpProvider so useHelp().openWelcome() can
 * bring it back any time.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useHelpInternal } from './HelpProvider';

const STORAGE_KEY = 'print-portal:welcomed';
/** also remembered for this visit, for browsers that block storage */
let shownThisVisit = false;

function alreadyWelcomed(): boolean {
  if (shownThisVisit) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function markWelcomed() {
  shownThisVisit = true;
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    /* shown once for this visit anyway */
  }
}

export function Welcome() {
  const { pathname } = useLocation();
  const { showFirstWelcome } = useHelpInternal();
  useEffect(() => {
    if (pathname !== '/' || alreadyWelcomed()) return;
    markWelcomed();
    showFirstWelcome();
  }, [pathname, showFirstWelcome]);
  return null;
}
