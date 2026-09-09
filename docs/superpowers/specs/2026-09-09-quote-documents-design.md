# Quote & Payment Documents — Design Spec

Date: 2026-09-09 · Project: Banning Procurement Hub (Next 16, Supabase, Vercel)

## Goal

Extend the admin panel so the owner can act on a quote request end-to-end from one screen: price each line, issue an itemized **Quotation** (with 15% VAT and a validity date), mark it **Accepted**, and eventually collect payment and issue a **Receipt**. Delivered three ways: pre-filled WhatsApp reply text, a printable/print-to-PDF document, and a private customer-facing link.

Companion scope decision (same round): the admin shell becomes **operations-first** — Messages is the landing view; the Analytics tab/view is dropped (backend stays), badges come from quotes/messages lists.

## Approved scope decisions

- One document lifecycle per request: **Quotation** (priced, `valid_until`) → **Accepted** (`accepted_at` + funnel `status='won'`) → **Receipt** (`paid_at` + `payment_method`). The existing `new|reviewed|won|lost` status funnel is untouched; the document state lives in separate columns.
- Prices are entered per line (GH₵) by the owner in the quote edit drawer. Totals are **server-computed** from line prices — never trusted from the client.
- VAT breakdown: **Subtotal + 15% VAT** shown on documents and in the WhatsApp summary. Flat 15%, no customisation this round.
- Delivery:
  1. **WhatsApp text summary** — upgrades the one-tap Reply pre-fill in Messages. If a quote has no prices yet, the reply falls back to today's request summary.
  2. **Printable document** — a single `QuoteDocument` component (business header, itemized table, subtotal/VAT/total, PAID stamp once `paid_at`). Rendered in a preview modal in Messages; `window.print()` + print CSS produces a PDF. No PDF library.
  3. **Public link** — `/quote/[token]` route: `noindex`, `force-dynamic`, fetches by unguessable `doc_token`. Renders the same `QuoteDocument` + Print button. Receipt shown once `paid_at` set, else quotation.
- `doc_token` = 16 random bytes, generated server-side on first price-save. Never the row id.
- Analytics view is dropped from the nav (per companion decision). `/api/admin/analytics` + `computeAnalytics` stay for later use; no view renders them. Sidebar badges derive from quotes/messages list counts.
- CSV export moves to the Messages → Quotes view.

## Data model — `supabase/migrations/0003_quote_documents.sql`

Idempotent `ALTER TABLE` on `quotes` (safe to paste twice, compatible with already-applied 0002):

| Column | Type | Notes |
|---|---|---|
| `valid_until` | `date` | Quotation validity; shown on documents + WhatsApp summary. |
| `accepted_at` | `timestamptz` | Set by "Mark accepted" (accompanied by `status='won'`). |
| `paid_at` | `timestamptz` | Set by "Mark paid" — flips document to Receipt. |
| `payment_method` | `text` | `cash \| mobile_money \| bank \| other`. |
| `total_amount` | `numeric(12,2)` | Server-computed, stored on price-save. |
| `doc_token` | `text unique` | Unguessable token for `/quote/[token]`. |

Line items stay in JSONB `items`; each item gains optional `unit_price` (GH₵ number). No items-schema change required.

## Server layer

- `src/server/quote-store.ts` — `updateQuote` accepts the new fields (`validUntil`, `paymentMethod`, prices applied per line item, computed `totalAmount`). New: `publishQuoteDocument(id)` generates/ensures `doc_token` + computes + stores `total_amount` + audit `quote_priced`; `setQuoteAccepted(id)` (sets `accepted_at`, status `won`); `setQuotePaid(id, method)` (sets `paid_at`, `payment_method`); `findQuoteByToken(token)` for the public route (returns shape flagging `isReceipt`).
- `src/server/quote-summary.ts` — pure text builder: business name, reference, date, lines `label × qty @ GH₵price`, subtotal, VAT 15%, total, validity. Also used to build document line rendering? No — documents render from structured data; summary is text-only for WhatsApp.
- `src/server/quote-totals.ts` — pure: `computeTotals(lines) → {subtotal, vat, total}` with money rounding (2dp, half-up).
- `src/server/validate.ts` — `quoteDocumentSchema`: id + payment-method enum; extends `quoteUpdateSchema` items to include optional `unitPrice: number`; `validUntil` as ISO date string (empty → undefined).
- `src/server/audit.ts` — unchanged; events `quote_priced`, `quote_accepted`, `quote_receipted`.

