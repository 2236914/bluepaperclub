/* Sample data for the UI review. Times are relative to "now" so the dashboard always looks like today. */
import type { Order, OrderEvent, OrderFile, PrintJob, ShopSettings, StaffMember } from './types';
import { mimeFor } from '../lib/files';
import { printerFor } from '../lib/printers';

export const SEED_STAFF: StaffMember[] = [
  { id: 'stf_ana', name: 'Ana Lopez', email: 'ana.lopez@example.com', role: 'owner', active: true },
  { id: 'stf_ben', name: 'Ben Cruz', email: 'ben.cruz@example.com', role: 'staff', active: true },
  { id: 'stf_liza', name: 'Liza Ramos', email: 'liza.ramos@example.com', role: 'staff', active: false },
];

export const SEED_SHOP: ShopSettings = {
  name: 'Blue Paper Club',
  address: '[STREET ADDRESS], [CITY]',
  hours: '[OPENING HOURS]',
  phone: '[PHONE]',
  email: 'orders@[yourshop].com',
  unclaimedDays: 30,
  messengerPage: 'bluepaperclub',
};

type SeedFile = [name: string, pages: number | null, sizeBytes: number, conversion?: OrderFile['conversion']];

interface SeedOrder {
  code: string;
  name: string;
  email: string | null;
  phone?: string;
  minsAgo: number;
  status: Order['status'];
  paper: Order['paper'];
  color: Order['color'];
  sides: Order['sides'];
  copies: number;
  notes?: string;
  staffNote?: string;
  source?: Order['source'];
  files: SeedFile[];
  printingMinsAgo?: number;
  readyMinsAgo?: number;
  claimedMinsAgo?: number;
  issue?: { minsAgo: number; message: string };
  messengerMinsAgo?: number;
}

const MB = 1024 * 1024;

