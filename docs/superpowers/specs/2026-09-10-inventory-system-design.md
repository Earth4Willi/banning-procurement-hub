# Automatic Inventory & Stock Status System — Design Spec

Date: 2026-09-10 · Project: Banning Procurement Hub (Next 16, Supabase, Vercel)

## Goal

Replace the manual stock-status dropdown with an **automatic, quantity-driven inventory system**. The owner manages only **quantities** (available count, low-stock threshold, whether a product is tracked at all); the system **computes** the stock status from those quantities and keeps an audit history of every inventory change. The customer-facing catalog reflects live status (In Stock / Limited / Out of Stock / Available on Request), the quote builder validates against real stock, and stock is deducted automatically when a quote is marked **won**.

## Approved scope decisions

- **Quantity is the single source of truth.** The stored `stock` label column is **removed**. Status is always derived via one shared function `getStockStatus(quantity, threshold)`.
- **Deduction trigger = quote marked "won"** (`status='won'`, i.e. `setQuoteAccepted`). There is no payment system yet; when payments arrive later, deduction on `paid_at` can be added without changing the core.
- **Status rules** (exactly as user specified):
  - `quantity <= 0` → **out of stock**
  - `quantity <= low_stock_threshold` → **limited stock**
  - otherwise → **in stock**
  - `track_inventory = false` → **Available on Request** (customer asks for a quote; not an availability claim)
- **Low-stock threshold default = 10.**
- **Never-negative guarantee** — enforced in two layers: application-level clamp/cap, and a DB `CHECK (stock_quantity >= 0)` as backstop.
- **Existing products migration**: map legacy labels to starting quantities (`in`→100, `limited`→5, `out`→0) so no manual re-entry is required. Measure/bulk products (`kind='measure'`, e.g. sharp sand) get `track_inventory=false` (Available on Request).
- Inventory overview counts are **real** counts from the catalog, not marketing targets.

## Data model — `supabase/migrations/0005_inventory.sql`

Idempotent, safe to paste twice. Changes to `public.products`:

| Change / Column | Type | Notes |
|---|---|---|
| DROP `stock` | — | Legacy label column removed. |
| ADD `stock_quantity` | `integer not null default 0` | Current available count. |
| ADD `low_stock_threshold` | `integer not null default 10` | Threshold below which status = limited. |
| ADD `track_inventory` | `boolean not null default true` | If false → Available on Request. |
| ADD CONSTRAINT `chk_stock_quantity_non_negative` | `CHECK (stock_quantity >= 0)` | Never-negative backstop. |

New table `public.inventory_history`:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `product_id` | `uuid not null references public.products(id) on delete cascade` | |
| `previous_quantity` | `integer not null default 0` | Stock before the change. |
| `quantity_changed` | `integer not null` | +addition / −deduction / +initial. |
| `new_quantity` | `integer not null` | Stock after the change (= prev + change). |
| `change_type` | `text not null` | `initial_stock \| stock_addition \| stock_adjustment \| order \| order_cancellation \| return \| manual_correction`. |
| `reference_id` | `text` (nullable) | Quote id (for `order`) or free-text reference (returns/adjustments). |
| `changed_by` | `text` (nullable) | Admin email, else `system`. |
| `created_at` | `timestamptz not null default now()` | |

Index on `(product_id, created_at desc)` for history listing; index on `created_at desc` for the global audit view.

Existing data backfill (SQL `UPDATE` inside the migration):

- `stock = 'in'` → `stock_quantity = 100`
- `stock = 'limited'` → `stock_quantity = 5`
- `stock = 'out'` → `stock_quantity = 0`
- `kind = 'measure'` (or slug in known bulk list) → `track_inventory = false`

## Shared logic (pure, unit-tested, no I/O)

New module `src/server/inventory.ts`:

