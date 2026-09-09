# Admin Panel Rearchitecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/admin` into a sidebar panel (Analytics, Messages, Customers, Materials, Sign out) and make the public catalog DB-backed with graceful static fallback.

**Architecture:** Existing Next 16 app + live Supabase `qubjxqbkipvokrbpxbqt`. The public catalog moves from static `src/lib/site.ts` to new Supabase tables (`categories`, `products`, `messages`, `customers`, `quotes.source`), with site.ts as automatic fallback when the DB is unavailable. Server modules (catalog-store, message-store, customer-store, analytics) follow the existing `quote-store.ts` + `audit.ts` `getSupabaseClient()` pattern. Admin CRUD APIs use the existing `requireOwner` + `withErrorHandling` + zod-strict pattern. A new sidebar shell switches `?view=` views, each a client component in `src/components/admin/`.

**Tech Stack:** Next.js 16 (App Router, ISR), React 19, TypeScript, Supabase postgres + Storage, Zod v4, @phosphor-icons/react, Tailwind v4, vitest.

## Global Constraints

- Follow existing patterns exactly: `require-owner.ts` guard, `with-error-handling.ts`, `audit.ts` (service-role, RLS-on), `.env.local` via `getSupabaseClient()`; never log secrets; tokens never in text fields.
- All admin APIs z-object `.strict()`; validate with `parseBody`; return 403 not-owner, 400 `validation_failed`, 503 `storage_unavailable`.
- Every admin mutation writes a `security_events` row via `audit("event_name", {...})`.
- Public catalog pages use `export const revalidate = 60` (ISR), never 500 when DB absent (fall back to `site.ts` data).
- Phones normalized `+233…` (existing `phoneSchema`); customers keyed by normalized phone.
- Brand tokens: `--color-primary #0d3d1a`, `--color-accent #f0b429`; white text on sidebar; no purple. Migrations applied by the user in the Supabase SQL Editor (postgres password broken) — code must be resilient before migration is applied.
- Commits only when the user explicitly asks (Phase A is currently uncommitted).
- Tests: `npx vitest run`, typecheck `npx tsc --noEmit`, `npm run build`. Existing 105 tests must stay green.

---

## File Structure

**Created:**
- `supabase/migrations/0002_cms.sql` — schema + seeds (user applies via SQL Editor)
- `src/server/storage.ts` — generalized bucket/upload helpers
- `src/server/catalog-store.ts` — DB-first catalog fetch with fallback
- `src/server/message-store.ts` — message persistence/list/read
- `src/server/customer-store.ts` — customer upsert/list/update
- `src/server/analytics.ts` — pure analytics computation
- `src/server/analytics.test.ts`
- `src/server/catalog-store.test.ts`
- `src/server/message-store.test.ts`
- `src/server/customer-store.test.ts`
- `src/server/storage.test.ts`
- `src/app/api/contact/route.ts` — public contact capture
- `src/app/api/catalog/route.ts` — public catalog (revalidate 60)
- `src/app/api/admin/catalog/products/route.ts`
- `src/app/api/admin/catalog/categories/route.ts`
- `src/app/api/admin/catalog/image/route.ts`
- `src/app/api/admin/messages/route.ts`
- `src/app/api/admin/customers/route.ts`
- `src/app/api/admin/analytics/route.ts`
- `src/lib/catalog-context.tsx` — `CatalogProvider` + `useCatalog`
- `src/components/admin/analytics-view.tsx`
- `src/components/admin/messages-view.tsx`
- `src/components/admin/customers-view.tsx`
- `src/components/admin/materials-view.tsx`

**Modified:**
- `src/server/profile-image.ts` — refactor onto `storage.ts`
- `src/server/quote-store.ts` — add `source` to `QuoteRecord`/`persistQuote`; add `updateQuote`
- `src/server/validate.ts` — add `contactSubmitSchema` (move), `messageUpdateSchema`, `customerUpdateSchema`, `productSchema`, `categorySchema`, `catalogQuerySchema`
- `src/server/validate.test.ts`
- `src/app/api/admin/quotes/route.ts` — manual add sets `source: "whatsapp"`
- `src/app/api/admin/quotes/status/route.ts` — unchanged
- `src/app/api/quote/route.ts` — persist `source: "web"` (verify)
- `src/app/(public)/contact/page.tsx` — submit via `/api/contact`
- `src/app/(public)/products/page.tsx` and `src/app/(public)/products/[category]/page.tsx` — ISR off `catalog-store`
- `src/components/quote-builder.tsx` — use `useCatalog`
- `src/app/admin/page.tsx` — render new shell
- `src/components/admin-dashboard.tsx` — becomes the shell (sidebar + view routing); Phase A hero/avatar/manual-add migrate into it
- `src/lib/forms.ts` — keep `sendWeb3Forms` helper; reused by `/api/contact`
- `src/app/globals.css` — sidebar scrollbar/active-state utilities as needed
- README runbook / docs update note (if touched, keep minimal)

