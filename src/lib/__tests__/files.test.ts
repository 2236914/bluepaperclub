import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, MAX_FILES, countPdfPagesInText, fileKind, fileProblem, takeFiles, typeLabel, validateFile } from '../files';
import { cleanCopies, draftTotals, emptyDraft, parseCopies, stepCopies, validateDraft } from '../../shared/useOrderDraft';

describe('file rules', () => {
  it('accepts PDF, Word, JPG and PNG only', () => {
    expect(fileKind('a.PDF')).toBe('pdf');
    expect(fileKind('a.jpeg')).toBe('image');
    expect(fileKind('a.docx')).toBe('word');
    expect(fileKind('a.doc')).toBe('word');
    expect(fileKind('a.xlsx')).toBeNull();
    expect(typeLabel('photo.jpeg')).toBe('JPG');
  });

  it('explains rejections in words', () => {
    expect(validateFile({ name: 'ok.pdf', size: 1000 })).toBeNull();
    expect(validateFile({ name: 'big.pdf', size: MAX_FILE_BYTES + 1 })).toMatch(/over 20 MB/);
    expect(validateFile({ name: 'sheet.xlsx', size: 10 })).toMatch(/\.xlsx/);
    expect(validateFile({ name: 'noext', size: 10 })).toMatch(/can't tell/);
    expect(validateFile({ name: 'empty.png', size: 0 })).toMatch(/empty/);
  });

  it('gives a problem code the UI can translate', () => {
    expect(fileProblem({ name: 'ok.pdf', size: 1000 })).toBeNull();
    expect(fileProblem({ name: 'ok.docx', size: MAX_FILE_BYTES })).toBeNull();
    expect(fileProblem({ name: 'big.pdf', size: MAX_FILE_BYTES + 1 })).toBe('tooBig');
    expect(fileProblem({ name: 'sheet.xlsx', size: 10 })).toBe('unsupported');
    expect(fileProblem({ name: 'noext', size: 10 })).toBe('unknownType');
    expect(fileProblem({ name: 'empty.png', size: 0 })).toBe('empty');
    // the type is checked before the size, as in validateFile
    expect(fileProblem({ name: 'huge.xlsx', size: MAX_FILE_BYTES + 1 })).toBe('unsupported');
  });

  it('keeps an order to the file limit and counts what was left out', () => {
    expect(takeFiles(0, ['a', 'b'])).toEqual({ accepted: ['a', 'b'], skipped: 0 });
    expect(takeFiles(MAX_FILES - 1, ['a', 'b', 'c'])).toEqual({ accepted: ['a'], skipped: 2 });
    expect(takeFiles(MAX_FILES, ['a'])).toEqual({ accepted: [], skipped: 1 });
    expect(takeFiles(12, ['a'])).toEqual({ accepted: [], skipped: 1 });
  });

  it('counts PDF pages without counting the page tree', () => {
    const pdf = '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> << /Type /Page >> << /Type/Page /Parent 2 0 R >>';
    expect(countPdfPagesInText(pdf)).toBe(2);
    expect(countPdfPagesInText('not a pdf')).toBeNull();
  });
});

/* Pure helpers of the order draft (src/shared/useOrderDraft.ts), shared by the full form and the wizard. */
describe('order draft helpers', () => {
  const file = (name: string, size: number) => ({ name, size }) as File;
  const picked = (name: string, size: number, pages: number | null | undefined, progress: number | null = null) => {
    const f = file(name, size);
    return { key: name, file: f, pages, problem: fileProblem(f), progress };
  };
  const filled = {
    files: [picked('a.pdf', 1000, 3)],
    name: 'Maria Santos',
    email: 'maria@gmail.com',
    phone: '',
    copies: '2',
    consent: true,
  };

  it('starts empty, or with the remembered details for customers only', () => {
    const remembered = { name: 'Maria Santos', email: 'maria@gmail.com', phone: '0917 123 4567' };
    expect(emptyDraft('customer')).toMatchObject({ name: '', email: '', copies: '1', paper: 'short', welcomeName: null });
    expect(emptyDraft('customer', remembered)).toMatchObject({ name: 'Maria Santos', phone: '0917 123 4567', welcomeName: 'Maria' });
    expect(emptyDraft('walk_in', remembered)).toMatchObject({ name: '', email: '', welcomeName: null });
  });

  it('accepts a complete order', () => {
    expect(validateDraft(filled, 'customer')).toEqual({});
  });

  it('names exactly what is missing, field by field', () => {
    const e = validateDraft({ files: [], name: ' ', email: '', phone: '12', copies: '0', consent: false }, 'customer');
    expect(e).toEqual({
      files: 'filesNone',
      name: 'nameMissing',
      email: 'emailMissing',
      phone: 'phoneShort',
      copies: 'copiesRange',
      consent: 'consentMissing',
    });
    expect(validateDraft({ ...filled, email: 'maria@' }, 'customer').email).toBe('emailInvalid');
    expect(validateDraft({ ...filled, copies: '' }, 'customer').copies).toBe('copiesRange');
    expect(validateDraft({ ...filled, files: [...filled.files, picked('b.xlsx', 10, undefined)] }, 'customer').files).toBe('filesBad');
  });

  it('lets walk-ins go without email or consent', () => {
    expect(validateDraft({ ...filled, email: '', consent: false }, 'walk_in')).toEqual({});
    expect(validateDraft({ ...filled, name: '' }, 'walk_in').name).toBe('nameMissingWalkIn');
  });

  it('checks only the fields of one step when asked', () => {
    const empty = { files: [], name: '', email: '', phone: '', copies: '1', consent: false };
    expect(validateDraft(empty, 'customer', ['copies'])).toEqual({});
    expect(validateDraft(empty, 'customer', ['files'])).toEqual({ files: 'filesNone' });
  });

  it('keeps copies between 1 and 999', () => {
    expect(parseCopies('12')).toBe(12);
    expect(parseCopies('')).toBeNaN();
    expect(stepCopies('1', -1)).toBe('1');
    expect(stepCopies('998', 1)).toBe('999');
    expect(stepCopies('999', 1)).toBe('999');
    expect(stepCopies('', 1)).toBe('1');
    expect(stepCopies('', -1)).toBe('1');
    expect(cleanCopies('1a2b34')).toBe('123');
  });

  it('totals only the files we will send', () => {
    const t = draftTotals([picked('a.pdf', 1000, 3, 100), picked('b.jpg', 500, 1, 50), picked('c.xlsx', 10, undefined)]);
    expect(t.good).toHaveLength(2);
    expect(t.pages).toBe(4);
    expect(t.bytes).toBe(1500);
    expect(t.overall).toBe(75);
    expect(draftTotals([picked('a.pdf', 1000, 3), picked('w.docx', 1000, null)]).pages).toBeNull();
    expect(draftTotals([]).overall).toBe(0);
  });
});
