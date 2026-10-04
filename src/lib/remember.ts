/*
 * "Remember me on this phone": no account, no password. With the customer's
 * OK we keep their name, email and mobile number, and their recent order IDs,
 * in this browser only, so the form fills itself in next time and the
 * tracking page can list their orders. "Forget me" clears all of it.
 */
const DETAILS_KEY = 'print-portal:me';
const ORDERS_KEY = 'print-portal:my-orders';
const MAX_ORDERS = 10;

export interface RememberedDetails {
  name: string;
  email: string;
  phone: string;
}

export interface RecentOrder {
  code: string;
  email: string;
  createdAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: nothing is remembered, everything else still works */
  }
}

export function getRemembered(): RememberedDetails | null {
  const d = read<RememberedDetails>(DETAILS_KEY);
  return d && typeof d.name === 'string' && typeof d.email === 'string' ? { name: d.name, email: d.email, phone: d.phone ?? '' } : null;
}

export function rememberDetails(details: RememberedDetails): void {
  write(DETAILS_KEY, { name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() });
}

export function listRecentOrders(): RecentOrder[] {
  const list = read<RecentOrder[]>(ORDERS_KEY);
  return Array.isArray(list) ? list.filter((o) => o && typeof o.code === 'string' && typeof o.email === 'string') : [];
}

/** Adds an order to "Your orders on this phone". Only call when the customer chose to be remembered. */
export function addRecentOrder(order: RecentOrder): void {
  const rest = listRecentOrders().filter((o) => o.code !== order.code);
  write(ORDERS_KEY, [order, ...rest].slice(0, MAX_ORDERS));
}

export function isRemembered(): boolean {
  return getRemembered() !== null;
}

/** "Forget me on this phone": removes the details and the order list. */
export function forgetMe(): void {
  write(DETAILS_KEY, null);
  write(ORDERS_KEY, null);
}
