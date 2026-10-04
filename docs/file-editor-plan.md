# Built-in file editor — plan

Status: plan only, nothing built yet. Last updated: 4 Oct 2026.

Staff fix customers' files inside the dashboard before printing, with no third-party app (no Adobe, Word, Photoshop, Canva). Everything runs in the browser with free, open-source libraries. Files never leave the shop's own system, which matters because uploads are often IDs and school records.

## 1. What staff can do

| Area | What it does |
| --- | --- |
| **Page tools** (PDF) | See every page as a thumbnail; rotate, delete, reorder (drag), duplicate, add a blank page, split, merge another file in, pick a page range |
| **Fit to paper** (PDF, photos) | Scale pages to Short, A4 or Long; set margins; centre; "shrink to fit" so nothing is cut; portrait/landscape |
| **Cover and type** (PDF) | White-out a mistake and type the correction; add text in a chosen font and size; highlight; draw; add a signature or an image; move, resize or delete anything added |
| **Photo editor** (JPG, PNG) | Crop with presets (1×1 in, 2×2 in, passport 35×45 mm, free); rotate and straighten; brightness, contrast, sharpen; black and white; plain white background (see risks); red-eye; then **ID photo layout**: N copies on one Short/A4/Long sheet with cut lines |
| **Document editor** (Word, and new documents) | A Google Docs–style page editor: type and change text on real pages (Short/A4/Long, margins), headings, bold/italic/underline, font and size, alignment, line spacing, bullet and numbered lists, tables, images, page breaks, headers/footers (basic). Opens .docx, saves back to .docx, prints through the same Word→PDF path as today. Also **New document** for walk-in typing jobs (encoding) |

Every save makes a **new version**. The customer's original is never overwritten, staff choose which version prints, and the order's activity log records who changed what ("Ana: rotated pages 2–3, fitted to Long").

## 2. Where it lives

- Order panel → file row → **Iba pa → I-edit ang file** (and an **I-edit** button next to I-print for PDFs and photos).
- Opens a full-screen editor at `/staff/edit/:fileId`, with the order code and file name at the top, **I-save bilang bagong bersyon** (save as new version), **I-print** and **Isara**.
- **Bagong dokumento** (new document) on the walk-in screen and in the order panel for typing jobs.
- Laptop and iPad: full editor. Phone: view, page tools, rotate/crop; typing-heavy tools say "Mas madali ito sa laptop o iPad" (easier on a laptop or iPad).
- Filipino and English like the rest of the dashboard; keyboard shortcuts (Ctrl+Z/Y, Ctrl+S, Delete, arrows); undo/redo for every tool.

## 3. How it's built

| Need | Library (all free, open source, no server) | Licence |
| --- | --- | --- |
| Show PDF pages and thumbnails | pdf.js (`pdfjs-dist`) | Apache-2.0 |
| Change PDFs: rotate, delete, reorder, merge, scale, add text/images/shapes | pdf-lib | MIT |
| Page editor for documents | TipTap (on ProseMirror) | MIT |
| Read .docx | JSZip + our own reader for `word/document.xml` (styles, lists, tables, images) | MIT |
| Write .docx | `docx` | MIT |
| Photo editing | Browser canvas (no library) | — |

- **The editor is its own chunk**, loaded only when staff open it, so the customer site stays fast.
- **One document model for everything:** pages, layers (original content, added text/shapes/images), history for undo. Each tool is a small module, so tools can ship one by one.
- **Word round trip:** .docx → our editor → .docx → the print agent's LibreOffice converts it to PDF (as it already does for Word files) → **preview of exactly what will print** before staff confirm. If a file contains things the editor can't change safely (text boxes, shapes, SmartArt, tracked changes, comments, complex headers), the editor says so before opening and offers **I-edit bilang PDF** (cover and type on the printed version) instead, so nothing is silently lost.
- **ID photo layout** renders at 300 dpi and outputs a print-ready PDF, so sizes come out exact (1 in = 300 px).
- **Fonts:** bundle a few free fonts for typing (e.g. Carlito, metric-compatible with Calibri; Liberation Sans/Serif, metric-compatible with Arial/Times). The laptop gets the same fonts so LibreOffice output matches the preview.

