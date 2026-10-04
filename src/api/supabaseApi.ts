/*
 * Phase 2–4 placeholder. The real implementation talks to Supabase (Auth,
 * Postgres, Realtime) and the Edge Functions listed in the spec:
 *
 *   submitOrder     → request-uploads, PUT each file to its signed R2 link
 *                     (onProgress from XHR upload events), then submit-order
 *   trackOrder      → track-order
 *   signIn/signOut  → supabase.auth (staff table must have the user, active)
 *   listOrders etc. → orders / order_files / order_events with RLS
 *   setStatus       → set-status (logs the event, sends the matching email)
 *   getFileUrl      → file-links (short-lived R2 download link)
 *   queuePrint      → insert into print_jobs (status 'queued')
 *   agentStatus     → agents.last_seen_at (offline after 90 s)
 *   subscribeOrders → Realtime on orders, order_files and print_jobs
 *   updateOrder     → update orders (RLS: staff) + an 'edit' order_event
 *   addFiles / replaceFile → request-uploads, PUT to R2, then a small
 *                     edit-files function that moves them into orders/<id>/
 *   removeFile      → delete the order_files row and its R2 objects
 *   connectMessenger→ not called live: the messenger-webhook function links the
 *                     customer's Page-scoped ID (PSID) from the m.me ref
 *   messengerLink   → https://m.me/<shop.messengerPage>?ref=<order code>
 *
 * Until then every call says so clearly instead of failing somewhere deeper.
 */
import { PortalError, type PortalApi } from './types';

const notConnected = (): never => {
  throw new PortalError('The backend is not connected yet. Set VITE_DATA_SOURCE=mock to use sample data.', 'not_connected');
};

export const supabaseApi: PortalApi = {
  submitOrder: async () => notConnected(),
  trackOrder: async () => notConnected(),
  signIn: async () => notConnected(),
  signOut: async () => notConnected(),
  listOrders: async () => notConnected(),
  getOrder: async () => notConnected(),
  setStatus: async () => notConnected(),
  updateStaffNote: async () => notConnected(),
  getFileUrl: async () => notConnected(),
  queuePrint: async () => notConnected(),
  agentStatus: async () => notConnected(),
  subscribeOrders: () => () => {},
  currentStaff: async () => null,
  findOrderByCode: async () => notConnected(),
  orderCounts: async () => notConnected(),
  listPrintJobs: async () => notConnected(),
  getShop: async () => notConnected(),
  updateShop: async () => notConnected(),
  listStaff: async () => notConnected(),
  addStaff: async () => notConnected(),
  updateStaff: async () => notConnected(),
  updateOrder: async () => notConnected(),
  addFiles: async () => notConnected(),
  replaceFile: async () => notConnected(),
  removeFile: async () => notConnected(),
  connectMessenger: async () => notConnected(),
  messengerLink: () => null,
};
