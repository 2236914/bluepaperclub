# Print Portal

Online ordering for the shop: customers upload files, get an order ID by email and track their order; staff work the orders from a dashboard and print to the counter printer through the print agent on the shop laptop. Customers pay at the counter when they claim.

This is **phase 1 of the spec: the UI on sample data**. Every screen runs against `mockApi` (in-memory + `localStorage`) so the owner can click through the customer and staff flows on a phone and a laptop before any backend exists.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (order IDs, file rules, formatting, mock API)
npm run build      # type-check + production build into dist/
```

Staff sign-in on sample data (also shown on the login page):

| Account | Email | Password |
| --- | --- | --- |
| Owner | `ana.lopez@example.com` | `print123` |
| Staff | `ben.cruz@example.com` | `print123` |

Open the customer site and the dashboard in two tabs: an order you submit shows up on the dashboard live, and status changes show up on the tracking page.

## Screens

| Route | Screen |
| --- | --- |
| `/` | Send files: upload, print settings, details, privacy consent, how it works |
| `/order/:code` | Order received: order ID, copy button, summary, what happens next |
| `/track` | Track order: ID + email → progress, pickup details; "No order found" |
| `/staff/login` | Staff sign in |
| `/staff` | Orders: live counts, Active / Claimed / All, search, order panel (`?order=<id>`) |
| `/staff/new` | Add walk-in order (email optional) |
| `/staff/settings` | Owner only: shop details, staff accounts, printers |
| `/staff/emails` | Previews of the three customer emails |

The order panel covers files (preview, print on the counter printer, download, and **Print on this phone** on Android via the share sheet → NokoPrint), print settings, the customer note, the staff-only note, the status switcher with "Email the customer when the status changes", **Report a file issue**, manual two-sided printing (odd pages → flip the stack → Continue → even pages), print job status and the order's activity log.

Every screen has loading, empty and error states and works at 390 px.

### What the sample data lets you try

- A walk-in Word file that is still **Converting** (it finishes about 45 s after the page loads).
- A two-sided order waiting for staff to **flip the stack**.
- An order **on hold with a file issue**, and a print job that **failed** with "Printer offline".
- Shop settings → Printers → **Shop laptop is offline** shows the dashboard with the print agent down (jobs stay queued and print when it comes back).
- Shop settings → Printers → **Reset sample data** puts everything back.

## Design

Built on the **Monari** design system (square, flat, 1px lines, full-bleed blocks, status told by fill + icon + word), with one change: **the primary colour is copper peptide blue instead of black.** `inverse` — primary buttons, the hero band, selected segments, the Ready tag, checkboxes, focus rings — is `cu-700` `#1E37A0`, the deep blue of raw GHK-Cu. The neutral scale carries a faint blue cast so the greys sit with it. In dark mode the blue lifts to `cu-300` `#96A5E2` with dark text, the same way Monari's black block turns white.

| Token | Light | Dark |
| --- | --- | --- |
| `inverse` (primary) | `#1E37A0` | `#96A5E2` |
| `inverse-hover` | `#2C47B8` | `#C3CCF0` |
| `ink` / `line` | `#11142A` | `#F4F5F8` |
| `bg` | `#F4F5F8` | `#11142A` |
| `surface` | `#FFFFFF` | `#1C2033` |

White on `#1E37A0` is about 10:1; every text pair meets 4.5:1.

- `src/design/tokens.css` — the scale and semantic tokens (light and dark).
- `src/design/monari.css` — Monari's component styles (`mn-*`), trimmed to what the portal uses.
- `src/design/components/` — typed React versions: Button, IconButton, Card, Field, Checkbox, Switch, Segmented, StatusTag, Bleed, Upload zone, Progress, Skeleton, EmptyState, Alert, Timeline, Dialog (a bottom sheet on phones), Drawer, Toast, Tabs. Icons are `lucide-react` at 1.5px with square caps.
- `src/design/portal.css` — page layout and the few patterns Monari doesn't ship.

Order status tags follow the spec: Received (dashed edge, `inbox`), Printing (grey block, `printer`), Ready for pickup (solid blue, `check`), Claimed (sunk + hair edge, `package-check`), File issue (2px edge, `triangle-alert`).

## The data seam

All screens talk to one `PortalApi` (`src/api/types.ts`), the interface from the spec plus a few additions the staff screens need (current staff member, counts, print jobs, shop settings, staff accounts). `VITE_DATA_SOURCE` picks the implementation:

- `mock` (default) — `src/api/mockApi.ts`, seeded from `src/api/seed.ts`. A pretend print agent picks up jobs and converts Word files.
- `supabase` — `src/api/supabaseApi.ts`, a placeholder for phases 2–4 that says "not connected" on every call. Its header lists which Edge Function or table each method maps to.

## Emails

`src/emails/received.html`, `ready.html` and `file-issue.html` are table-based, inline-styled templates with `{{placeholders}}` (escaped) and `{{{files_rows}}}` (trusted HTML). `src/emails/render.ts` fills them; the Edge Functions can reuse the same files. Preview them at `/staff/emails`.

## Deploying the review build

Cloudflare Pages: build command `npm run build`, output `dist`. `public/_redirects` sends every path to `index.html` so deep links work. For a static host without rewrites, build with `VITE_ROUTER=hash` (URLs become `/#/track`). See `.env.example`.

## Not in this phase

Real uploads to R2, Turnstile, emails, Supabase auth and Realtime, the print agent, and the daily cleanup — phases 2–6 of the spec. The open decisions in the spec (email service, domain, laptop OS, printer model, days to keep unclaimed orders) don't block the UI; the unclaimed-days value is editable in Shop settings. Shop address, hours and phone are placeholders until the owner fills them in under Shop settings.
