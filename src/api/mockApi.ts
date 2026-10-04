/*
 * Phase 1 data layer: an in-memory store mirrored to localStorage, seeded with
 * sample orders. It behaves like the real backend closely enough to review
 * every screen: uploads report progress, the "print agent" picks up jobs and
 * converts Word files, status changes log events and "send" emails, and
 * changes made in one tab show up live in the others.
 */
import {
  PortalError,
  type AgentStatus,
  type NewOrderInput,
  type Order,
  type OrderCounts,
  type OrderEvent,
  type OrderPatch,
  type OrderFile,
  type OrderStatus,
  type OrderView,
  type PortalApi,
  type PrintJob,
  type ShopSettings,
  type StaffMember,
  type StaffRole,
} from './types';
import { SEED_SHOP, SEED_STAFF, buildSeed } from './seed';
import { countPages, fileKind, mimeFor, validateFile, MAX_FILES } from '../lib/files';
import { isValidOrderCode, normalizeOrderCode, uniqueOrderCode } from '../lib/orderCode';
import { PRINTER_FOR_PAPER } from '../lib/printers';
import { isEmail, isToday } from '../lib/format';
import { buildSampleImage, buildSamplePdf } from '../lib/samplePdf';

const STORE_KEY = 'print-portal:mock:v1';
const SESSION_KEY = 'print-portal:mock:session';
export const MOCK_PASSWORD = 'print123';

interface MockState {
  orders: Order[];
  jobs: PrintJob[];
  shop: ShopSettings;
  staff: StaffMember[];
  agent: { offline: boolean; lastSeenAt: string };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const latency = () => wait(180 + Math.random() * 320);
const nowIso = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: the mock keeps working in memory */
  }
}

