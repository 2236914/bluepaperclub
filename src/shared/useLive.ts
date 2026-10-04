import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../api';

export interface LiveResult<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data and keeps it fresh: re-runs quietly (no loading flash) whenever the
 * backend reports a change through subscribeOrders. `key` re-runs it from scratch.
 */
export function useLive<T>(load: () => Promise<T>, key: string, opts: { live?: boolean; enabled?: boolean; pollMs?: number } = {}): LiveResult<T> {
  const { live = true, enabled = true, pollMs } = opts;
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const loader = useRef(load);
  loader.current = load;
  const run = useRef(0);

  const fetchNow = useCallback((quiet: boolean) => {
    const id = ++run.current;
    if (!quiet) setLoading(true);
    loader
      .current()
      .then((value) => {
        if (id !== run.current) return;
        setData(value);
        setError(null);
      })
      .catch((err) => {
        if (id !== run.current) return;
        setError(errorMessage(err));
      })
      .finally(() => {
        if (id === run.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setData(undefined);
    fetchNow(false);
    const poll = pollMs ? setInterval(() => fetchNow(true), pollMs) : undefined;
    const unsubscribe = live ? api.subscribeOrders(() => fetchNow(true)) : undefined;
    return () => {
      if (poll) clearInterval(poll);
      unsubscribe?.();
    };
  }, [key, enabled, live, pollMs, fetchNow]);

  return { data, error, loading, reload: () => fetchNow(false) };
}

/** Re-renders every `ms` so relative times ("8 min") stay right. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}