- `getStockStatus(quantity: number, threshold: number = 10): "out_of_stock" | "limited" | "in_stock"` — single source of truth for the rule above.
- `getInventory(product): { tracking, quantity, threshold, status, label }` — wraps a product record into the customer-facing inventory shape; non-tracked products return `{ tracking: false, status: "on_request", label: "Available on Request" }`.
- `applyQuantityChange(prev, change)` → `{ newQuantity, quantityChanged }` — clamps: never below 0, never above previous + change (discards overshoot).

## Product types & catalog store

- `src/lib/catalog-types.ts` — replace `stock: StockStatus` with computed `stockStatus: StockStatus` plus new fields `stockQuantity: number`, `lowStockThreshold: number`, `trackInventory: boolean`.
- `src/lib/site.ts` — static `Product` mirrors the same shape; each seed product carries a sensible starting `stockQuantity` + threshold; static catalog computes `stockStatus` at module load via `getStockStatus`.
- `src/server/catalog-store.ts` — `mapProduct` reads the new columns and computes `stockStatus`; products with `track_inventory=false` surface `stockStatus: "on_request"`.

## Admin materials form

`src/components/admin/materials-view.tsx` product modal changes:

- **Remove** the Stock dropdown.
- **Add** Track Inventory toggle (Yes/No).
- **Add** Available Quantity (number input, `>= 0`).
- **Add** Low Stock Threshold (number input, default 10).
- **Unit** field becomes a **dropdown**: Bag, Piece, Pack, Box, Roll, Metre, Bucket, Load, Truck, Ton, Other.
- When Track Inventory = No, Quantity/Threshold inputs are hidden; a helper note ("Shown as Available on Request") replaces them.
- Live preview line in the modal: the computed status badge for the current quantity/threshold inputs.
- Validation schema in `src/server/validate.ts`: `stockQuantity: z.number().int().min(0).default(0)`, `lowStockThreshold: z.number().int().min(0).default(10)`, `trackInventory: z.boolean().default(true)`; **no** `stock` field accepted (`z.strict()` rejects it).

## Customer display (product card)

`src/components/product-card.tsx`:

| Status | Badge | Button behavior |
|---|---|---|
| `in_stock` | 🟢 **In Stock — {N} available** | Add to Quote enabled. |
| `limited` | 🟡 **Limited Stock — only {N} left** | Add to Quote enabled (single-unit limit note optional, not enforced this round). |
| `out_of_stock` | 🔴 **Out of Stock** | Add disabled → **Request Quote** button opens the quote/contact flow. |
| `on_request` | 🟣 **Available on Request** | Add disabled → **Request Quote** button. |

- Aggressive badge color/classes reused from the existing STOCK_BADGE_CLASSES map (`kind`-based label split is removed — `measure` products now share the same four-status badges via `on_request`).
- "Available on Request" / "Request Quote" button targets the contact/quote flow (`#quote` / WhatsApp), implemented with the existing quote builder entry pattern.

## Quote validation (server-side)

