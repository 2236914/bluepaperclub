import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, countPdfPagesInText, fileKind, typeLabel, validateFile } from '../files';

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

  it('counts PDF pages without counting the page tree', () => {
    const pdf = '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> << /Type /Page >> << /Type/Page /Parent 2 0 R >>';
    expect(countPdfPagesInText(pdf)).toBe(2);
    expect(countPdfPagesInText('not a pdf')).toBeNull();
  });
});