---

## Task 1: Migration file + server storage module

**Files:**
- Create: `supabase/migrations/0002_cms.sql`
- Create: `src/server/storage.ts`
- Create: `src/server/storage.test.ts`
- Modify: `src/server/profile-image.ts` (refactor onto storage.ts)
- Test: `src/server/profile-image.test.ts`, `src/server/storage.test.ts`

**Interfaces:**
- Produces:
  - `ensureBucket(bucket: string): Promise<void>`
  - `uploadToStorage(input: { bucket: string; path: string; name: string; type: string; size: number; data: Uint8Array; minDimension?: number; allowedTypes: string[]; maxBytes: number; }): Promise<{ ok: true; url: string } | { ok: false; reason: string }>`
  - `storagePublicUrl(bucket: string, path: string): string`
  - `avatarPublicUrl(): string` (still exported from profile-image)
- Migration SQL: tables `categories`, `products`, `messages`, `customers`; `ALTER TABLE quotes ADD COLUMN source text NOT NULL DEFAULT 'web';` seeds for categories/products `ON CONFLICT DO NOTHING`.

- [ ] **Step 1: Write `0002_cms.sql`**

```sql
-- 0002_cms.sql — Admin panel + DB-backed catalog
-- Apply via Supabase SQL Editor. Idempotent.

create table if not exists public.categories (
  id text primary key,
  name text not null,
  short text not null default '',
  description text not null default '',
  image_url text not null default '',
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id text not null references public.categories(id) on delete cascade,
  name text not null,
  brand text not null default '',
  unit text not null default '',
  unit_price text not null default '',
  image_url text not null default '',
  description text not null default '',
  stock text not null default 'in',
  pricing_mode text not null default 'quote',
  kind text not null default 'unit',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null default '',
  area text not null default '',
  message text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  phone text primary key,
  name text not null default '',
  email text not null default '',
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotes add column if not exists source text not null default 'web';

-- seeds (idempotent)
insert into public.categories (id, name, short, description, image_url, sort_order, visible) values
  ('cement', 'Cement', 'Every bag counted, every delivery verified.', 'Quality cement brands for foundations, blocks and finishing, delivered bag-for-bag.', '/materials/cat-cement.jpg', 1, true),
  ('blocks', 'Blocks', 'Hollow and solid blocks, counted and delivered to your gate.', 'Sandcrete hollow and solid blocks in the sizes your walling plan needs, counted block-for-block on delivery.', '/materials/cat-blocks.jpg', 2, true),
  ('iron-rods', 'Iron Rods', 'Structural steel cut, counted and delivered as specified.', 'Reinforcement bars in the sizes and tonnages your structural plan requires.', '/materials/cat-iron-rods.jpg', 3, true),
  ('roofing', 'Roofing Sheets', 'Roofing sheets, nails and accessories in one order.', 'Aluminium and long-span roofing sheets with the accessories to match.', '/materials/cat-roofing.jpg', 4, true),
  ('plumbing', 'Plumbing', 'PVC pipes, fittings and full bathroom rough-ins.', 'Pipes, fittings, valves and accessories for complete plumbing installations.', '/materials/cat-plumbing.jpg', 5, true),
  ('electricals', 'Electricals', 'Cables, conduits, fittings and smart switches.', 'Cable, conduit, sockets, switches and wiring accessories for safe installations.', '/materials/cat-electricals.jpg', 6, true),
  ('paint', 'Paint', 'Interior, exterior, primer and thinner for complete finishes.', 'Emulsion, enamel, primer and thinners for interior and exterior finishing.', '/materials/cat-paint.jpg', 7, true),
  ('tiles', 'Tiles', 'Porcelain, ceramic and wall tiles for every room.', 'Floor and wall tiles for homes, offices and commercial finishes.', '/materials/cat-tiles.jpg', 8, true),
  ('other', 'Other Materials', 'Everything else a site needs, from sand to tools.', 'A catch-all for the rest of your list — sand, tools and site essentials.', '/materials/cat-other.jpg', 9, true)
on conflict (id) do nothing;

insert into public.products (slug, category_id, name, brand, unit, unit_price, image_url, description, stock, pricing_mode, kind, sort_order) values
  ('ghacem-supacem-42-5', 'cement', 'Ghacem Super Cement 42.5R', 'GHACEM', 'bag (50kg)', 'GH₵ 120', '/materials/ghacem-supacem-42-5.jpg', 'General-purpose portland cement for blocks, foundations and slabs.', 'limited', 'fixed', 'unit', 1),
  ('dangote-cement-42-5', 'cement', 'Dangote Cement 42.5', 'Dangote', 'bag (50kg)', 'GH₵ 118', '/materials/dangote-cement-42-5.jpg', 'Consistent-setting portland cement, ideal for site work at scale.', 'in', 'fixed', 'unit', 2),
  ('cestos-cement-32-5', 'cement', 'CESTOS Cement 32.5', 'CESTOS', 'bag (50kg)', 'GH₵ 110', '/materials/cestos-cement-32-5.jpg', 'Value portland cement for render, screed and non-structural work.', 'in', 'fixed', 'unit', 3),
  ('hollow-block-6-inch', 'blocks', 'Hollow Block 6 inch', 'Sandcrete', 'block', 'GH₵ 13', '/materials/hollow-block-6-inch.jpg', 'Sandcrete hollow block for partitions and boundary walls.', 'in', 'fixed', 'unit', 1),
  ('hollow-block-9-inch', 'blocks', 'Hollow Block 9 inch', 'Sandcrete', 'block', 'GH₵ 17', '/materials/hollow-block-9-inch.jpg', 'Load-bearing sandcrete hollow block for main walls.', 'in', 'fixed', 'unit', 2),
  ('sandcrete-solid-block', 'blocks', 'Solid Block 6x9', 'Sandcrete', 'block', 'GH₵ 19', '/materials/sandcrete-solid-block.jpg', 'Solid sandcrete block where extra strength is needed.', 'limited', 'fixed', 'unit', 3),
  ('deformed-bar-12mm', 'iron-rods', 'Deformed Bar 12mm', 'Standard', 'piece (12m)', 'GH₵ 95', '/materials/deformed-bar-12mm.jpg', 'High-yield deformed bar for beams, columns and slabs.', 'in', 'quote', 'unit', 1),
  ('deformed-bar-16mm', 'iron-rods', 'Deformed Bar 16mm', 'Standard', 'piece (12m)', 'GH₵ 168', '/materials/deformed-bar-16mm.jpg', 'Heavy structural reinforcement for columns and transfer beams.', 'limited', 'quote', 'unit', 2),
  ('binding-wire-roll', 'iron-rods', 'Binding Wire', 'Standard', 'roll (3kg)', 'GH₵ 55', '/materials/binding-wire-roll.jpg', 'Soft iron binding wire for tying reinforcement cages.', 'in', 'fixed', 'unit', 3),
  ('long-span-roofing-sheet', 'roofing', 'Long-Span Roofing Sheet', 'Aluworks', 'sheet (6m)', 'GH₵ 165', '/materials/long-span-roofing-sheet.jpg', 'Zincalume long-span sheet with a 10-year warranty.', 'limited', 'quote', 'unit', 1),
  ('roofing-roofmate-r', 'roofing', 'Roofing Sheet Roofmate R', 'Roofmate', 'sheet (6m)', 'GH₵ 175', '/materials/roofing-roofmate-r.jpg', 'Popular corrugated profile for residential roofing.', 'in', 'quote', 'unit', 2),
  ('roofing-nails-2kg', 'roofing', 'Roofing Nails', 'Standard', 'pack (2kg)', 'GH₵ 40', '/materials/roofing-nails-2kg.jpg', 'Galvanised roofing nails with washers, roof-ready.', 'in', 'fixed', 'unit', 3),
  ('pvc-pipe-6-inch', 'plumbing', 'PVC Pipe 6 inch', 'Polytank/Javelin', 'piece (6m)', 'GH₵ 145', '/materials/pvc-pipe-6-inch.jpg', 'High-pressure PVC drainage pipe with sockets.', 'out', 'fixed', 'unit', 1),
  ('pvc-pipe-1-5-inch', 'plumbing', 'PVC Pipe 1.5 inch', 'Javelin', 'piece (6m)', 'GH₵ 32', '/materials/pvc-pipe-1-5-inch.jpg', 'Cold-water supply pipe, pressure rated.', 'in', 'fixed', 'unit', 2),
  ('bathroom-faucet-set', 'plumbing', 'Bathroom Faucet Set', 'Local/PBG', 'set', 'GH₵ 220', '/materials/bathroom-faucet-set.jpg', 'Complete basin, shower and sink mixer set.', 'limited', 'fixed', 'unit', 3),
  ('electric-cable-2-5mm', 'electricals', 'Electric Cable 2.5mm', 'CCA/Oman', 'roll (90m)', 'GH₵ 260', '/materials/electric-cable-2-5mm.jpg', 'Solid copper PVC cable for power circuits and sockets.', 'in', 'fixed', 'unit', 1),
  ('surface-mount-socket', 'electricals', 'Surface Mount Socket', 'Panasonic', 'piece', 'GH₵ 45', '/materials/surface-mount-socket.jpg', 'Double-pole power socket with plain cover.', 'in', 'fixed', 'unit', 2),
  ('led-bulb-15w', 'electricals', 'LED Bulb 15W', 'Philips', 'piece', 'GH₵ 28', '/materials/led-bulb-15w.jpg', 'Warm-white LED, long life, low energy.', 'out', 'fixed', 'unit', 3),
  ('interior-emulsion-20l', 'paint', 'Interior Emulsion 20L', 'Kansai', 'bucket (20L)', 'GH₵ 320', '/materials/interior-emulsion-20l.jpg', 'Washable interior emulsion, single pack.', 'in', 'fixed', 'unit', 1),
  ('exterior-paint-20l', 'paint', 'Exterior Paint 20L', 'Kansai', 'bucket (20L)', 'GH₵ 360', '/materials/exterior-paint-20l.jpg', 'Weather-resistant exterior emulsion or enamel.', 'limited', 'fixed', 'unit', 2),
  ('paint-primer-20l', 'paint', 'Primer 20L', 'Standard', 'bucket (20L)', 'GH₵ 190', '/materials/paint-primer-20l.jpg', 'Wall primer to seal surfaces before the top coat.', 'in', 'fixed', 'unit', 3),
  ('paint-thinner-5l', 'paint', 'Paint Thinner 5L', 'Standard', 'gallon (5L)', 'GH₵ 95', '/materials/paint-thinner-5l.jpg', 'For thinning and cleaning enamel surfaces.', 'in', 'fixed', 'unit', 4),
  ('porcelain-floor-60x60', 'tiles', 'Porcelain Floor 60x60', 'Twyford', 'box (4 pcs)', 'GH₵ 210', '/materials/porcelain-floor-60x60.jpg', 'Matte porcelain floor tile, low water absorption, heavy traffic.', 'in', 'fixed', 'unit', 1),
  ('ceramic-wall-30x60', 'tiles', 'Ceramic Wall 30x60', 'Twyford', 'box (6 pcs)', 'GH₵ 160', '/materials/ceramic-wall-30x60.jpg', 'Glazed ceramic wall tile for bathrooms and kitchens.', 'in', 'fixed', 'unit', 2),
  ('porcelain-floor-80x80', 'tiles', 'Porcelain Floor 80x80', 'Mosaic', 'box (3 pcs)', 'GH₵ 290', '/materials/porcelain-floor-80x80.jpg', 'Large-format polished porcelain for living spaces.', 'limited', 'fixed', 'unit', 3),
  ('sharp-sand', 'other', 'Sharp Sand', 'Local', 'trip (tipper)', 'GH₵ 850', '/materials/sharp-sand.jpg', 'Washed sharp sand for blockwork and plastering, priced by delivery distance.', 'in', 'quote', 'measure', 1),
  ('wheelbarrow', 'other', 'Wheelbarrow', 'Local', 'piece', 'GH₵ 450', '/materials/wheelbarrow.jpg', 'Heavy-duty single-wheel barrow for site use.', 'limited', 'fixed', 'unit', 2),
  ('shovel-spade-set', 'other', 'Shovel & Spade Set', 'Local', 'set', 'GH₵ 180', '/materials/shovel-spade-set.jpg', 'Basic digging and mixing tools for site work.', 'in', 'fixed', 'unit', 3)
on conflict (slug) do nothing;
```

