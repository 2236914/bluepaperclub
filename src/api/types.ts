/*
 * The seam between the UI and the backend. Every screen talks to a PortalApi;
 * phase 1 uses mockApi (in-memory + localStorage), later supabaseApi.
 * Shapes follow the v1 spec (section 11). Additions beyond the spec are marked.
 */

export type OrderStatus = 'received' | 'printing' | 'ready' | 'claimed' | 'file_issue';
export type PaperSize = 'short' | 'a4' | 'long';
export type ColorMode = 'bw' | 'color';
export type Sides = 'one' | 'two';
export type Conversion = 'not_needed' | 'pending' | 'done' | 'failed';

export interface OrderFile {
  id: string;
  originalName: string;
  mime: string;
  sizeBytes: number;
  pages: number | null;
  conversion: Conversion;
}

export interface OrderEvent {
  /** 'edit' is an addition: staff changed the order's details or files */
  type: 'status_change' | 'note' | 'email' | 'print' | 'edit';
  fromStatus?: OrderStatus;
  toStatus?: OrderStatus;
  message?: string;
  /** 'customer' | 'agent' | a staff user id */
  actor: string;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string; // PRT-7K3QM
  customerName: string;
  email: string | null;
  phone: string | null;
  paper: PaperSize;
  color: ColorMode;
  sides: Sides;
  copies: number;
  notes: string | null;
  staffNote: string | null;
  status: OrderStatus;
  source: 'online' | 'walk_in';
  createdAt: string;
  /** addition: mirrors orders.ready_at / claimed_at */
  readyAt?: string | null;
  claimedAt?: string | null;
  files: OrderFile[];
  events: OrderEvent[];
}

export interface PrintJob {
  id: string;
  orderId: string;
  fileId: string;
  printer: string;
  copies: number;
  color: ColorMode;
  paper: PaperSize;
  pageRange: string | null;
  pass: 'all' | 'odd' | 'even';
  status: 'queued' | 'printing' | 'printed' | 'failed';
  error: string | null;
  /** addition: for ordering and "printed 2 min ago" */
  createdAt?: string;
}

export interface NewOrderInput {
  customerName: string;
  email: string | null;
  phone: string | null;
  paper: PaperSize;
  color: ColorMode;
  sides: Sides;
  copies: number;
  notes: string | null;
  files: File[];
  /** addition: walk-ins are added by staff from the dashboard */
  source?: 'online' | 'walk_in';
  /** addition: Turnstile token from the customer form (ignored by the mock) */
  turnstileToken?: string | null;
}

/* ---------- additions for the staff screens ---------- */

export type StaffRole = 'owner' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

export interface ShopSettings {
  name: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
  /** days an unclaimed Ready order is kept before its files are deleted */
  unclaimedDays: number;
}

export interface AgentStatus {
  online: boolean;
  printers: string[];
  lastSeenAt: string | null;
}

export interface OrderCounts {
  toPrint: number;
  printing: number;
  ready: number;
  fileIssue: number;
  claimedToday: number;
  /** created_at of the oldest order still waiting in Received */
  oldestWaitingAt: string | null;
  pagesClaimedToday: number;
}

export type OrderView = 'active' | 'claimed' | 'all';

/** What staff can change on an order after it arrives. */
export type OrderPatch = Partial<
  Pick<Order, 'customerName' | 'email' | 'phone' | 'paper' | 'color' | 'sides' | 'copies' | 'notes'>
>;

export interface PortalApi {
  // customer
  submitOrder(input: NewOrderInput, onProgress?: (fileIndex: number, pct: number) => void): Promise<{ code: string }>;
  trackOrder(code: string, email: string): Promise<Order | null>;
  // staff
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  listOrders(filter: { view: OrderView; search?: string }): Promise<Order[]>;
  getOrder(id: string): Promise<Order>;
  setStatus(id: string, status: OrderStatus, opts: { emailCustomer: boolean; message?: string }): Promise<void>;
  updateStaffNote(id: string, note: string): Promise<void>;
  getFileUrl(fileId: string, kind: 'original' | 'pdf'): Promise<string>;
  queuePrint(job: Omit<PrintJob, 'id' | 'status' | 'error'>): Promise<PrintJob>;
  agentStatus(): Promise<AgentStatus>;
  subscribeOrders(cb: () => void): () => void; // live updates

  // additions
  /** the signed-in staff member, or null */
  currentStaff(): Promise<StaffMember | null>;
  /** looks up an order by its code (dashboard deep links, walk-in hand-off) */
  findOrderByCode(code: string): Promise<Order | null>;
  orderCounts(): Promise<OrderCounts>;
  listPrintJobs(orderId: string): Promise<PrintJob[]>;
  getShop(): Promise<ShopSettings>;
  updateShop(patch: Partial<ShopSettings>): Promise<ShopSettings>;
  listStaff(): Promise<StaffMember[]>;
  addStaff(input: { name: string; email: string; role: StaffRole }): Promise<StaffMember>;
  updateStaff(id: string, patch: Partial<Pick<StaffMember, 'name' | 'role' | 'active'>>): Promise<StaffMember>;

  // additions: staff editing an order after it arrives (each change is logged as an 'edit' event)
  updateOrder(id: string, patch: OrderPatch): Promise<Order>;
  addFiles(orderId: string, files: File[], onProgress?: (fileIndex: number, pct: number) => void): Promise<Order>;
  /** swap one file for a corrected copy (e.g. the customer emailed a fixed file) */
  replaceFile(fileId: string, file: File, onProgress?: (pct: number) => void): Promise<Order>;
  /** an order keeps at least one file */
  removeFile(fileId: string): Promise<Order>;
}

/** Thrown for problems the person can fix; `message` is shown as-is after "Error:". */
export class PortalError extends Error {
  constructor(message: string, readonly code: string = 'invalid') {
    super(message);
    this.name = 'PortalError';
  }
}