- `src/app/api/quote/route.ts` — on submit, after schema validation, resolve each item slug against the product store and enforce:
  - product exists & is visible,
  - `track_inventory = false` → allow (it's Available on Request; price set later by owner),
  - tracked → `quantity <= stock_quantity`, else HTTP 422/400 with message **"Only {X} bags are currently available for {name}."** (unit from product; singular/plural handled).
- Safety double-check: if the requested quantity exceeds current stock, reject the whole quote (immutable once customer-facing, honest by design).
- Same check runs in a shared helper `assertStockAvailable(product, requestedQty)` so the customer API and the won-transition can reuse it.

## Stock deduction on "won"

- `setQuoteAccepted(id)` in `src/server/quote-store.ts`:
  1. Load quote with items.
  2. For each item, resolve product by slug; for tracked products, verify `quantity <= stock_quantity` via `assertStockAvailable` **before** any decrement. If any tracked product is short, the whole transition is **refused** — no partial decrements, no partial history writes.
  3. Otherwise apply each decrement (clamped, never below 0 by construction) and write an `order` history entry per line (`reference_id` = quote id, `changed_by` = admin email or `system`).
- **Decision (important):** if a tracked product has insufficient stock at the moment of "won", the transition is **refused** and a message lists the short lines ("Cement has 3 available, quote needs 20"). Reasoning: a won quote promises delivery; silently under-filling risks a wrong commitment. The owner adjusts quantity or re-prices first. Non-tracked (Available on Request) lines are always allowed — their quantities are agreed with the owner at quote time.
- If the DB is unavailable, `setQuoteAccepted` returns `false` as today (degrade path unchanged).

## Admin inventory overview

`src/components/admin/materials-view.tsx` (reuses existing view) + new API:

- **Summary strip** above the products table: **Total products | In Stock | Limited | Out of Stock | Available on Request** — computed from the loaded product list.
- **Status filter** dropdown: All / In Stock / Limited / Out of Stock / Available on Request.
- **Low stock alerts**: rows at/below threshold show a ⚠️ badge with "{n} left / {threshold} threshold"; a small inline quantity stepper lets the owner bump quantity without opening the modal (writes via inventory PATCH).

## Inventory history

- New admin route + view: `GET /api/admin/inventory/history` → newest-first list; UI table: product, change type (icon + label), `prev → new`, reference, changed by, timestamp.
- Manual adjustments (stepper, modal corrections) write `stock_adjustment`/`manual_correction` history entries; adding to a tracked product writes `stock_addition`; the migration backfill writes one `initial_stock` row per product.

## API surface

| Route | Methods | Notes |
|---|---|---|
| `/api/admin/inventory` | GET | summary counts + optional `status` filter (reuses catalog listing + inventory helpers). |
| `/api/admin/inventory` | PATCH | `{ id, quantityChange, changeType, referenceId?, note? }` → writes history; clamps; refuses below-zero. |
| `/api/admin/inventory/history` | GET | newest-first audit list. |
| `/api/admin/catalog/products` | PUT/POST | extended to accept new inventory fields (rejects `stock`). |

## Error handling / fallback

- Customer quote API: 422 `stock_unavailable` with human message; reuse existing `validation_failed` shape for schema errors.
- Admin inventory APIs: 400 `validation_failed`, 403/401, 503 `storage_unavailable` (DB-unconfigured) — matches existing admin API conventions.
- Frontend degrades without Supabase: static catalog still computes statuses from its own seed data; quote submission keeps working against static data (no stock check possible → treated as Available on Request).

## Testing

- `src/server/inventory.test.ts` — pure: status thresholds (0/1/threshold/threshold+1), applyQuantityChange clamping (never negative, overshoot-discard).
- `src/server/validate.test.ts` — new fields accepted; legacy `stock` field rejected.
- `src/server/quote-store.test.ts` — won-transition deduction writes correct prev→new history; short-stock refusal returns false/message; DB-down degrade returns false.
- `src/app/api/quote/route.test.ts` — under-stock reject (exact message); on-request allow; non-existent slug reject.
- Existing suite green: `npx vitest run` → `npx tsc --noEmit` → `npm run build`.
- Manual smoke: admin adds quantity → card badge updates; mark quote won → quantity drops + history row; out-of-stock card shows Request Quote; filter/summary counts match.

## Deferred (out of scope this round)

- Payments-driven deduction trigger, reservations/holds on quote submission, auto reorder/supplier integration, backorder / partial fulfillment, multi-warehouse, barcodes, VAT/tax interplay, customer-facing "leave email" waitlist, automated low-stock alerts (email/WhatsApp to owner).

## Migration handoff

`0005_inventory.sql` is delivered for the user to paste into the Supabase SQL Editor (same pattern as 0002/0003). Until applied, admin inventory writes report `storage_unavailable`; the catalog store falls back to static seed data (which carries its own quantities), so consumers are unaffected — but **apply the migration together with the code deploy** so live admin writes and the live products table agree.