- [ ] **Step 2: Write `src/server/storage.test.ts`** (failing first: pure helpers don't exist)

```ts
import { describe, expect, it } from "vitest";
import { validateImageFile } from "./storage";

describe("validateImageFile", () => {
  it("accepts an allowed type within size", () => {
    const file = { name: "a.jpg", type: "image/jpeg", size: 1_000 } as File;
    expect(validateImageFile(file, new Set(["image/jpeg"]), 3_000_000).ok).toBe(true);
  });
  it("rejects a disallowed type", () => {
    const file = { name: "a.txt", type: "text/plain", size: 10 } as File;
    const result = validateImageFile(file, new Set(["image/jpeg"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("JPEG");
  });
  it("rejects an oversized file", () => {
    const file = { name: "a.jpg", type: "image/jpeg", size: 4_000_000 } as File;
    const result = validateImageFile(file, new Set(["image/jpeg"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("3 MB");
  });
});

describe("storagePublicUrl", () => {
  it("builds the public object URL", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    expect(storagePublicUrl("catalog-images", "products/cement.jpg")).toBe(
      "https://project.supabase.co/storage/v1/object/public/catalog-images/products/cement.jpg",
    );
    vi.unstubAllEnvs();
  });
  it("returns empty when env missing", () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(storagePublicUrl("catalog-images", "x.jpg")).toBe("");
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run src/server/storage.test.ts` → FAIL (module missing)
- [ ] **Step 4: Write `src/server/storage.ts`**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./audit";

export type ImageValidationResult = { ok: true } | { ok: false; reason: string };

export function validateImageFile(
  file: Pick<File, "name" | "type" | "size">,
  allowedTypes: Set<string>,
  maxBytes: number,
): ImageValidationResult {
  if (!allowedTypes.has(file.type)) {
    return { ok: false, reason: `Upload a ${[...allowedTypes].map((t) => t.split("/")[1].toUpperCase()).join(", ")} image.` };
  }
  if (file.size > maxBytes) {
    return { ok: false, reason: `Image is too large — keep it under ${Math.round(maxBytes / 1e6)} MB.` };
  }
  return { ok: true };
}

export function storagePublicUrl(bucket: string, path: string): string {
  const base = process.env.SUPABASE_URL ?? "";
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export async function ensureBucket(client: SupabaseClient, bucket: string): Promise<void> {
  const { data: existing } = await client.storage.getBucket(bucket);
  if (existing) return;
  const { error } = await client.storage.createBucket(bucket, { public: true });
  if (error && error.message && !/already exist/i.test(error.message)) {
    throw error;
  }
}

export type UploadInput = {
  bucket: string;
  path: string;
  name: string;
  type: string;
  size: number;
  data: Uint8Array;
  allowedTypes?: Set<string>;
  maxBytes?: number;
};

export type UploadResult = { ok: true; url: string } | { ok: false; reason: string };

export async function uploadToStorage(input: UploadInput): Promise<UploadResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, reason: "Storage not configured" };
  const allowedTypes = input.allowedTypes ?? new Set(["image/jpeg", "image/png", "image/webp"]);
  const maxBytes = input.maxBytes ?? 5 * 1024 * 1024;
  const validation = validateImageFile({ name: input.name, type: input.type, size: input.size }, allowedTypes, maxBytes);
  if (!validation.ok) return validation;
  try {
    await ensureBucket(client, input.bucket);
    const { error } = await client.storage
      .from(input.bucket)
      .upload(input.path, input.data, { upsert: true, contentType: input.type });
    if (error) return { ok: false, reason: `Upload failed: ${error.message}` };
    const url = storagePublicUrl(input.bucket, input.path);
    if (!url) return { ok: false, reason: "Storage not configured" };
    return { ok: true, url };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Upload failed" };
  }
}
```

- [ ] **Step 5: Refactor `src/server/profile-image.ts` to use storage.ts** — replace `uploadProfileImage`, `ensureProfileBucket`, `avatarPublicUrl`, `validateAvatarFile` internals with calls to `ensureBucket`/`uploadToStorage`/`storagePublicUrl` while keeping the same public surface (`avatarPublicUrl`, `uploadProfileImage`, `validateAvatarFile`, constants `PROFILE_BUCKET`, `PROFILE_OBJECT`, `MAX_AVATAR_BYTES`, `MIN_AVATAR_DIMENSION`, `AVATAR_TYPES`), and keep `src/server/profile-image.test.ts` green.
- [ ] **Step 6: Run storage + profile tests** — `npx vitest run src/server/storage.test.ts src/server/profile-image.test.ts` → PASS
- [ ] **Step 7: Commit** (only if user asked; this repo currently requires explicit go-ahead — skip otherwise)

---

## Task 2: Server stores — catalog, messages, customers; analytics

**Files:**
- Create: `src/server/catalog-store.ts`, `src/server/message-store.ts`, `src/server/customer-store.ts`, `src/server/analytics.ts`
- Create: `src/server/catalog-store.test.ts`, `src/server/message-store.test.ts`, `src/server/customer-store.test.ts`, `src/server/analytics.test.ts`
- Modify: `src/server/quote-store.ts` (add `source` to `QuoteRecord` + `persistQuote`; add `updateQuote`)

**Interfaces:**
- Produces:
  - `catalog-store`: `fetchCategories(db: { categories: Category[] } | null): Promise<Category[]>`, `fetchProducts(...): Promise<Product[]>` — return static fallback when DB unavailable; `catalogAvailable(): boolean`
  - `message-store`: `persistMessage(input: { name; phone; email?; area?; message }): Promise<boolean>`, `listMessages(limit?): Promise<MessageRecord[]>`, `setMessageRead(id, read): Promise<boolean>`, `upsertCustomerViaMessage(…)` (thin wrapper into customer-store)
  - `customer-store`: `upsertCustomer(phone, { name, email }): Promise<boolean>`, `listCustomers(): Promise<CustomerRecord[]>`, `updateCustomer(phone, patch: { notes?; status? }): Promise<boolean>`
  - `analytics`: `computeAnalytics({ quotes, messages, customers }): AnalyticsResult` — pure; `AnalyticsResult` shape: `{ totals, thisWeekNew, statusFunnel, topItems, topAreas, sourceSplit, recentActivity, customerCount, unreadMessages }`
- Types `Category`, `Product`, `MessageRecord`, `CustomerRecord` re-exported from a new `src/lib/catalog-types.ts` (shared shapes identical to `site.ts`, with `visible`/`sortOrder` added optional).

- [ ] **Step 1: Write type mirrors + failing tests**

`src/lib/catalog-types.ts`:
```ts
export type StockStatus = "in" | "limited" | "out";
export type PricingMode = "fixed" | "quote";
export type ProductKind = "unit" | "measure";
export type CatalogCategory = { id: string; name: string; short: string; description: string; image: string; imageUrl?: string; sortOrder?: number; visible?: boolean };
export type CatalogProduct = { slug: string; categoryId: string; name: string; brand: string; unit: string; unitPrice: string; image: string; imageUrl?: string; description: string; stock: StockStatus; pricingMode: PricingMode; kind: ProductKind; visible?: boolean; sortOrder?: number };
export type QuoteSource = "web" | "whatsapp" | "contact";
export type MessageRecord = { id: string; name: string; phone: string; email: string | null; area: string; message: string; read: boolean; created_at: string };
export type CustomerRecord = { phone: string; name: string; email: string | null; notes: string; status: string; requestCount: number; lastContactAt: string | null; bestStatus: string | null; sources: string[]; createdAt: string; updatedAt: string };
```

Test `src/server/catalog-store.test.ts` (DB unavailable → fallback; available → DB rows mapped):
```ts
import { describe, expect, it, vi } from "vitest";
import { fetchCategories } from "./catalog-store";

