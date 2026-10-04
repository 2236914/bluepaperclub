import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, MAX_FILES, countPdfPagesInText, fileKind, fileProblem, takeFiles, typeLabel, validateFile } from '../files';

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
