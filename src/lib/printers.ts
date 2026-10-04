import type { PaperSize } from '../api/types';

/** One Windows printer entry per paper size, each with its default paper set (spec section 7). */
export const PRINTER_FOR_PAPER: Record<PaperSize, string> = {
  short: 'Epson Short',
  a4: 'Epson A4',
  long: 'Epson Long',
};

export function printerFor(paper: PaperSize): string {
  return PRINTER_FOR_PAPER[paper];
}