vi.mock("./audit", () => ({ getSupabaseClient: () => null }));

describe("fetchCategories", () => {
  it("falls back to static site data when DB is unavailable", async () => {
    const result = await fetchCategories();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0].id).toBe("cement");
  });
});
```

Tests for `message-store`, `customer-store`, `analytics` (pure `computeAnalytics` with a fixture — assert totals, funnel, sourceSplit, topItems ordering, recentActivity merge, unreadMessages).

- [ ] **Step 2: Run to verify they fail**
- [ ] **Step 3: Implement the three stores + analytics** following `quote-store.ts` patterns exactly (guarded `getSupabaseClient()`, `.from(...).select("*")`, console.warn on error, return false/[]).
  - `listCustomers`: single query joining `quotes` and `messages` groups with `customers` on `phone`; compute in JS (keep simple, N small). Sources collected from `quotes.source` and `messages`.
  - `computeAnalytics`: pure function on passed records; `topItems` sums `items[].quantity` across quotes; `recentActivity` = merged + sorted by `created_at` desc, capped 10, each `{ kind: "quote"|"message"|"event", label, created_at, meta }`.
- [ ] **Step 4: Modify `quote-store.ts`** to add `source: QuoteSource` (default `"web"`) on `QuoteInput`/`QuoteRecord`, persist it, and add:
```ts
export async function updateQuote(id: string, patch: Partial<Pick<QuoteRecord, "name"|"phone"|"email"|"area"|"note"|"items"|"status"|"source">>): Promise<boolean>
```
- [ ] **Step 5: Run all new tests + full suite** — `npx vitest run` → all green
- [ ] **Step 6: Commit** (only on user go-ahead)

---

## Task 3: Public API — `/api/contact`, `/api/catalog`; quote source field

**Files:**
- Create: `src/app/api/contact/route.ts`
- Create: `src/app/api/catalog/route.ts`
- Modify: `src/app/api/quote/route.ts` (source: "web")
- Modify: `src/app/api/admin/quotes/route.ts` (manual POST → source: "whatsapp")
- Modify: `src/lib/forms.ts` (keep Web3Forms helper; route no longer public-facing solely)
- Modify: `src/app/(public)/contact/page.tsx` → POST `/api/contact`
- Modify: `src/components/quote-builder.tsx` → persist source via `/api/quote` (verify already sets it; add if missing)

**Interfaces:**
- Consumes: `contactSubmitSchema`, `persistMessage`, `upsertCustomer`, `sendWeb3Forms`
- Produces: `/api/contact` (POST 201 `{ ok: true }`, 400 validation, 503 storage-unavailable but still returns 201-with-email-sent fallback), `/api/catalog` (GET `{ categories, products, dbAvailable }`)

- [ ] **Step 1: Add `contactSubmitSchema` to `src/server/validate.ts`** (move from test expectations; it already exists in `validate.test.ts` — promote to a real export) plus `catalogQuerySchema` if needed.
- [ ] **Step 2: Implement `/api/contact`**

```ts
// POST only. Validates via parseBody(contactSubmitSchema). Persists to messages,
// upserts customer, audits "contact_message", then best-effort sendWeb3Forms.
// Always returns { ok: true } 201 when the message was accepted (email delivery is best-effort).
```
- [ ] **Step 3: Implement `/api/catalog`** — `export const revalidate = 60;` calls `fetchCategories()`/`fetchProducts()`, returns `{ categories, products, dbAvailable }`.
- [ ] **Step 4: Point the contact page form** at `/api/contact` (keep validation UX), and ensure quote fetch body already tags source (add `source: "web"`).
- [ ] **Step 5: Extend `validate.test.ts`** with contact schema cases (valid, invalid phone, optional email). Run vitest → green.
- [ ] **Step 6: Dev spot-check** — `curl.exe -s -L -X POST http://localhost:3000/api/contact -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"phone\":\"0558850667\",\"message\":\"hi\"}"` → 201. `curl.exe -s -L http://localhost:3000/api/catalog` → static fallback JSON (DB not migrated yet) → `dbAvailable: true` (Supabase configured; tables missing → route returns fallback).
- [ ] **Step 7: Commit** (on user go-ahead)

