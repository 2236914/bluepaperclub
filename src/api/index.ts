import type { PortalApi } from './types';
import { mockApi } from './mockApi';
import { supabaseApi } from './supabaseApi';

export * from './types';

/** `mock` (default) uses seeded sample data; `supabase` uses the real backend. */
export const dataSource: 'mock' | 'supabase' = import.meta.env.VITE_DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';
export const isMock = dataSource === 'mock';

export const api: PortalApi = isMock ? mockApi : supabaseApi;

/** Review-only switches (simulate the laptop going offline, reset sample data). Null outside mock mode. */
export const mockControls = isMock ? mockApi : null;

/** Turns any thrown value into the words shown after "Error:". */
export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message.replace(/^Error:\s*/, '');
  return 'Something went wrong. Try again.';
}