const ORDERS: SeedOrder[] = [
  {
    code: 'PRT-WX4FD', name: 'Ramon Aquino', email: null, phone: '0918 555 0142', minsAgo: 6, status: 'received',
    paper: 'short', color: 'bw', sides: 'one', copies: 2, source: 'walk_in',
    notes: 'Walk-in. Will wait at the shop.',
    files: [['Business_Permit_Form.docx', null, 0.09 * MB, 'pending']],
  },
  {
    code: 'PRT-H4WNE', name: 'Angelica Reyes', email: 'angelica.reyes@gmail.com', minsAgo: 12, status: 'received',
    paper: 'short', color: 'bw', sides: 'one', copies: 10,
    files: [['Reviewer_Module_4.pdf', 6, 0.8 * MB], ['Answer_Sheet.pdf', 2, 0.2 * MB]],
  },
  {
    code: 'PRT-Q9TZA', name: 'Maria Santos', email: 'maria.santos@yahoo.com', phone: '0917 812 4410', minsAgo: 25, status: 'received',
    paper: 'a4', color: 'color', sides: 'one', copies: 1,
    files: [['Research_Poster.pdf', 12, 6.1 * MB]],
  },
  {
    code: 'PRT-7K3QM', name: 'Juan Dela Cruz', email: 'juan.delacruz@gmail.com', minsAgo: 42, status: 'printing',
    paper: 'long', color: 'bw', sides: 'two', copies: 2, printingMinsAgo: 20, messengerMinsAgo: 40,
    notes: 'Please staple each chapter separately.',
    files: [['Thesis_Chapters_1-3.pdf', 48, 3.4 * MB], ['Enrollment_Form.docx', 2, 0.09 * MB, 'done'], ['ID_Photo_2x2.jpg', 1, 0.7 * MB]],
  },
  {
    code: 'PRT-B7RDK', name: 'Mark Villanueva', email: 'mark.villanueva@gmail.com', minsAgo: 100, status: 'file_issue',
    paper: 'short', color: 'color', sides: 'one', copies: 1,
    files: [['Tarpaulin_Layout.png', 1, 0.3 * MB]],
    issue: { minsAgo: 80, message: 'The image is very small (400 × 300 px) and will print blurry. Please send a larger copy.' },
    staffNote: 'Called at 1:40, no answer.',
  },
  {
    code: 'PRT-C2MRV', name: 'Kristine Bautista', email: 'kbautista@outlook.com', minsAgo: 175, status: 'ready',
    paper: 'long', color: 'bw', sides: 'one', copies: 1, printingMinsAgo: 120, readyMinsAgo: 50,
    files: [['Chapter_1.pdf', 9, 1.2 * MB], ['Chapter_2.pdf', 11, 1.4 * MB], ['Chapter_3.pdf', 8, 1.1 * MB], ['Appendix.pdf', 8, 2.3 * MB]],
  },
  {
    code: 'PRT-N8YSP', name: 'Paolo Mendoza', email: 'paolo.mendoza@gmail.com', minsAgo: 200, status: 'ready',
    paper: 'a4', color: 'bw', sides: 'two', copies: 1, printingMinsAgo: 180, readyMinsAgo: 120,
    files: [['Board_Exam_Reviewer.pdf', 120, 14.8 * MB]],
  },
  {
    code: 'PRT-V5GHQ', name: 'Jessa Garcia', email: 'jessa.garcia@gmail.com', minsAgo: 215, status: 'received',
    paper: 'short', color: 'color', sides: 'one', copies: 3,
    files: [['Birth_Certificate_Scan.jpg', 1, 2.2 * MB], ['Barangay_Clearance.pdf', 1, 0.4 * MB]],
  },
  {
    code: 'PRT-KD2RT', name: 'Bea Lim', email: 'bea.lim@gmail.com', minsAgo: 26 * 60, status: 'claimed',
    paper: 'short', color: 'bw', sides: 'one', copies: 1, printingMinsAgo: 25 * 60, readyMinsAgo: 24 * 60, claimedMinsAgo: 35,
    files: [['Resume_Bea_Lim.pdf', 2, 0.2 * MB]],
  },
  {
    code: 'PRT-M3PZE', name: 'Carlo Ramos', email: 'carlo.ramos@gmail.com', minsAgo: 5 * 60, status: 'claimed',
    paper: 'a4', color: 'bw', sides: 'two', copies: 5, printingMinsAgo: 4 * 60, readyMinsAgo: 3 * 60, claimedMinsAgo: 70,
    files: [['Group_Report_Final.pdf', 24, 2.9 * MB]],
  },
  {
    code: 'PRT-T7HAN', name: 'Rhea Navarro', email: 'rhea.navarro@gmail.com', minsAgo: 50 * 60, status: 'claimed',
    paper: 'long', color: 'color', sides: 'one', copies: 1, printingMinsAgo: 49 * 60, readyMinsAgo: 48 * 60, claimedMinsAgo: 27 * 60,
    files: [['Certificate_Template.pdf', 1, 0.6 * MB], ['Event_Program.docx', 4, 0.1 * MB, 'done']],
  },
  {
    code: 'PRT-G6QXS', name: 'Nico Torres', email: 'nico.torres@gmail.com', minsAgo: 4 * 24 * 60, status: 'claimed',
    paper: 'short', color: 'bw', sides: 'one', copies: 2, printingMinsAgo: 4 * 24 * 60 - 30, readyMinsAgo: 4 * 24 * 60 - 60, claimedMinsAgo: 3 * 24 * 60,
    files: [['Lab_Manual.pdf', 32, 4.4 * MB]],
  },
];

export interface Seed {
  orders: Order[];
  jobs: PrintJob[];
}