---

## Task 4: Admin APIs — catalog CRUD, messages, customers, analytics

**Files:**
- Create: `src/app/api/admin/catalog/products/route.ts`, `catalog/categories/route.ts`, `catalog/image/route.ts`, `messages/route.ts`, `customers/route.ts`, `analytics/route.ts`
- Modify: `src/server/validate.ts` (add `productSchema`, `categorySchema`, `messageUpdateSchema`, `customerUpdateSchema`, `catalogItemIdSchema`)
- Modify: `src/server/validate.test.ts`

**Interfaces:**
- Consumes: stores from Task 2, `uploadToStorage` from Task 1, `requireOwner`, `withErrorHandling`, `parseBody`
- Produces (all requireOwner, else 403):
  - `/api/admin/catalog/products` — GET list, POST create, PATCH `{id, ...patch}`, DELETE `{id}`
  - `/api/admin/catalog/categories` — same
  - `/api/admin/catalog/image` — POST multipart `file` + `bucket` (fixed `catalog-images`) → 200 `{url}`
  - `/api/admin/messages` — GET list (limit 100, newest first), PATCH `{id, read?} | {id, ...editFields}`
  - `/api/admin/customers` — GET list, PATCH `{phone, notes?, status?}`
  - `/api/admin/analytics` — GET `{ metrics, funnel, topItems, topAreas, sourceSplit, recentActivity }`
