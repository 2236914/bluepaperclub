import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi, MOCK_PASSWORD } from '../mockApi';

function pdf(name: string, pages: number): File {
  const kids = Array.from({ length: pages }, () => '<< /Type /Page >>').join(' ');
  return new File([`%PDF-1.4 << /Type /Pages >> ${kids}`], name, { type: 'application/pdf' });
}

const base = { paper: 'long', color: 'bw', sides: 'two', copies: 2, notes: null, phone: null } as const;

describe('mock API', () => {
  beforeEach(async () => {
    mockApi.resetSampleData();
    await mockApi.signOut();
  });

  it('takes an order, then tracks it only with the right email', async () => {
    const progress: number[] = [];
    const { code } = await mockApi.submitOrder(
      { ...base, customerName: 'Liza Soberano', email: 'Liza@Example.com', files: [pdf('Report.pdf', 3)] },
      (_i, pct) => progress.push(pct),
    );
    expect(code).toMatch(/^PRT-/);
    expect(progress.at(-1)).toBe(100);

    const order = await mockApi.trackOrder(code.toLowerCase(), 'liza@example.com');
    expect(order?.status).toBe('received');
    expect(order?.files[0].pages).toBe(3);
    expect(order?.staffNote).toBeNull();
    expect(order?.events.every((e) => e.type === 'status_change')).toBe(true);

    expect(await mockApi.trackOrder(code, 'someone@else.com')).toBeNull();
    expect(await mockApi.trackOrder('PRT-ZZZZZ', 'liza@example.com')).toBeNull();
  }, 15_000);

  it('rejects bad input with words', async () => {
    await expect(mockApi.submitOrder({ ...base, customerName: 'A', email: null, files: [pdf('a.pdf', 1)] })).rejects.toThrow(/email/);
    await expect(mockApi.submitOrder({ ...base, customerName: 'A', email: 'a@b.co', files: [] })).rejects.toThrow(/at least one file/);
    const xlsx = new File(['x'], 'sheet.xlsx');
    await expect(mockApi.submitOrder({ ...base, customerName: 'A', email: 'a@b.co', files: [xlsx] })).rejects.toThrow(/\.xlsx/);
  });

  it('keeps staff screens behind sign-in', async () => {
    await expect(mockApi.listOrders({ view: 'active' })).rejects.toThrow(/Sign in/);
    await expect(mockApi.signIn('ana.lopez@example.com', 'wrong')).rejects.toThrow(/don't match/);
    await expect(mockApi.signIn('liza.ramos@example.com', MOCK_PASSWORD)).rejects.toThrow(/don't match/); // turned off
    await mockApi.signIn('ANA.LOPEZ@example.com', MOCK_PASSWORD);
    expect((await mockApi.currentStaff())?.role).toBe('owner');
  });

  it('logs status changes and only emails for Ready and File issue', async () => {
    await mockApi.signIn('ben.cruz@example.com', MOCK_PASSWORD);
    const [order] = (await mockApi.listOrders({ view: 'active', search: 'PRT-H4WNE' }));
    await expect(mockApi.setStatus(order.id, 'file_issue', { emailCustomer: true })).rejects.toThrow(/what is wrong/);

    await mockApi.setStatus(order.id, 'printing', { emailCustomer: true });
    await mockApi.setStatus(order.id, 'ready', { emailCustomer: true });
    const after = await mockApi.getOrder(order.id);
    expect(after.status).toBe('ready');
    expect(after.readyAt).toBeTruthy();
    const emails = after.events.filter((e) => e.type === 'email').map((e) => e.message);
    expect(emails.some((m) => m?.startsWith('Ready for pickup'))).toBe(true);
    expect(emails.some((m) => m?.startsWith('Printing'))).toBe(false);

    // Staff can't change owner settings.
    await expect(mockApi.updateShop({ name: 'X' })).rejects.toThrow(/owner/);
  });

  it('counts the dashboard numbers', async () => {
    await mockApi.signIn('ana.lopez@example.com', MOCK_PASSWORD);
    const c = await mockApi.orderCounts();
    expect(c.toPrint).toBe(4);
    expect(c.printing).toBe(1);
    expect(c.ready).toBe(2);
    expect(c.fileIssue).toBe(1);
    expect(c.oldestWaitingAt).toBeTruthy();
  });

  it('moves an order to Printing on its first print job', async () => {
    await mockApi.signIn('ana.lopez@example.com', MOCK_PASSWORD);
    const [order] = await mockApi.listOrders({ view: 'active', search: 'PRT-Q9TZA' });
    const job = await mockApi.queuePrint({
      orderId: order.id, fileId: order.files[0].id, printer: 'Epson A4', copies: 1, color: 'color', paper: 'a4', pageRange: null, pass: 'all',
    });
    expect(job.status).toBe('queued');
    await new Promise((r) => setTimeout(r, 1200));
    expect((await mockApi.getOrder(order.id)).status).toBe('printing');
  }, 10_000);

  it("won't print a Word file before it is converted", async () => {
    await mockApi.signIn('ana.lopez@example.com', MOCK_PASSWORD);
    const [order] = await mockApi.listOrders({ view: 'active', search: 'PRT-WX4FD' });
    await expect(
      mockApi.queuePrint({ orderId: order.id, fileId: order.files[0].id, printer: 'Epson Short', copies: 1, color: 'bw', paper: 'short', pageRange: null, pass: 'all' }),
    ).rejects.toThrow(/converting/);
  });
});

describe('mock API: editing orders', () => {
  beforeEach(async () => {
    mockApi.resetSampleData();
    await mockApi.signIn('ana.lopez@example.com', MOCK_PASSWORD);
  });

  it('edits details and logs what changed', async () => {
    const [order] = await mockApi.listOrders({ view: 'active', search: 'PRT-H4WNE' });
    const after = await mockApi.updateOrder(order.id, { copies: 12, paper: 'long', notes: '  Staple each set  ' });
    expect(after.copies).toBe(12);
    expect(after.paper).toBe('long');
    expect(after.notes).toBe('Staple each set');
    expect(after.events.at(-1)).toMatchObject({ type: 'edit', message: 'Changed paper, copies, customer note' });
    // No change, no event.
    const again = await mockApi.updateOrder(order.id, { copies: 12 });
    expect(again.events.length).toBe(after.events.length);
    await expect(mockApi.updateOrder(order.id, { email: '' })).rejects.toThrow(/need an email/);
    await expect(mockApi.updateOrder(order.id, { copies: 0 })).rejects.toThrow(/1 and 999/);
  });

  it('adds, replaces and removes files', async () => {
    const [order] = await mockApi.listOrders({ view: 'active', search: 'PRT-H4WNE' });
    const added = await mockApi.addFiles(order.id, [pdf('Extra.pdf', 4)]);
    expect(added.files.map((f) => f.originalName)).toContain('Extra.pdf');
    const extra = added.files.find((f) => f.originalName === 'Extra.pdf')!;
    expect(extra.pages).toBe(4);

    const replaced = await mockApi.replaceFile(extra.id, pdf('Extra_fixed.pdf', 5));
    expect(replaced.files.some((f) => f.id === extra.id)).toBe(false);
    expect(replaced.files.find((f) => f.originalName === 'Extra_fixed.pdf')?.pages).toBe(5);
    expect(replaced.events.at(-1)?.message).toBe('Replaced Extra.pdf with Extra_fixed.pdf');

    const fixed = replaced.files.find((f) => f.originalName === 'Extra_fixed.pdf')!;
    const removed = await mockApi.removeFile(fixed.id);
    expect(removed.files).toHaveLength(order.files.length);
    expect(removed.events.at(-1)?.message).toBe('Removed Extra_fixed.pdf');
  }, 15_000);

  it('keeps at least one file and leaves claimed orders alone', async () => {
    const [single] = await mockApi.listOrders({ view: 'active', search: 'PRT-Q9TZA' });
    await expect(mockApi.removeFile(single.files[0].id)).rejects.toThrow(/at least one file/);
    const [claimed] = await mockApi.listOrders({ view: 'claimed', search: 'PRT-KD2RT' });
    await expect(mockApi.addFiles(claimed.id, [pdf('x.pdf', 1)])).rejects.toThrow(/already claimed/);
    await expect(mockApi.addFiles(single.id, [new File(['x'], 'sheet.xlsx')])).rejects.toThrow(/\.xlsx/);
  });
});
