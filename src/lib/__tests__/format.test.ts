import { describe, expect, it } from 'vitest';
import { filesSummary, formatBytes, formatDuration, formatWhen, settingsSummary } from '../format';

describe('format', () => {
  it('summarises settings the way the dashboard shows them', () => {
    expect(settingsSummary({ paper: 'long', color: 'bw', sides: 'two', copies: 2 })).toBe('Long · B&W · Two-sided · 2 copies');
    expect(settingsSummary({ paper: 'a4', color: 'color', sides: 'one', copies: 1 })).toBe('A4 · Colored · 1 copy');
    expect(settingsSummary({ paper: 'short', color: 'bw', sides: 'one', copies: 3 }, true)).toBe('Short · Black and white · One-sided · 3 copies');
  });

  it('leaves pages out while a Word file converts', () => {
    const f = { id: '1', originalName: 'a.pdf', mime: '', sizeBytes: 1, conversion: 'not_needed' as const };
    expect(filesSummary({ files: [{ ...f, pages: 48 }, { ...f, pages: 3 }] })).toBe('2 files · 51 pages');
    expect(filesSummary({ files: [{ ...f, pages: 48 }, { ...f, pages: null }] })).toBe('2 files');
  });

  it('formats sizes, durations and days', () => {
    expect(formatBytes(740 * 1024)).toBe('740 KB');
    expect(formatBytes(3.4 * 1024 * 1024)).toBe('3.4 MB');
    const now = new Date('2026-10-04T15:00:00').getTime();
    expect(formatDuration(new Date(now - 72 * 60_000).toISOString(), now)).toBe('1 h 12 min');
    expect(formatWhen(new Date(now - 60 * 60_000).toISOString(), new Date(now))).toMatch(/^Today · 2:00 PM$/);
    expect(formatWhen(new Date(now - 24 * 3600_000).toISOString(), new Date(now))).toMatch(/^Yesterday/);
  });
});