- Every mutation audits: `product_created/updated/deleted`, `category_created/updated/deleted`, `message_read/message_updated`, `customer_updated`.

- [ ] **Step 1: Add schemas to `validate.ts`**

```ts
export const productSchema = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  categoryId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).default(""),
  unit: z.string().trim().max(40).default(""),
  unitPrice: z.string().trim().max(40).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  description: z.string().trim().max(1000).default(""),
  stock: z.enum(["in", "limited", "out"]),
  pricingMode: z.enum(["fixed", "quote"]),
  kind: z.enum(["unit", "measure"]),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
}).strict();
export const categorySchema = z.object({
  id: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(80),
  short: z.string().trim().max(120).default(""),
  description: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
}).strict();
export const catalogItemIdSchema = z.object({ id: z.string().trim().min(1) }).strict();
export const messageUpdateSchema = z.object({
  id: z.string().trim().min(1),
  read: z.boolean().optional(),
  message: z.string().trim().max(5000).optional(),
  name: z.string().trim().max(80).optional(),
  phone: phoneSchema.optional(),
}).strict();
export const customerUpdateSchema = z.object({
  phone: phoneSchema,
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(["new", "active", "won", "lost", "blocked"]).optional(),
}).strict();
```

- [ ] **Step 2: Write schema tests** in `validate.test.ts` (valid products both pricing modes, invalid slug, strict reject extra keys; message & customer update happy/error). Run → FAIL.
- [ ] **Step 3: Implement the three catalog routes** (GET/POST/PATCH/DELETE each; PATCH accepts a partial of `productSchema`/`categorySchema` minus `slug`/`id` — validate with `.partial()`; enforce slug/id immutability by ignoring those keys in PATCH). Image route uses `uploadToStorage({ bucket: "catalog-images", path: \`catalog/${Date.now()}-${basename}\`, ... })`.
- [ ] **Step 4: Implement `messages`, `customers`, `analytics` routes.**
- [ ] **Step 5: Run full suite + typecheck** — `npx vitest run` + `npx tsc --noEmit` → green
- [ ] **Step 6: Dev spot-check (owner via dev bypass)** — `GET /api/admin/analytics`, `GET/POST/PATCH/DELETE` a throwaway product, image upload with a real JPEG, `GET /api/admin/customers` (empty list is fine pre-migration), `GET /api/admin/messages`. Confirm 403s with no cookie. Clean up throwaway product.
- [ ] **Step 7: Commit** (on user go-ahead)