## 4. Data and backend changes (for the backend phases)

```sql
alter table order_files
  add column version int not null default 1,
  add column parent_file_id uuid references order_files(id),  -- the file this was edited from
  add column is_current boolean not null default true,        -- the version that prints
  add column edited_by uuid,                                   -- staff user id
  add column edit_summary text,                                -- "Rotated pages 2–3, fitted to Long"
  add column created_at timestamptz not null default now();
```

- R2: `orders/<order id>/edited/<file id>-v<n>.<ext>`; originals stay in `original/`. Cleanup deletes all versions with the order's files (7 days after claim).
- API additions: `saveFileVersion(fileId, blob, summary)`, `listFileVersions(fileId)`, `setCurrentVersion(fileId)`, `createDocument(orderId, docx)`. Uploads use the same signed-link flow as customer uploads.
- Print jobs always use the current version; the order panel shows "Bersyon 2 · inayos ni Ana" (version 2, edited by Ana) with a link to the versions.
- `order_events` gets `type = 'edit'` entries for every saved version (already supported).

## 5. Build order

Built UI-first on sample data, like the rest of the portal, then connected when the backend is ready.

| Step | Scope | Done when |
| --- | --- | --- |
| **E1. Editor shell + versions** | Full-screen editor route, page view with thumbnails (pdf.js), zoom, save-as-new-version, version list, undo/redo, Filipino/English | Staff open any PDF from an order, save a version, and the order prints that version |
| **E2. Page tools + fit to paper** | Rotate, delete, reorder, duplicate, blank page, merge, split, page range; scale to Short/A4/Long with margins | A sideways scan is rotated, two files merged and fitted to Long, printed correctly |
| **E3. Photo editor + ID layouts** | Crop presets, rotate/straighten, adjustments, B&W, ID sheet layouts with cut lines | 8 × 1×1 photos on one Short sheet measure exactly 1 in when printed |
| **E4. Cover and type** | White-out, add text, highlight, draw, signature, image; move/resize/delete | A wrong date on a scanned form is covered and retyped and looks clean on paper |
| **E5. Document editor** | Paged editor, .docx open/save, tables, lists, images, headers/footers (basic), LibreOffice preview, "edit as PDF" fallback, New document | A typical school form and a thesis chapter open, get a typo fixed, and print with the same layout |
| **E6. Polish** | Keyboard shortcuts, touch on iPad, autosave of unsaved edits on the device, big-file performance, accessibility pass | A 120-page PDF stays responsive; every tool works by keyboard |

E1–E4 are the quick wins (they cover most daily fixes). E5 is the largest piece and can follow.

## 6. Risks and how we handle them

| Risk | Handling |
| --- | --- |
| Word layouts with text boxes, shapes, complex headers | Detected on open; offer "edit as PDF"; original always kept; preview through LibreOffice before printing |
| Changing words inside a PDF | Not attempted (PDFs don't store editable text); cover-and-type instead. Real in-place PDF text editing needs a paid toolkit — not planned |
| Scanned PDFs (pictures of pages) | Page tools, fit, cover-and-type all work; text search/edit doesn't (no OCR in v1) |
| Missing fonts | Bundle metric-compatible free fonts; install the same on the laptop |
| Big files on phones | Thumbnails rendered on demand; heavy tools limited to laptop/iPad |
| White-background removal for ID photos | Simple "brighten background" first; true background removal needs an AI model — evaluate a free, permissively licensed one later, never send photos to an outside service |
| Malicious PDFs | pdf.js and pdf-lib don't run PDF scripts; editor stays inside the staff app |

## 7. Not in this plan

- Customers editing their own files before sending (could reuse E2/E3 later as "rotate or crop before sending").
- Real-time co-editing by two staff at once.
- Spreadsheets and slides.