## API surface

| Route | Methods | Notes |
|---|---|---|
| `/api/admin/quotes` | POST (manual add), **PUT extended** | PUT now also accepts `validUntil`, `unitPrice` per line; triggers recompute + token ensure + audit. |
| `/api/admin/quotes/status` | POST | marks `won`/`lost`/`reviewed` as today; "accept" is a `won` transition beneath the drawer's **Mark accepted** button. |
| `/api/admin/quotes/paid` | POST | `{id, method}` → `paid_at`, `payment_method`, audit `quote_receipted`; returns `{ok, token}`. |
| `/api/admin/quotes/token` | GET | return `doc_token` (for "Copy link"). |
| `/quote/[token]` | GET | public page: `noindex`, fetch by token, render `QuoteDocument`, Print button. 404 if missing/invalid. |

## Admin shell + views (operations-first)

- **Shell**: deep-green sidebar (`#0d3d1a`), `.dashboard-grid-bg`, gold accent. Top: avatar (Phase A upload) + "Welcome back, {email prefix}" + email. Nav: **Messages** (default), **Customers**, **Materials**, **Sign out**. Mobile: horizontal pill nav. View switching via `?view=`; sub-tabs via `?tab=`.
- **Messages** (default view): sub-tabs **Quotes | Contact**.
  - **Quotes**: newest first. Row: reference, name, area, status pill, date, count badge. Actions per row: **Reply on WhatsApp** (wa.me pre-filled — request summary, or priced summary once prices exist), status select (new/reviewed/won/lost), edit (drawer). Drawer = existing fields + per-line Price (GH₵) inputs + Valid until + **Mark accepted** + **Mark paid** (method select) + **Preview & print** + **Copy link** + **Export CSV** (view-level). New-quote count = badge.
  - **Contact**: read/unread toggle, reply on WhatsApp (message text), edit, delete, mark-all-read.
- **Customers**: searchable list → detail: notes/status edit, quote history, reply link on history rows.
- **Materials**: products + categories CRUD as previously designed.
- Badges polled from quotes/messages lists (not analytics).

## Public catalog / ISR switch

Unchanged from the admin-panel plan (Task 6): `/products` + `/products/[category]` → `catalog-store`, `revalidate=60`, `CatalogProvider`. Independent of quote documents.

## Error handling / fallback

- Admin APIs: 401/403 owner, 400 `validation_failed`, 503 `storage_unavailable` (DB unconfigured). Client surfaces message text.
- `/quote/[token]`: 404 on missing/token-invalid; DB-unconfigured → 404 (no fallback doc possible without data).
- Frontend keeps working pre-migration: quote edit drawer shows prices field; saving without migrations would 503 — acceptable, surfaced as message.

## Testing

- `quote-totals.test.ts` (pure math: rounding, VAT 15%).
- `quote-summary.test.ts` (priced vs unpriced fallback, exact text).
- `validate.test.ts` additions (unitPrice, validUntil, paymentMethod schema).
- quote-store round-trip additions (token generation, uniqueness) via stub client.
- Gates: `npx vitest run` → `npx tsc --noEmit` → `npm run build` → dev smoke: price a quote → WhatsApp summary reflects it → open public link (quotations vs receipt states) → print preview → CSV export.

## Deferred (out of scope this round)

- PDF library/server-side PDF, emailed documents, automated validity reminders, tax customisation (NHIL/GETFund/EDIF), discounts, deposits/part-payments, PDF watermarking, customer-facing "acceptance" action (the owner records acceptance for now).

## Migration handoff

`0003_quote_documents.sql` is delivered for the user to paste into the Supabase SQL Editor (same pattern as 0002). Until applied, document flows report `storage_unavailable`; everything else keeps working against the fallback.