---

## Task 5: Admin shell — sidebar + view routing + sign out

**Files:**
- Modify: `src/app/admin/page.tsx` (render `AdminShell`), `src/components/admin-dashboard.tsx` (convert into the shell; keep Phase A avatar/hero pieces as the sidebar header + analytics content where suitable)
- Create: `src/components/admin/sidebar.tsx`, and the 4 view components (Analytics, Messages, Customers, Materials)

**Interfaces:**
- Consumes: all admin APIs from Task 4, `useSession` (for avatar/email/signOut), `?view=` search param
- Produces: `AdminShell` — reads/writes `?view=analytics|messages|customers|materials`, mobile pill nav, per-view badges (new quotes, unread messages) polled every 30s via `/api/admin/analytics`; Sign out button calls `session.signOut()` then `router.push("/")`.

- [ ] **Step 1: Sidebar component** — deep-green `#0d3d1a` w/ `.dashboard-grid-bg`, avatar (Phase A upload) + "Welcome back, {prefix}" + email, nav items (hidden on mobile), Sign out at bottom. Active item: accent-tinted bg + gold left bar. Badges beside Messages (new quotes + unread).
- [ ] **Step 2: View components**
  - `analytics-view.tsx`: KPI cards, funnel bar, top materials/top areas lists, source split chips, recent activity feed, CSV export (reuse `buildCsv`).
  - `messages-view.tsx`: `?tab=quotes|contact`; Quotes table (status select, edit-detail drawer incl. items editor) from `/api/admin/quotes`; Contact list (read toggle, edit, mark-all-read) from `/api/admin/messages`.
  - `customers-view.tsx`: search box + list from `/api/admin/customers`; detail panel (notes/status PATCH, quote history by filtering `/api/admin/quotes` by phone — add phone filter support to `listQuotes`).
  - `materials-view.tsx`: `?tab=products|categories`; tables + add/edit forms + image upload + hide/show + delete confirm via the catalog routes.