function freshState(): MockState {
  const seed = buildSeed();
  return {
    orders: seed.orders,
    jobs: seed.jobs,
    shop: { ...SEED_SHOP },
    staff: clone(SEED_STAFF),
    agent: { offline: false, lastSeenAt: nowIso() },
  };
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

class MockApi implements PortalApi {
  private state: MockState;
  private sessionId: string | null;
  private listeners = new Set<() => void>();
  private blobs = new Map<string, Blob>();
  private urls = new Map<string, string>();
  private timers = new Set<string>();

  constructor() {
    this.state = this.load();
    this.sessionId = readStorage(SESSION_KEY);
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORE_KEY) {
          this.state = this.load();
          this.emit();
        } else if (e.key === SESSION_KEY) {
          this.sessionId = e.newValue;
          this.emit();
        }
      });
    }
    // Pick up where the "agent" left off after a reload.
    setTimeout(() => this.runAgent(), 400);
  }

  /* ---------- store ---------- */

  private load(): MockState {
    const raw = readStorage(STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MockState;
        if (Array.isArray(parsed.orders) && Array.isArray(parsed.jobs) && parsed.shop && parsed.staff) return parsed;
      } catch {
        /* fall through to a fresh seed */
      }
    }
    const state = freshState();
    writeStorage(STORE_KEY, JSON.stringify(state));
    return state;
  }

  private save(): void {
    writeStorage(STORE_KEY, JSON.stringify(this.state));
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb());
  }

  private orderById(id: string): Order {
    const order = this.state.orders.find((o) => o.id === id);
    if (!order) throw new PortalError('This order no longer exists.', 'not_found');
    return order;
  }

  private findFile(fileId: string): { order: Order; file: OrderFile } {
    for (const order of this.state.orders) {
      const file = order.files.find((f) => f.id === fileId);
      if (file) return { order, file };
    }
    throw new PortalError('This file no longer exists.', 'not_found');
  }

  private me(): StaffMember | null {
    if (!this.sessionId) return null;
    return this.state.staff.find((s) => s.id === this.sessionId && s.active) ?? null;
  }

  private requireStaff(): StaffMember {
    const me = this.me();
    if (!me) throw new PortalError('Your session has ended. Sign in again.', 'auth');
    return me;
  }

  private requireOwner(): StaffMember {
    const me = this.requireStaff();
    if (me.role !== 'owner') throw new PortalError('Only the owner can change this.', 'forbidden');
    return me;
  }

  /* ---------- customer ---------- */

  async submitOrder(input: NewOrderInput, onProgress?: (fileIndex: number, pct: number) => void): Promise<{ code: string }> {
    const source = input.source ?? 'online';
    const actor = source === 'walk_in' ? this.requireStaff().id : 'customer';
    const name = input.customerName.trim();
    const email = input.email?.trim() || null;

    if (!name) throw new PortalError('Enter the customer name.');
    if (source === 'online' && !email) throw new PortalError('Enter your email so we can send your order ID.');
    if (email && !isEmail(email)) throw new PortalError('Enter a valid email address.');
    if (input.files.length === 0) throw new PortalError('Add at least one file.');
    if (input.files.length > MAX_FILES) throw new PortalError(`You can send up to ${MAX_FILES} files per order.`);
    for (const f of input.files) {
      const problem = validateFile(f);
      if (problem) throw new PortalError(`${f.name}: ${problem}`);
    }
    if (!Number.isInteger(input.copies) || input.copies < 1 || input.copies > 999) {
      throw new PortalError('Copies must be between 1 and 999.');
    }

    // "Upload" every file in parallel, like the browser PUTs straight to R2.
    await Promise.all(
      input.files.map(async (file, i) => {
        const duration = 600 + Math.min(2400, (file.size / (4 * 1024 * 1024)) * 1000);
        const steps = 8;
        for (let s = 1; s <= steps; s++) {
          await wait(duration / steps);
          onProgress?.(i, Math.round((s / steps) * 100));
        }
      }),
    );

    const orderId = uid('ord');
    const files: OrderFile[] = await Promise.all(
      input.files.map(async (file, i) => {
        const id = `${orderId}_f${i + 1}`;
        this.blobs.set(id, file);
        const kind = fileKind(file.name);
        return {
          id,
          originalName: file.name,
          mime: file.type || mimeFor(file.name),
          sizeBytes: file.size,
          pages: kind === 'word' ? null : await countPages(file),
          conversion: kind === 'word' ? 'pending' : 'not_needed',
        } satisfies OrderFile;
      }),
    );

    await wait(400);
    const createdAt = nowIso();
    const code = uniqueOrderCode((c) => this.state.orders.some((o) => o.code === c));
    const events: OrderEvent[] = [{ type: 'status_change', toStatus: 'received', actor, createdAt }];
    if (email) events.push({ type: 'email', message: `Order received email sent to ${email}`, actor: 'system', createdAt });

    this.state.orders.push({
      id: orderId,
      code,
      customerName: name,
      email,
      phone: input.phone?.trim() || null,
      paper: input.paper,
      color: input.color,
      sides: input.sides,
      copies: input.copies,
      notes: input.notes?.trim() || null,
      staffNote: null,
      status: 'received',
      source,
      createdAt,
      readyAt: null,
      claimedAt: null,
      files,
      events,
    });
    this.save();
    this.runAgent();
    return { code };
  }

  async trackOrder(code: string, email: string): Promise<Order | null> {
    await wait(350 + Math.random() * 300);
    const normalized = normalizeOrderCode(code);
    if (!isValidOrderCode(normalized)) return null;
    const order = this.state.orders.find((o) => o.code === normalized);
    if (!order || !order.email || order.email.toLowerCase() !== email.trim().toLowerCase()) return null;
    // Same as the track-order function: status, timeline, file names and settings only.
    const copy = clone(order);
    copy.staffNote = null;
    copy.phone = null;
    copy.events = copy.events
      .filter((e) => e.type === 'status_change')
      .map((e) => ({ ...e, actor: e.actor === 'customer' ? 'customer' : 'shop' }));
    return copy;
  }

  /* ---------- staff: session ---------- */

  async signIn(email: string, password: string): Promise<void> {
    await wait(450);
    const staff = this.state.staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!staff || !staff.active || password !== MOCK_PASSWORD) {
      throw new PortalError("That email and password don't match an active staff account.", 'auth');
    }
    this.sessionId = staff.id;
    writeStorage(SESSION_KEY, staff.id);
    this.emit();
  }

  async signOut(): Promise<void> {
    this.sessionId = null;
    writeStorage(SESSION_KEY, null);
    this.emit();
  }

  async currentStaff(): Promise<StaffMember | null> {
    return this.me() ? clone(this.me()!) : null;
  }

  /* ---------- staff: orders ---------- */

  async listOrders(filter: { view: OrderView; search?: string }): Promise<Order[]> {
    this.requireStaff();
    await latency();
    const q = filter.search?.trim().toLowerCase() ?? '';
    return clone(
      this.state.orders
        .filter((o) => {
          if (filter.view === 'active' && o.status === 'claimed') return false;
          if (filter.view === 'claimed' && o.status !== 'claimed') return false;
          if (!q) return true;
          return (
            o.code.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            (o.email ?? '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  async getOrder(id: string): Promise<Order> {
    this.requireStaff();
    await latency();
    return clone(this.orderById(id));
  }

  async findOrderByCode(code: string): Promise<Order | null> {
    this.requireStaff();
    const normalized = normalizeOrderCode(code);
    const order = this.state.orders.find((o) => o.code === normalized);
    return order ? clone(order) : null;
  }

  async orderCounts(): Promise<OrderCounts> {
    this.requireStaff();
    const os = this.state.orders;
    const waiting = os.filter((o) => o.status === 'received').map((o) => o.createdAt).sort();
    const claimedToday = os.filter((o) => o.status === 'claimed' && o.claimedAt && isToday(o.claimedAt));
    return {
      toPrint: os.filter((o) => o.status === 'received').length,
      printing: os.filter((o) => o.status === 'printing').length,
      ready: os.filter((o) => o.status === 'ready').length,
      fileIssue: os.filter((o) => o.status === 'file_issue').length,
      claimedToday: claimedToday.length,
      oldestWaitingAt: waiting[0] ?? null,
      pagesClaimedToday: claimedToday.reduce(
        (sum, o) => sum + o.copies * o.files.reduce((s, f) => s + (f.pages ?? 0), 0),
        0,
      ),
    };
  }

  async setStatus(id: string, status: OrderStatus, opts: { emailCustomer: boolean; message?: string }): Promise<void> {
    const me = this.requireStaff();
    await latency();
    const order = this.orderById(id);
    if (order.status === status) return;
    const message = opts.message?.trim();
    if (status === 'file_issue' && !message) throw new PortalError('Tell the customer what is wrong with the file.');

    const at = nowIso();
    order.events.push({ type: 'status_change', fromStatus: order.status, toStatus: status, message, actor: me.id, createdAt: at });
    order.status = status;
    if (status === 'ready') order.readyAt = at;
    if (status === 'claimed') order.claimedAt = at;
    if (status !== 'claimed') order.claimedAt = null;

    const template = status === 'ready' ? 'Ready for pickup' : status === 'file_issue' ? 'File issue' : null;
    if (opts.emailCustomer && order.email && template) {
      order.events.push({ type: 'email', message: `${template} email sent to ${order.email}`, actor: 'system', createdAt: at });
    }
    this.save();
  }

  async updateStaffNote(id: string, note: string): Promise<void> {
    const me = this.requireStaff();
    await latency();
    const order = this.orderById(id);
    const next = note.trim() || null;
    if (next === order.staffNote) return;
    order.staffNote = next;
    order.events.push({ type: 'note', message: next ?? 'Staff note cleared', actor: me.id, createdAt: nowIso() });
    this.save();
  }

  /* ---------- files ---------- */

  async getFileUrl(fileId: string, kind: 'original' | 'pdf'): Promise<string> {
    this.requireStaff();
    await wait(150);
    const { order, file } = this.findFile(fileId);
    const fk = fileKind(file.originalName);
    if (kind === 'pdf' && fk === 'word' && file.conversion !== 'done') {
      throw new PortalError(
        file.conversion === 'failed'
          ? 'This Word file could not be converted. Download the original instead.'
          : 'This Word file is still converting to PDF.',
      );
    }
    const key = `${fileId}:${kind}`;
    const cached = this.urls.get(key);
    if (cached) return cached;

    let blob: Blob | undefined = this.blobs.get(fileId);
    const needsPdf = kind === 'pdf' && fk === 'word';
    if (!blob || needsPdf) {
      const lines = [
        `Order ${order.code} · ${order.customerName}`,
        needsPdf ? 'Converted from Word by the print agent.' : 'Sample file for the UI review.',
        'The real file is stored in R2 once the backend is connected.',
      ];
      blob =
        fk === 'image' && !needsPdf
          ? buildSampleImage(file.originalName)
          : buildSamplePdf({ title: file.originalName, lines, pages: file.pages ?? 1, paper: order.paper });
    }
    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    return url;
  }

  /* ---------- printing ---------- */

  async queuePrint(job: Omit<PrintJob, 'id' | 'status' | 'error'>): Promise<PrintJob> {
    this.requireStaff();
    await latency();
    const { order, file } = this.findFile(job.fileId);
    if (fileKind(file.originalName) === 'word' && file.conversion !== 'done') {
      throw new PortalError(`${file.originalName} is still converting to PDF. Print it when it's done.`);
    }
    const created: PrintJob = { ...job, id: uid('job'), status: 'queued', error: null, createdAt: nowIso() };
    this.state.jobs.push(created);
    const pass = job.pass === 'all' ? '' : job.pass === 'odd' ? ' (odd pages)' : ' (even pages)';
    order.events.push({
      type: 'print',
      message: `${file.originalName} sent to ${job.printer}${pass}`,
      actor: this.requireStaff().id,
      createdAt: created.createdAt!,
    });
    this.save();
    this.runAgent();
    return clone(created);
  }

  async listPrintJobs(orderId: string): Promise<PrintJob[]> {
    this.requireStaff();
    return clone(
      this.state.jobs
        .filter((j) => j.orderId === orderId)
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    );
  }

  async agentStatus(): Promise<AgentStatus> {
    const online = !this.state.agent.offline;
    return {
      online,
      printers: Object.values(PRINTER_FOR_PAPER),
      lastSeenAt: online ? nowIso() : this.state.agent.lastSeenAt,
    };
  }

  /** The pretend print agent: prints queued jobs and converts Word files while "online". */
  private runAgent(): void {
    if (this.state.agent.offline) return;
    for (const job of this.state.jobs) {
      if ((job.status === 'queued' || job.status === 'printing') && !this.timers.has(job.id)) {
        this.timers.add(job.id);
        this.printJob(job.id);
      }
    }
    for (const order of this.state.orders) {
      for (const file of order.files) {
        if (file.conversion === 'pending' && !this.timers.has(file.id)) {
          this.timers.add(file.id);
          this.convertFile(file.id);
        }
      }
    }
  }

  private async printJob(jobId: string): Promise<void> {
    await wait(900);
    let job = this.state.jobs.find((j) => j.id === jobId);
    if (!job || this.state.agent.offline) return void this.timers.delete(jobId);
    if (job.status === 'queued') {
      job.status = 'printing';
      const order = this.state.orders.find((o) => o.id === job!.orderId);
      // The first print of an order moves it from Received to Printing.
      if (order && order.status === 'received') {
        order.events.push({ type: 'status_change', fromStatus: 'received', toStatus: 'printing', actor: 'agent', createdAt: nowIso() });
        order.status = 'printing';
      }
      this.save();
    }
    const file = this.state.orders.flatMap((o) => o.files).find((f) => f.id === job!.fileId);
    const pages = (file?.pages ?? 1) * job.copies;
    await wait(Math.min(5000, 1200 + pages * 60));
    job = this.state.jobs.find((j) => j.id === jobId);
    this.timers.delete(jobId);
    if (!job || job.status !== 'printing') return;
    if (this.state.agent.offline) {
      job.status = 'failed';
      job.error = 'Printer offline';
    } else {
      job.status = 'printed';
    }
    this.save();
  }

  private async convertFile(fileId: string): Promise<void> {
    // Sample walk-in stays "Converting" long enough to review; new uploads take a few seconds.
    await wait(fileId.startsWith('ord_seed') ? 45_000 : 6000 + (hash(fileId) % 3000));
    this.timers.delete(fileId);
    if (this.state.agent.offline) return;
    const found = this.state.orders.flatMap((o) => o.files).find((f) => f.id === fileId);
    if (!found || found.conversion !== 'pending') return;
    found.conversion = 'done';
    found.pages = 1 + (hash(found.originalName) % 12);
    this.save();
  }

  subscribeOrders(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /* ---------- shop settings and staff accounts ---------- */

  async getShop(): Promise<ShopSettings> {
    return clone(this.state.shop);
  }

  async updateShop(patch: Partial<ShopSettings>): Promise<ShopSettings> {
    this.requireOwner();
    await latency();
    if (patch.name !== undefined && !patch.name.trim()) throw new PortalError('Enter the shop name.');
    if (patch.email && !isEmail(patch.email)) throw new PortalError('Enter a valid email address.');
    if (patch.unclaimedDays !== undefined && (!Number.isInteger(patch.unclaimedDays) || patch.unclaimedDays < 1 || patch.unclaimedDays > 365)) {
      throw new PortalError('Keep unclaimed orders for 1 to 365 days.');
    }
    this.state.shop = { ...this.state.shop, ...patch };
    this.save();
    return clone(this.state.shop);
  }

  async listStaff(): Promise<StaffMember[]> {
    this.requireStaff();
    return clone(this.state.staff);
  }

  async addStaff(input: { name: string; email: string; role: StaffRole }): Promise<StaffMember> {
    this.requireOwner();
    await latency();
    if (!input.name.trim()) throw new PortalError('Enter their name.');
    if (!isEmail(input.email)) throw new PortalError('Enter a valid email address.');
    if (this.state.staff.some((s) => s.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new PortalError('Someone already uses that email.');
    }
    const member: StaffMember = { id: uid('stf'), name: input.name.trim(), email: input.email.trim(), role: input.role, active: true };
    this.state.staff.push(member);
    this.save();
    return clone(member);
  }

  async updateStaff(id: string, patch: Partial<Pick<StaffMember, 'name' | 'role' | 'active'>>): Promise<StaffMember> {
    const me = this.requireOwner();
    await latency();
    const member = this.state.staff.find((s) => s.id === id);
    if (!member) throw new PortalError('This account no longer exists.', 'not_found');
    if (id === me.id && (patch.active === false || patch.role === 'staff')) {
      throw new PortalError("You can't turn off or demote your own account.");
    }
    Object.assign(member, patch);
    this.save();
    return clone(member);
  }

  /* ---------- editing an order ---------- */

  async updateOrder(id: string, patch: OrderPatch): Promise<Order> {
    const me = this.requireStaff();
    await latency();
    const order = this.orderById(id);
    const next = { ...order, ...patch };
    if (patch.customerName !== undefined && !patch.customerName.trim()) throw new PortalError('Enter the customer name.');
    if (patch.email !== undefined && patch.email !== null && patch.email.trim() && !isEmail(patch.email)) {
      throw new PortalError('Enter a valid email address.');
    }
    if (order.source === 'online' && patch.email !== undefined && !patch.email?.trim()) {
      throw new PortalError('Online orders need an email: it is how the customer tracks the order.');
    }
    if (patch.copies !== undefined && (!Number.isInteger(patch.copies) || patch.copies < 1 || patch.copies > 999)) {
      throw new PortalError('Copies must be between 1 and 999.');
    }
    const LABEL: Record<keyof OrderPatch, string> = {
      customerName: 'name', email: 'email', phone: 'mobile number', paper: 'paper', color: 'color', sides: 'sides', copies: 'copies', notes: 'customer note',
    };
    // Listed in form order, whatever order the patch came in.
    const changed = (Object.keys(LABEL) as Array<keyof OrderPatch>).filter((k) => k in patch).filter((k) => {
      const before = order[k] ?? null;
      const after = (typeof next[k] === 'string' ? (next[k] as string).trim() || null : next[k]) ?? null;
      return before !== after;
    });
    if (changed.length === 0) return clone(order);
    for (const k of changed) {
      const v = next[k];
      (order as unknown as Record<string, unknown>)[k] = typeof v === 'string' ? v.trim() || null : v;
    }
    if (order.customerName == null) order.customerName = '';
    order.events.push({ type: 'edit', message: `Changed ${changed.map((k) => LABEL[k]).join(', ')}`, actor: me.id, createdAt: nowIso() });
    this.save();
    return clone(order);
  }

  private async fakeUpload(file: File, onProgress?: (pct: number) => void): Promise<void> {
    const duration = 500 + Math.min(2000, (file.size / (4 * 1024 * 1024)) * 1000);
    for (let s = 1; s <= 6; s++) {
      await wait(duration / 6);
      onProgress?.(Math.round((s / 6) * 100));
    }
  }

  private async makeFile(id: string, file: File): Promise<OrderFile> {
    this.blobs.set(id, file);
    const kind = fileKind(file.name);
    return {
      id,
      originalName: file.name,
      mime: file.type || mimeFor(file.name),
      sizeBytes: file.size,
      pages: kind === 'word' ? null : await countPages(file),
      conversion: kind === 'word' ? 'pending' : 'not_needed',
    };
  }

  private checkFiles(files: File[]): void {
    for (const f of files) {
      const problem = validateFile(f);
      if (problem) throw new PortalError(`${f.name}: ${problem}`);
    }
  }

  async addFiles(orderId: string, files: File[], onProgress?: (fileIndex: number, pct: number) => void): Promise<Order> {
    const me = this.requireStaff();
    const order = this.orderById(orderId);
    if (order.status === 'claimed') throw new PortalError('This order was already claimed. Make a new order instead.');
    if (files.length === 0) throw new PortalError('Choose at least one file.');
    if (order.files.length + files.length > MAX_FILES) {
      throw new PortalError(`An order can have up to ${MAX_FILES} files. This one has ${order.files.length}.`);
    }
    this.checkFiles(files);
    await Promise.all(files.map((f, i) => this.fakeUpload(f, (pct) => onProgress?.(i, pct))));
    const fresh = this.orderById(orderId);
    const added = await Promise.all(files.map((f) => this.makeFile(uid(`${orderId}_f`), f)));
    fresh.files.push(...added);
    fresh.events.push({ type: 'edit', message: `Added ${added.map((f) => f.originalName).join(', ')}`, actor: me.id, createdAt: nowIso() });
    this.save();
    this.runAgent();
    return clone(fresh);
  }

  async replaceFile(fileId: string, file: File, onProgress?: (pct: number) => void): Promise<Order> {
    const me = this.requireStaff();
    const { order } = this.findFile(fileId);
    if (order.status === 'claimed') throw new PortalError('This order was already claimed. Make a new order instead.');
    this.checkFiles([file]);
    await this.fakeUpload(file, onProgress);
    const { order: fresh, file: old } = this.findFile(fileId);
    const replacement = await this.makeFile(uid(`${fresh.id}_f`), file);
    fresh.files = fresh.files.map((f) => (f.id === fileId ? replacement : f));
    for (const kind of ['original', 'pdf']) {
      const url = this.urls.get(`${fileId}:${kind}`);
      if (url) URL.revokeObjectURL(url);
      this.urls.delete(`${fileId}:${kind}`);
    }
    this.blobs.delete(fileId);
    fresh.events.push({
      type: 'edit',
      message: old.originalName === file.name ? `Replaced ${file.name} with a new copy` : `Replaced ${old.originalName} with ${file.name}`,
      actor: me.id,
      createdAt: nowIso(),
    });
    this.save();
    this.runAgent();
    return clone(fresh);
  }

  async removeFile(fileId: string): Promise<Order> {
    const me = this.requireStaff();
    await latency();
    const { order, file } = this.findFile(fileId);
    if (order.status === 'claimed') throw new PortalError('This order was already claimed. Its files are kept as they were.');
    if (order.files.length <= 1) throw new PortalError("An order needs at least one file. Replace this file instead of removing it.");
    order.files = order.files.filter((f) => f.id !== fileId);
    // Queued jobs for the removed file never print.
    for (const j of this.state.jobs) {
      if (j.fileId === fileId && j.status === 'queued') {
        j.status = 'failed';
        j.error = 'File removed';
      }
    }
    this.blobs.delete(fileId);
    order.events.push({ type: 'edit', message: `Removed ${file.originalName}`, actor: me.id, createdAt: nowIso() });
    this.save();
    return clone(order);
  }

  /* ---------- review-only controls (not part of PortalApi) ---------- */

  setAgentOffline(offline: boolean): void {
    this.state.agent = { offline, lastSeenAt: nowIso() };
    this.save();
    if (!offline) this.runAgent();
  }

  isAgentOffline(): boolean {
    return this.state.agent.offline;
  }

  resetSampleData(): void {
    const session = this.sessionId;
    this.state = freshState();
    this.timers.clear();
    this.save();
    this.sessionId = session;
    this.runAgent();
  }
}

export const mockApi = new MockApi();