export function buildSeed(now = Date.now()): Seed {
  const at = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  const orders: Order[] = [];
  const jobs: PrintJob[] = [];

  ORDERS.forEach((s, i) => {
    const id = `ord_seed_${i + 1}`;
    const files: OrderFile[] = s.files.map(([name, pages, size, conversion], j) => ({
      id: `${id}_f${j + 1}`,
      originalName: name,
      mime: mimeFor(name),
      sizeBytes: Math.round(size),
      pages,
      conversion: conversion ?? 'not_needed',
    }));
    const placedBy = s.source === 'walk_in' ? 'stf_ben' : 'customer';
    const events: OrderEvent[] = [
      { type: 'status_change', toStatus: 'received', actor: placedBy, createdAt: at(s.minsAgo) },
    ];
    if (s.email) {
      events.push({ type: 'email', message: `Order received email sent to ${s.email}`, actor: 'system', createdAt: at(s.minsAgo) });
    }
    if (s.messengerMinsAgo != null) {
      events.push({ type: 'messenger', message: 'Customer connected Messenger · Order received message sent', actor: 'system', createdAt: at(s.messengerMinsAgo) });
    }
    if (s.printingMinsAgo != null) {
      events.push({ type: 'status_change', fromStatus: 'received', toStatus: 'printing', actor: 'agent', createdAt: at(s.printingMinsAgo) });
      if (s.messengerMinsAgo != null) events.push({ type: 'messenger', message: 'Printing message sent on Messenger', actor: 'system', createdAt: at(s.printingMinsAgo) });
      files.forEach((f, j) => {
        const passes: PrintJob['pass'][] = s.sides === 'two' && (f.pages ?? 1) > 1 ? ['odd'] : ['all'];
        // Finished orders printed both sides; the live one is waiting for staff to flip the stack.
        if (s.sides === 'two' && (f.pages ?? 1) > 1 && s.status !== 'printing') passes.push('even');
        passes.forEach((pass, k) => {
          jobs.push({
            id: `job_seed_${i + 1}_${j + 1}_${k}`,
            orderId: id,
            fileId: f.id,
            printer: printerFor(s.paper),
            copies: s.copies,
            color: s.color,
            paper: s.paper,
            pageRange: null,
            pass,
            status: 'printed',
            error: null,
            createdAt: at(s.printingMinsAgo! - j - k),
          });
        });
        events.push({ type: 'print', message: `${f.originalName} printed on ${printerFor(s.paper)}`, actor: 'agent', createdAt: at(s.printingMinsAgo! - j) });
      });
    }
    if (s.issue) {
      events.push({ type: 'status_change', fromStatus: 'received', toStatus: 'file_issue', message: s.issue.message, actor: 'stf_ana', createdAt: at(s.issue.minsAgo) });
      events.push({ type: 'email', message: `File issue email sent to ${s.email}`, actor: 'system', createdAt: at(s.issue.minsAgo) });
    }
    if (s.readyMinsAgo != null) {
      events.push({ type: 'status_change', fromStatus: 'printing', toStatus: 'ready', actor: 'stf_ana', createdAt: at(s.readyMinsAgo) });
      if (s.email) events.push({ type: 'email', message: `Ready for pickup email sent to ${s.email}`, actor: 'system', createdAt: at(s.readyMinsAgo) });
    }
    if (s.claimedMinsAgo != null) {
      events.push({ type: 'status_change', fromStatus: 'ready', toStatus: 'claimed', actor: 'stf_ben', createdAt: at(s.claimedMinsAgo) });
    }
    if (s.staffNote) {
      events.push({ type: 'note', message: s.staffNote, actor: 'stf_ana', createdAt: at(Math.max(1, s.minsAgo - 60)) });
    }
    events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    orders.push({
      id,
      code: s.code,
      customerName: s.name,
      email: s.email,
      phone: s.phone ?? null,
      paper: s.paper,
      color: s.color,
      sides: s.sides,
      copies: s.copies,
      notes: s.notes ?? null,
      staffNote: s.staffNote ?? null,
      status: s.status,
      source: s.source ?? 'online',
      createdAt: at(s.minsAgo),
      readyAt: s.readyMinsAgo != null ? at(s.readyMinsAgo) : null,
      claimedAt: s.claimedMinsAgo != null ? at(s.claimedMinsAgo) : null,
      messengerConnectedAt: s.messengerMinsAgo != null ? at(s.messengerMinsAgo) : null,
      files,
      events,
    });
  });

  // One failed job so the review covers the error state.
  jobs.push({
    id: 'job_seed_failed',
    orderId: 'ord_seed_4',
    fileId: 'ord_seed_4_f3',
    printer: 'Epson Long',
    copies: 2,
    color: 'bw',
    paper: 'long',
    pageRange: null,
    pass: 'all',
    status: 'failed',
    error: 'Printer offline',
    createdAt: new Date(now - 30 * 60_000).toISOString(),
  });

  return { orders, jobs };
}
