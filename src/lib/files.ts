/** What customers may upload (spec section 5). */
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type FileKind = 'pdf' | 'image' | 'word';

const EXT_KIND: Record<string, FileKind> = {
  pdf: 'pdf',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  doc: 'word',
  docx: 'word',
};

export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function fileKind(name: string): FileKind | null {
  return EXT_KIND[extensionOf(name)] ?? null;
}

/** Short type label for the file badge: PDF, DOCX, JPG… */
export function typeLabel(name: string): string {
  const ext = extensionOf(name);
  if (ext === 'jpeg') return 'JPG';
  return ext ? ext.toUpperCase().slice(0, 4) : 'FILE';
}

export function mimeFor(name: string, fallback = 'application/octet-stream'): string {
  switch (extensionOf(name)) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return fallback;
  }
}

/** Returns a customer-facing reason, or null when the file is fine. */
export function validateFile(file: { name: string; size: number }): string | null {
  if (!fileKind(file.name)) {
    const ext = extensionOf(file.name);
    return ext
      ? `We can't print .${ext} files. Save it as a PDF and try again.`
      : `We can't tell what kind of file this is. Upload a PDF, Word file, JPG or PNG.`;
  }
  if (file.size > MAX_FILE_BYTES) return 'This file is over 20 MB. Try a smaller file or split it in two.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

/**
 * Counts pages in a PDF without a PDF library: every page object carries
 * "/Type /Page" (and the page tree "/Type /Pages", which we skip). Good enough
 * for a preview count; the server recounts with pdf-lib at submit.
 */
export function countPdfPagesInText(text: string): number | null {
  const matches = text.match(/\/Type\s*\/Page(?![s\w])/g);
  return matches && matches.length > 0 ? matches.length : null;
}

export async function countPages(file: File): Promise<number | null> {
  const kind = fileKind(file.name);
  if (kind === 'image') return 1;
  if (kind !== 'pdf') return null;
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    return countPdfPagesInText(text);
  } catch {
    return null;
  }
}
