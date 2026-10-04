/*
 * Backup printing path: on an Android phone connected to the printer by OTG,
 * staff share the PDF to NokoPrint through the system share sheet.
 */

export function isAndroid(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /Android/i.test(ua);
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File(['%PDF-1.4'], 'probe.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** "Print on this phone" shows only where it can work: Android with file sharing. */
export function canPrintOnThisPhone(): boolean {
  return isAndroid() && canShareFiles();
}

export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Fetches the print-ready PDF and opens the share sheet. Returns false if sharing was cancelled. */
export async function shareForPrinting(url: string, filename: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download the file');
  const blob = await res.blob();
  // Images go out as they are; everything else is the print-ready PDF.
  const isImage = blob.type.startsWith('image/');
  const name = isImage ? filename : filename.replace(/\.[^.]+$/, '') + '.pdf';
  const file = new File([blob], name, { type: blob.type || 'application/pdf' });
  try {
    await navigator.share({ files: [file], title: file.name });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
}
