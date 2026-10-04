/*
 * Builds a small, valid PDF in the browser. The mock API hands these out as
 * stand-ins for files that only exist in R2 once the backend is connected, so
 * Preview, Download and "Print on this phone" all work during the UI review.
 */
import type { PaperSize } from '../api/types';

const MEDIA_BOX: Record<PaperSize, [number, number]> = {
  short: [612, 792],
  a4: [595, 842],
  long: [612, 936],
};

function pdfString(text: string): string {
  // Helvetica in WinAnsi: keep to printable ASCII and escape the delimiters.
  const ascii = text.replace(/[^\x20-\x7e]/g, '-');
  return '(' + ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')';
}

export function buildSamplePdf(opts: { title: string; lines?: string[]; pages?: number; paper?: PaperSize }): Blob {
  const pages = Math.max(1, Math.min(opts.pages ?? 1, 60));
  const [w, h] = MEDIA_BOX[opts.paper ?? 'short'];
  const objects: string[] = [];
  const pageIds: number[] = [];

  // 1 catalog, 2 page tree, 3 font, then a (page, content) pair per page.
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  for (let i = 0; i < pages; i++) {
    const pageId = 4 + i * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const lines = [
      `BT /F1 20 Tf 72 ${h - 96} Td ${pdfString(opts.title)} Tj ET`,
      ...(opts.lines ?? []).map((line, j) => `BT /F1 12 Tf 72 ${h - 132 - j * 18} Td ${pdfString(line)} Tj ET`),
      `BT /F1 10 Tf 72 48 Td ${pdfString(`Page ${i + 1} of ${pages}`)} Tj ET`,
      `0.12 0.22 0.63 RG 1 w 72 ${h - 108} m ${w - 72} ${h - 108} l S`,
    ];
    const stream = lines.join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages} >>`;

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}

/** A labelled placeholder image for sample photos that were never uploaded. */
export function buildSampleImage(title: string): Blob {
  const safe = title.replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#e8eaf0"/><rect x="40" y="40" width="520" height="720" fill="none" stroke="#1e37a0" stroke-width="2"/><text x="300" y="390" font-family="Helvetica, Arial, sans-serif" font-size="24" text-anchor="middle" fill="#11142a">${safe}</text><text x="300" y="424" font-family="Helvetica, Arial, sans-serif" font-size="16" text-anchor="middle" fill="#464c61">Sample image</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