- [ ] **Step 3: Wire `admin/page.tsx`** to render `AdminShell`; delete moved code from old dashboard (keep `buildCsv`/`formatDate`/`truncate`/`formatItems` helpers in a shared `src/components/admin/helpers.ts`).
- [ ] **Step 4: Typecheck + build** → clean; dev spot-check each view with dev bypass.
- [ ] **Step 5: Commit** (on user go-ahead)

---

## Task 6: Public site switch + CatalogProvider + verification

**Files:**
- Modify: `src/app/(public)/products/page.tsx` + `src/app/(public)/products/[category]/page.tsx` → ISR off `catalog-store`, filter `visible`
- Create: `src/lib/catalog-context.tsx` (CatalogProvider fetching `/api/catalog`)
- Modify: `src/components/quote-builder.tsx` → `useCatalog()` source (fallback to static until loaded)

**Interfaces:**
- Consumes: `catalog-store`, `/api/catalog`
- Produces: `CatalogProvider`/`useCatalog` (`{ categories, products, loading }`), ISR pages with `revalidate = 60`

- [ ] **Step 1: Products pages** — replace static imports with `fetchCategories()`/`fetchProducts()` (server components), add `export const revalidate = 60`, drop `generateStaticParams` (keep the `[category]` param validated at runtime, 404 unknown), keep all existing UI/styling.
- [ ] **Step 2: CatalogProvider** — client context; fetch once on mount with `credentials: "same-origin"`; expose `{ categories, products, loading }`; fall back to `site.ts` values until fetch resolves.
- [ ] **Step 3: Quote builder** — consume `useCatalog`, keep `validateQuoteContact` + `/api/quote` submit behavior (already wired in Phase A).
- [ ] **Step 4: Full verification gates** — `npx vitest run` (105+ new = all green), `npx tsc --noEmit`, `npm run build`, dev spot-checks: `/products` renders from fallback; after user applies `0002_cms.sql`, an admin product edit reflects on `/products` within ~60s.
- [ ] **Step 5: Migration handoff** — copy `supabase/migrations/0002_cms.sql` content to the user to paste into the Supabase SQL Editor; then verify catalog/admin round-trip against live DB.
- [ ] **Step 6: Commit** (only with user's explicit go-ahead)

---

## Self-Review Notes

- Spec coverage: sidebar (T5), analytics (T2/T4/T5), messages quoting+contact DB-backed (T2/T3/T4/T5), customers derived (T2/T4/T5), materials CRUD editable (T1 migration + T4 + T5), sign out (T5), public catalog DB-backed w/ fallback (T2/T3/T6), contact capture (T3), image upload (T1/T4), ISR 60s (T6), audit events (T4/T3), deferred items left out (marquee/testimonials/settings). 
- Phase A avatar/quote-capture code (uncommitted) is preserved and folded into the new shell in T5.
- Executing requires the user applying `0002_cms.sql` before live-DB verification (T6 step 5); everything before that runs on fallback.