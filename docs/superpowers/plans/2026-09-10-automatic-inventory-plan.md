# Automatic Inventory System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual stock-status dropdown with an automatic, quantity-driven inventory system — the owner manages quantities only, the system computes status and deducts on quote "won".

**Architecture:** Status is derived via a pure `getStockStatus()` function from `stock_quantity` + `low_stock_threshold`. Legacy `stock` column is dropped. New `inventory_history` table logs every change. Stock is validated at quote submission and deducted at "won" transition.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres), Zod v4, Vitest, Tailwind v4, phosphor-icons.

## Global Constraints

- Next.js 16 App Router with `export const runtime = "nodejs"` on API routes
- TypeScript strict mode — no `any`; use proper types
- Zod v4 — `import { z } from "zod"`; `.strict()` on all input schemas
- Vitest for testing; run via `npx vitest run` (avoids parallel-worker flakiness with `customer-auth.test.ts`)
- Typecheck via `npx tsc --noEmit`; build via `npm run build`
- Supabase client pattern: `getSupabaseClient()` from `src/server/audit.ts` — returns null if unconfigured
- Error responses: `badRequest(code, message, details?)` from `src/server/http-error.ts`
- Admin routes require `requireOwner(request)` → 403 if absent
- Public routes use `verifySameOrigin(request)` for CSRF; `enforceRateLimit` for throttling
- All API routes: `export const dynamic = "force-dynamic";`
- Every mutation route calls `await audit(event, metadata)` then `revalidatePublic()`
- Commit messages follow conventional format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`

---

## Phase 1 — Pure logic + static data

### Task 1: Create `src/server/inventory.ts` (pure helpers, no I/O)

**Files:**
- Create: `src/server/inventory.ts`

**Interfaces:**
- Produces: `getStockStatus(quantity, threshold)`, `applyQuantityChange(prev, change)`, `computeProductStatus(product)`, `findShortLines(items, products)`, types `StockStatusValue`, `InventoryInfo`, `ShortLine`

- [x] **Step 1: Create the inventory module**

```ts
// src/server/inventory.ts
// Pure inventory helpers — no I/O, no Supabase dependency.

export type StockStatusValue = "in_stock" | "limited" | "out_of_stock" | "on_request";

export type InventoryInfo = {
  tracking: boolean;
  quantity: number;
  threshold: number;
  status: StockStatusValue;
  label: string;
};

/**
 * Single source of truth for stock-status derivation.
 * Rules:
 *  - quantity <= 0             → out_of_stock
 *  - quantity <= threshold     → limited
 *  - otherwise                 → in_stock
 */
export function getStockStatus(
  quantity: number,
  threshold: number = 10,
): "in_stock" | "limited" | "out_of_stock" {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "limited";
  return "in_stock";
}

/**
 * Compute the human-readable label for a given status.
 */
export function stockStatusLabel(status: StockStatusValue): string {
  switch (status) {
    case "in_stock":    return "In Stock";
    case "limited":     return "Limited Stock";
    case "out_of_stock": return "Out of Stock";
    case "on_request":  return "Available on Request";
  }
}

/**
 * Apply a quantity change, clamping to >= 0.
 * Returns the new quantity and the actual change applied.
 */
export function applyQuantityChange(
  currentQuantity: number,
  change: number,
): { newQuantity: number; quantityChanged: number } {
  const newQuantity = Math.max(0, currentQuantity + change);
  const quantityChanged = newQuantity - currentQuantity;
  return { newQuantity, quantityChanged };
}

/**
 * Build a full inventory info record from a product-like object.
 * Non-tracked products always return "on_request".
 */
export function computeProductStatus(product: {
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
}): InventoryInfo {
  if (!product.trackInventory) {
    return {
      tracking: false,
      quantity: 0,
      threshold: 0,
      status: "on_request",
      label: "Available on Request",
    };
  }
  const status = getStockStatus(product.stockQuantity, product.lowStockThreshold);
  return {
    tracking: true,
    quantity: product.stockQuantity,
    threshold: product.lowStockThreshold,
    status,
    label: stockStatusLabel(status),
  };
}

/**
 * A single short line: the requested product was over the available quantity.
 */
export type ShortLine = {
  name: string;
  slug: string;
  requested: number;
  available: number;
};

/**
 * Pure, shared stock-shortage check. Returns the lines where the requested
 * quantity exceeds available stock. Non-tracked/products that are unknown
 * in the catalog are never flagged (they are best-effort / on request).
 */
export function findShortLines(
  items: { slug: string; quantity: number }[],
  products: { slug: string; name: string; unit?: string; trackInventory: boolean; stockQuantity: number }[],
): ShortLine[] {
  const bySlug = new Map(products.map((p) => [p.slug, p] as const));
  const short: ShortLine[] = [];
  for (const item of items) {
    const product = bySlug.get(item.slug);
    if (!product || !product.trackInventory) continue;
    if (item.quantity > product.stockQuantity) {
      short.push({
        name: product.name,
        slug: product.slug,
        requested: item.quantity,
        available: product.stockQuantity,
      });
    }
  }
  return short;
}
```

- [x] **Step 2: Write the failing test for getStockStatus**

Create `src/server/inventory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getStockStatus,
  applyQuantityChange,
  computeProductStatus,
  findShortLines,
  type ShortLine,
} from "./inventory";

describe("getStockStatus", () => {
  it("returns out_of_stock when quantity is 0", () => {
    expect(getStockStatus(0)).toBe("out_of_stock");
  });

  it("returns out_of_stock for negative quantity (clamp edge case)", () => {
    expect(getStockStatus(-5)).toBe("out_of_stock");
  });

  it("returns limited when quantity is 1 and threshold is 10", () => {
    expect(getStockStatus(1, 10)).toBe("limited");
  });

  it("returns limited when quantity equals threshold", () => {
    expect(getStockStatus(10, 10)).toBe("limited");
  });

  it("returns in_stock when quantity exceeds threshold", () => {
    expect(getStockStatus(11, 10)).toBe("in_stock");
  });

  it("defaults threshold to 10", () => {
    expect(getStockStatus(10)).toBe("limited");
    expect(getStockStatus(11)).toBe("in_stock");
  });

  it("handles custom threshold", () => {
    expect(getStockStatus(5, 5)).toBe("limited");
    expect(getStockStatus(6, 5)).toBe("in_stock");
  });
});

describe("applyQuantityChange", () => {
  it("adds quantity", () => {
    expect(applyQuantityChange(10, 5)).toEqual({ newQuantity: 15, quantityChanged: 5 });
  });

  it("deducts quantity", () => {
    expect(applyQuantityChange(10, -3)).toEqual({ newQuantity: 7, quantityChanged: -3 });
  });

  it("clamps to 0 on negative result", () => {
    expect(applyQuantityChange(3, -10)).toEqual({ newQuantity: 0, quantityChanged: -3 });
  });

  it("handles zero change", () => {
    expect(applyQuantityChange(5, 0)).toEqual({ newQuantity: 5, quantityChanged: 0 });
  });
});

describe("computeProductStatus", () => {
  it("returns on_request for non-tracked products", () => {
    const result = computeProductStatus({
      trackInventory: false,
      stockQuantity: 0,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("on_request");
    expect(result.tracking).toBe(false);
  });

  it("returns in_stock for tracked products above threshold", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 50,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("in_stock");
    expect(result.tracking).toBe(true);
  });

  it("returns limited for tracked products at or below threshold", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 7,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("limited");
  });

  it("returns out_of_stock for tracked products with 0 quantity", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 0,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("out_of_stock");
  });
});

describe("findShortLines", () => {
  const products = [
    { slug: "cement-42-5", name: "Ghacem Supacem", unit: "bag", trackInventory: true, stockQuantity: 10 },
    { slug: "sharp-sand", name: "Sharp Sand", unit: "trip", trackInventory: false, stockQuantity: 0 },
  ];

  it("flags a tracked item whose quantity exceeds available stock", () => {
    const short = findShortLines([{ slug: "cement-42-5", quantity: 20 }], products);
    expect(short).toEqual([
      { name: "Ghacem Supacem", slug: "cement-42-5", requested: 20, available: 10 },
    ]);
  });

  it("does not flag an item within stock", () => {
    expect(findShortLines([{ slug: "cement-42-5", quantity: 10 }], products)).toEqual([]);
  });

  it("never flags non-tracked (on-request) items", () => {
    expect(findShortLines([{ slug: "sharp-sand", quantity: 999 }], products)).toEqual([]);
  });

  it("is best-effort for unknown slugs", () => {
    expect(findShortLines([{ slug: "does-not-exist", quantity: 1 }], products)).toEqual([]);
  });

  it("reports multiple short lines", () => {
    const many = products.map((p) => ({ ...p, stockQuantity: 2 }));
    const short = findShortLines(
      [
        { slug: "cement-42-5", quantity: 5 },
        { slug: "sharp-sand", quantity: 5 },
      ],
      many,
    );
    expect(short).toHaveLength(1);
    expect(short[0].slug).toBe("cement-42-5");
  });
});
```

- [x] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/server/inventory.test.ts`
Expected: all tests PASS

- [x] **Step 4: Commit**

```bash
git add src/server/inventory.ts src/server/inventory.test.ts
git commit -m "feat: add pure inventory helpers (getStockStatus, applyQuantityChange, computeProductStatus, findShortLines)"
```

---

### Task 2: Add inventory fields to static catalog data

**Files:**
- Modify: `src/lib/site.ts`
- Modify: `src/lib/site.test.ts`

**Interfaces:**
- Produces: `Product` type gains `stockQuantity: number`, `lowStockThreshold: number`, `trackInventory: boolean`; `stock` field renamed to `stockStatus` (computed)

- [x] **Step 1: Update the Product type in site.ts**

Replace `stock: StockStatus` with computed fields. The `Product` type becomes:

```ts
export type Product = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  stockStatus: StockStatus;
  pricingMode: PricingMode;
  kind: ProductKind;
};
```

Remove the standalone `StockStatus` type from site.ts (it will live in catalog-types.ts instead). Add import:

```ts
import type { StockStatus } from "@/lib/catalog-types";
```

- [x] **Step 2: Update all 28 static products in site.ts**

For each product, replace `stock: "in"` / `"limited"` / `"out"` with the new fields. Mapping:

| Old `stock` | `stockQuantity` | `stockStatus` | `trackInventory` |
|---|---|---|---|
| `"in"` | `100` | `"in"` | `true` |
| `"limited"` | `5` | `"limited"` | `true` |
| `"out"` | `0` | `"out"` | `true` |

Exception: `sharp-sand` (slug: `"sharp-sand"`, kind: `"measure"`) gets `trackInventory: false`, `stockQuantity: 0`, `stockStatus: "in"`.

Each product entry changes from:
```ts
{ slug: "dangote-cement-42-5", ..., stock: "in", pricingMode: "fixed", kind: "unit" },
```
to:
```ts
{ slug: "dangote-cement-42-5", ..., stockQuantity: 100, lowStockThreshold: 10, trackInventory: true, stockStatus: "in", pricingMode: "fixed", kind: "unit" },
```

- [x] **Step 3: Update site.test.ts — the stock-status test**

Replace the test at line 56-65 ("tags every product with a valid stock status covering all three states"):

```ts
it("tags every product with computed stockStatus and inventory fields", () => {
  expect(products.length).toBe(28);
  for (const p of products) {
    expect(["in", "limited", "out"]).toContain(p.stockStatus);
    expect(p.stockQuantity).toBeGreaterThanOrEqual(0);
    expect(p.lowStockThreshold).toBeGreaterThanOrEqual(0);
    expect(typeof p.trackInventory).toBe("boolean");
  }
  const statuses = products.map((p) => p.stockStatus);
  expect(statuses).toContain("in");
  expect(statuses).toContain("limited");
  expect(statuses).toContain("out");
});
```

- [x] **Step 4: Run tests**

Run: `npx vitest run src/lib/site.test.ts`
Expected: all tests PASS

- [x] **Step 5: Commit**

```bash
git add src/lib/site.ts src/lib/site.test.ts
git commit -m "feat: add stockQuantity/threshold/trackInventory to static Product type and catalog data"
```

---

## Phase 2 — Database + type sync

### Task 3: Create database migration `0005_inventory.sql`

**Files:**
- Create: `supabase/migrations/0005_inventory.sql`

**Interfaces:**
- Produces: `products` table gains `stock_quantity`, `low_stock_threshold`, `track_inventory` columns; `stock` column dropped; `inventory_history` table created

- [x] **Step 1: Write the migration**

```sql
-- 0005_inventory.sql — Automatic inventory & stock status system
-- Apply via Supabase SQL Editor. Idempotent: safe to run twice.

-- ──────────────────────────────────────────────────────
-- 1. Add new columns to products
-- ──────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;

-- ──────────────────────────────────────────────────────
-- 2. Backfill from legacy stock labels, then drop the legacy column.
--    Guarded on column existence so re-running the migration is a no-op
--    (the UPDATEs would fail once `stock` is gone).
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'stock'
  ) THEN
    UPDATE public.products SET stock_quantity = 100 WHERE stock = 'in';
    UPDATE public.products SET stock_quantity = 5   WHERE stock = 'limited';
    UPDATE public.products SET stock_quantity = 0   WHERE stock = 'out';

    -- Mark measure/bulk products as non-tracked (Available on Request)
    UPDATE public.products SET track_inventory = false WHERE kind = 'measure';

    ALTER TABLE public.products DROP COLUMN stock;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────
-- 3. Non-negative constraint (backstop)
-- ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_stock_quantity_non_negative'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT chk_stock_quantity_non_negative
      CHECK (stock_quantity >= 0);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────
-- 4. Inventory history table
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_quantity integer NOT NULL DEFAULT 0,
  quantity_changed integer NOT NULL,
  new_quantity integer NOT NULL,
  change_type text NOT NULL,
  reference_id text,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_history_product
  ON public.inventory_history (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_history_created
  ON public.inventory_history (created_at DESC);

-- ──────────────────────────────────────────────────────
-- 5. Seed initial inventory history entries for existing products
-- ──────────────────────────────────────────────────────
INSERT INTO public.inventory_history (
  product_id, previous_quantity, quantity_changed, new_quantity, change_type, changed_by
)
SELECT
  p.id,
  0,
  p.stock_quantity,
  p.stock_quantity,
  'initial_stock',
  'system'
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_history h WHERE h.product_id = p.id
);
```

- [x] **Step 2: Commit**

```bash
git add supabase/migrations/0005_inventory.sql
git commit -m "feat: add inventory migration (0005) — stock_quantity, threshold, history table"
```

---

### Task 4: Update CatalogProduct type + catalog-store mapping

**Files:**
- Modify: `src/lib/catalog-types.ts`
- Modify: `src/server/catalog-store.ts`

**Interfaces:**
- Consumes: `getStockStatus`, `computeProductStatus` from `src/server/inventory.ts`
- Produces: `CatalogProduct` type gains `stockQuantity`, `lowStockThreshold`, `trackInventory`, `stockStatus`; `mapProduct` reads new DB columns and computes status; `ProductInput` accepts new fields; `createProduct`/`updateProduct` write new columns

- [x] **Step 1: Update CatalogProduct type in catalog-types.ts**

Replace `stock: StockStatus` with computed + inventory fields:

```ts
// Re-export for backward compat in other files
export type StockStatus = "in" | "limited" | "out";
// ... (keep existing PricingMode, ProductKind, QuoteSource types)

export type CatalogProduct = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  imageUrl?: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  stockStatus: StockStatus;
  pricingMode: PricingMode;
  kind: ProductKind;
  visible?: boolean;
  sortOrder?: number;
};
```

- [x] **Step 2: Update ProductInput in catalog-store.ts**

Replace `stock?: CatalogProduct["stock"]` with:

```ts
export type ProductInput = {
  slug: string;
  categoryId: string;
  name: string;
  brand?: string;
  unit?: string;
  unitPrice?: string;
  image?: string;
  description?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  pricingMode?: CatalogProduct["pricingMode"];
  kind?: CatalogProduct["kind"];
  visible?: boolean;
  sortOrder?: number;
};
```

- [x] **Step 3: Update mapProduct in catalog-store.ts**

Replace the existing `mapProduct` function:

```ts
import { computeProductStatus } from "./inventory";

function mapProduct(row: Record<string, unknown>): CatalogProduct {
  const pricingMode = row.pricing_mode?.toString();
  const kind = row.kind?.toString();
  const visible = row.visible === null || row.visible === undefined ? true : Boolean(row.visible);
  const stockQuantity = Number(row.stock_quantity ?? 0);
  const lowStockThreshold = Number(row.low_stock_threshold ?? 10);
  const trackInventory = Boolean(row.track_inventory ?? true);

  const statusInfo = computeProductStatus({
    trackInventory,
    stockQuantity,
    lowStockThreshold,
  });

  // Map status to legacy StockStatus for backward compat
  const stockStatus: CatalogProduct["stockStatus"] =
    statusInfo.status === "in_stock" ? "in"
    : statusInfo.status === "limited" ? "limited"
    : "out";

  return {
    slug: String(row.slug),
    categoryId: String(row.category_id),
    name: String(row.name),
    brand: String(row.brand ?? ""),
    unit: String(row.unit ?? ""),
    unitPrice: String(row.unit_price ?? ""),
    image: String(row.image_url ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    description: String(row.description ?? ""),
    stockQuantity,
    lowStockThreshold,
    trackInventory,
    stockStatus,
    pricingMode: pricingMode === "fixed" ? "fixed" : "quote",
    kind: kind === "measure" ? "measure" : "unit",
    visible,
    sortOrder: Number(row.sort_order ?? 0),
  };
}
```

- [x] **Step 4: Update fetchProducts select clause**

In `fetchProducts`, change the select string from:
```ts
.select("slug, category_id, name, brand, unit, unit_price, image_url, description, stock, pricing_mode, kind, visible, sort_order")
```
to:
```ts
.select("slug, category_id, name, brand, unit, unit_price, image_url, description, stock_quantity, low_stock_threshold, track_inventory, pricing_mode, kind, visible, sort_order")
```

- [x] **Step 5: Update createProduct to write new columns**

In `createProduct`, replace `stock: input.stock` with:
```ts
stock_quantity: input.stockQuantity ?? 0,
low_stock_threshold: input.lowStockThreshold ?? 10,
track_inventory: input.trackInventory ?? true,
```

- [x] **Step 6: Update updateProduct to write new columns**

In `updateProduct`, replace `stock: patch.stock` with:
```ts
stock_quantity: patch.stockQuantity,
low_stock_threshold: patch.lowStockThreshold,
track_inventory: patch.trackInventory,
```

- [x] **Step 7: Update the static→catalog mapper in `src/lib/catalog-context.tsx`**

In `mapSiteProducts` (around line 27-43), replace `stock: p.stock` with:
```ts
stockQuantity: p.stockQuantity,
lowStockThreshold: p.lowStockThreshold,
trackInventory: p.trackInventory,
stockStatus: p.stockStatus,
```

- [x] **Step 8: Update component test fixtures that still use `stock`**

- `src/components/product-search.test.tsx` (around line 77): in the mocked `/api/catalog` product, replace `stock: "in"` with `stockQuantity: 100, lowStockThreshold: 10, trackInventory: true, stockStatus: "in"`.
- `src/components/sections/category-grid.test.tsx` (around line 88): in the `PRODUCT` fixture, replace `stock: "in"` with `stockQuantity: 100, lowStockThreshold: 10, trackInventory: true, stockStatus: "in"`.

- [x] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (fix any type errors from the `stock` → `stockStatus` rename propagation)

- [x] **Step 10: Commit**

```bash
git add src/lib/catalog-types.ts src/server/catalog-store.ts src/lib/catalog-context.tsx src/components/product-search.test.tsx src/components/sections/category-grid.test.tsx
git commit -m "refactor: CatalogProduct uses stockQuantity/computed stockStatus instead of stored stock"
```

---

### Task 5: Update Zod validation schema

**Files:**
- Modify: `src/server/validate.ts`
- Modify: `src/server/validate.test.ts`

**Interfaces:**
- Consumes: new ProductInput type shape
- Produces: `productSchema` accepts `stockQuantity`, `lowStockThreshold`, `trackInventory`; rejects `stock`

- [x] **Step 1: Update productSchema in validate.ts**

Replace the `stock` field with inventory fields:

```ts
export const productSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug like 'ghacem-supacem-42-5'.")
      .min(1)
      .max(120),
    categoryId: z.string().trim().min(1).max(60),
    name: z.string().trim().min(1).max(120),
    brand: optionalText(80),
    unit: optionalText(30),
    unitPrice: optionalText(30),
    imageUrl: optionalText(500),
    description: optionalText(2000),
    stockQuantity: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(10),
    trackInventory: z.boolean().default(true),
    pricingMode: z.enum(["fixed", "quote"]).default("quote"),
    kind: z.enum(["unit", "measure"]).default("unit"),
    visible: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(9999).default(0),
  })
  .strict();
```

- [x] **Step 2: Update the existing productSchema test + add inventory tests in validate.test.ts**

First update the existing "productSchema passes a full product and defaults omission" test (around line 195-206): it asserts `expect(parsed.stock).toBe("in")`. `stock` no longer exists — replace that assertion with the new defaults:

```ts
it("productSchema passes a full product and defaults omission", () => {
  const parsed = productSchema.parse({
    slug: "Ghacem-Supacem",
    categoryId: "cement",
    name: "Ghacem Supacem",
    unitPrice: "GH¢ 98.00",
  });
  expect(parsed.slug).toBe("ghacem-supacem");
  expect(parsed.stockQuantity).toBe(0);
  expect(parsed.lowStockThreshold).toBe(10);
  expect(parsed.trackInventory).toBe(true);
  expect(parsed.pricingMode).toBe("quote");
  expect(parsed.brand).toBeUndefined();
});
```

Then find the `productSchema` test section and add:

```ts
describe("productSchema (inventory fields)", () => {
  const valid = {
    slug: "test-product",
    categoryId: "cement",
    name: "Test Product",
    stockQuantity: 50,
    lowStockThreshold: 10,
    trackInventory: true,
  };

  it("accepts valid inventory fields", () => {
    const parsed = productSchema.parse(valid);
    expect(parsed.stockQuantity).toBe(50);
    expect(parsed.lowStockThreshold).toBe(10);
    expect(parsed.trackInventory).toBe(true);
  });

  it("defaults stockQuantity to 0 when omitted", () => {
    const parsed = productSchema.parse({ ...valid, stockQuantity: undefined });
    expect(parsed.stockQuantity).toBe(0);
  });

  it("defaults lowStockThreshold to 10 when omitted", () => {
    const parsed = productSchema.parse({ ...valid, lowStockThreshold: undefined });
    expect(parsed.lowStockThreshold).toBe(10);
  });

  it("defaults trackInventory to true when omitted", () => {
    const parsed = productSchema.parse({ ...valid, trackInventory: undefined });
    expect(parsed.trackInventory).toBe(true);
  });

  it("rejects negative stockQuantity", () => {
    expect(() => productSchema.parse({ ...valid, stockQuantity: -1 })).toThrow();
  });

  it("rejects legacy stock field", () => {
    expect(() => productSchema.parse({ ...valid, stock: "in" })).toThrow();
  });
});
```

- [x] **Step 3: Run tests**

Run: `npx vitest run src/server/validate.test.ts`
Expected: all tests PASS

- [x] **Step 4: Commit**

```bash
git add src/server/validate.ts src/server/validate.test.ts
git commit -m "feat: productSchema accepts stockQuantity/threshold/trackInventory, rejects legacy stock"
```

---

### Task 6: Update admin API catalog products route

**Files:**
- Modify: `src/app/api/admin/catalog/products/route.ts`

**Interfaces:**
- Consumes: updated `productSchema` (new fields); updated `createProduct`/`updateProduct` (new input shape)

- [x] **Step 1: Update POST handler to pass new fields**

In the `POST` handler, change the `createProduct` call from:
```ts
const ok = await createProduct({
  slug: body.slug,
  categoryId: body.categoryId,
  name: body.name,
  brand: body.brand,
  unit: body.unit,
  unitPrice: body.unitPrice,
  image: body.imageUrl,
  description: body.description,
  stock: body.stock,
  pricingMode: body.pricingMode,
  kind: body.kind,
  visible: body.visible,
  sortOrder: body.sortOrder,
});
```
to:
```ts
const ok = await createProduct({
  slug: body.slug,
  categoryId: body.categoryId,
  name: body.name,
  brand: body.brand,
  unit: body.unit,
  unitPrice: body.unitPrice,
  image: body.imageUrl,
  description: body.description,
  stockQuantity: body.stockQuantity,
  lowStockThreshold: body.lowStockThreshold,
  trackInventory: body.trackInventory,
  pricingMode: body.pricingMode,
  kind: body.kind,
  visible: body.visible,
  sortOrder: body.sortOrder,
});
```

- [x] **Step 2: Update PUT handler to pass new fields**

Same change for `updateProduct` — replace `stock: body.stock` with `stockQuantity: body.stockQuantity, lowStockThreshold: body.lowStockThreshold, trackInventory: body.trackInventory`.

- [x] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [x] **Step 4: Commit**

```bash
git add src/app/api/admin/catalog/products/route.ts
git commit -m "refactor: catalog products API passes stockQuantity/threshold/trackInventory"
```

---

## Phase 3 — Admin UI

### Task 7: Rework admin materials form

**Files:**
- Modify: `src/components/admin/materials-view.tsx`

**Interfaces:**
- Consumes: `CatalogProduct` with `stockQuantity`, `lowStockThreshold`, `trackInventory`, `stockStatus`; computed `stockLabel`/`stockPill` from status

- [x] **Step 1: Update ProductForm type**

Replace `stock: "in" | "limited" | "out"` with:
```ts
type ProductForm = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  imageUrl: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  pricingMode: "fixed" | "quote";
  kind: "unit" | "measure";
  visible: boolean;
  sortOrder: number;
};
```

- [x] **Step 2: Update EMPTY_PRODUCT default**

```ts
const EMPTY_PRODUCT: ProductForm = {
  slug: "",
  categoryId: "",
  name: "",
  brand: "",
  unit: "",
  unitPrice: "",
  imageUrl: "",
  description: "",
  stockQuantity: 0,
  lowStockThreshold: 10,
  trackInventory: true,
  pricingMode: "quote",
  kind: "unit",
  visible: true,
  sortOrder: 0,
};
```

- [x] **Step 3: Update stockLabel/stockPill helper functions**

Replace the existing helpers (around lines 81-91):

```ts
function stockStatusLabel(status: CatalogProduct["stockStatus"]): string {
  if (status === "in") return "In Stock";
  if (status === "limited") return "Limited";
  return "Out of Stock";
}

function stockPill(status: CatalogProduct["stockStatus"]): string {
  if (status === "in") return "bg-emerald-600/15 text-emerald-700";
  if (status === "limited") return "bg-amber-600/15 text-amber-700";
  return "bg-rose-600/15 text-rose-700";
}
```

- [x] **Step 4: Update openProductModal and toggleProductVisible to use new fields**

In the `openProductModal` callback (around line 184), change:
```ts
stock: product.stock,
```
to:
```ts
stockQuantity: product.stockQuantity,
lowStockThreshold: product.lowStockThreshold,
trackInventory: product.trackInventory,
```

The visibility-toggle handler `toggleProductVisible` also spreads a full product into the PUT body and still sends `stock: product.stock` (around line 400). After Task 6 that is (a) a TS error — `CatalogProduct` no longer has `stock`, and (b) rejected by the `.strict()` `productSchema` (400), and (c) if left as-is would silently default the new fields back to `0/10/true`, wiping quantities on every visibility toggle. Replace `stock: product.stock,` in `toggleProductVisible` with the same three fields:
```ts
stockQuantity: product.stockQuantity,
lowStockThreshold: product.lowStockThreshold,
trackInventory: product.trackInventory,
```

- [x] **Step 5: Add the unit suggestion dropdown (spec: Unit field becomes a dropdown)**

The spec requires the Unit field to be a dropdown (Bag, Piece, Pack, Box, Roll, Metre, Bucket, Load, Truck, Ton, Other). Because existing rows carry descriptive units ("bag (50kg)", "trip (tipper)", "box (4 pcs)"), use an `<input list>` datalist — suggested options with free-text still allowed, so nothing existing breaks.

Replace lines 841-852 (the current Unit input in the two-column grid):

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label htmlFor="p-unit" className="text-sm font-medium text-ink">Unit</label>
    <input
      id="p-unit"
      type="text"
      list="unit-options"
      maxLength={30}
      value={productForm.unit}
      onChange={(e) => setProductForm((f) => ({ ...f, unit: e.target.value }))}
      placeholder="e.g. bag, kg, metre"
      className={`mt-2 ${inputClass(formErrors.unit)}`}
    />
    <datalist id="unit-options">
      <option value="Bag" />
      <option value="Piece" />
      <option value="Pack" />
      <option value="Box" />
      <option value="Roll" />
      <option value="Metre" />
      <option value="Bucket" />
      <option value="Load" />
      <option value="Truck" />
      <option value="Ton" />
      <option value="Other" />
    </datalist>
    {formErrors.unit ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.unit}</p> : null}
  </div>
  <div>
    <label htmlFor="p-kind" className="text-sm font-medium text-ink">Kind</label>
    <select
      id="p-kind"
      value={productForm.kind}
      onChange={(e) => setProductForm((f) => ({ ...f, kind: e.target.value as "unit" | "measure" }))}
      className={`mt-2 ${inputClass(formErrors.kind)}`}
    >
      <option value="unit">Unit</option>
      <option value="measure">Measure</option>
    </select>
  </div>
</div>
```

- [x] **Step 6: Replace the Stock dropdown in the modal**

Replace lines 897-923 (the `grid grid-cols-2 gap-4` containing Stock + Sort Order) with:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="inline-flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={productForm.trackInventory}
        onChange={(e) => setProductForm((f) => ({ ...f, trackInventory: e.target.checked }))}
        className="size-4 rounded border-primary/30 accent-[#0d3d1a]"
      />
      Track inventory
    </label>
    <p className="mt-1 text-xs text-ink-muted">
      {productForm.trackInventory
        ? "Status is computed from quantity automatically."
        : "Shown as Available on Request on the site."}
    </p>
  </div>
  <div>
    <label htmlFor="p-sort" className="text-sm font-medium text-ink">Sort order</label>
    <input
      id="p-sort"
      type="number"
      min={0}
      max={9999}
      value={productForm.sortOrder}
      onChange={(e) => setProductForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
      className={`mt-2 ${inputClass(formErrors.sortOrder)}`}
    />
  </div>
</div>

{productForm.trackInventory ? (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label htmlFor="p-qty" className="text-sm font-medium text-ink">Available quantity</label>
      <input
        id="p-qty"
        type="number"
        min={0}
        value={productForm.stockQuantity}
        onChange={(e) => setProductForm((f) => ({ ...f, stockQuantity: Math.max(0, Number(e.target.value) || 0) }))}
        className={`mt-2 ${inputClass(formErrors.stockQuantity)}`}
      />
      {formErrors.stockQuantity ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.stockQuantity}</p> : null}
    </div>
    <div>
      <label htmlFor="p-threshold" className="text-sm font-medium text-ink">Low stock threshold</label>
      <input
        id="p-threshold"
        type="number"
        min={0}
        value={productForm.lowStockThreshold}
        onChange={(e) => setProductForm((f) => ({ ...f, lowStockThreshold: Math.max(0, Number(e.target.value) || 0) }))}
        className={`mt-2 ${inputClass(formErrors.lowStockThreshold)}`}
      />
      <p className="mt-1 text-xs text-ink-muted">Default: 10. Items at or below this show as Limited.</p>
      {formErrors.lowStockThreshold ? <p role="alert" className="mt-1 text-xs text-red-700">{formErrors.lowStockThreshold}</p> : null}
    </div>
  </div>
) : null}
```

- [x] **Step 7: Update the products table Stock column**

Replace lines 599-603 (the Stock `<td>`):

```tsx
<td className="whitespace-nowrap px-4 py-3">
  {product.trackInventory ? (
    <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${stockPill(product.stockStatus)}`}>
      {stockStatusLabel(product.stockStatus)} ({product.stockQuantity})
    </span>
  ) : (
    <span className="rounded-full bg-violet-600/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700">
      Request
    </span>
  )}
</td>
```

- [x] **Step 8: Update the table header**

Rename the `<th>` from "Stock" to "Inventory" (around line 565).

- [x] **Step 9: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [x] **Step 10: Commit**

```bash
git add src/components/admin/materials-view.tsx
git commit -m "feat: admin materials form uses trackInventory/quantity/threshold instead of stock dropdown"
```

---

### Task 8: Update product card display

**Files:**
- Modify: `src/components/product-card.tsx`

**Interfaces:**
- Consumes: `Product` with `stockStatus`, `stockQuantity`, `trackInventory`; `useQuote` for add
- Produces: badge shows quantity count; out-of-stock/on-request → "Request Quote" link

- [ ] **Step 1: Update imports**

`siteConfig` is already imported at line 6 (`import { siteConfig } from "@/lib/site";` — keep it, `whatsappNumber` is used in Step 3). Only change the type import, which currently reads `import type { Product, StockStatus } from "@/lib/site";`. `Product` no longer has `stock` after Task 2, and `StockStatus` moves to catalog-types, so:
```ts
import type { Product } from "@/lib/site";
import type { StockStatus } from "@/lib/catalog-types";
```
Do **not** add a second `siteConfig` import (duplicate-identifier error). If merging the two lines, the result should keep exactly one `siteConfig` import, e.g.:
```ts
import type { Product } from "@/lib/site";
import { siteConfig } from "@/lib/site";
import type { StockStatus } from "@/lib/catalog-types";
```

- [ ] **Step 2: Replace the stock badge label maps and badge rendering**

Replace the entire badge section (lines 13-68). New approach: derive status from `stockStatus` and show quantity:

```ts
const STOCK_LABEL: Record<StockStatus, string> = {
  in: "In Stock",
  limited: "Limited Stock",
  out: "Out of Stock",
};

const STOCK_BADGE_CLASSES: Record<StockStatus, string> = {
  in: "bg-primary text-white",
  limited: "bg-accent text-[#0d3d1a]",
  out: "bg-ink/85 text-white",
};

const ON_REQUEST_BADGE = "bg-violet-600/90 text-white";
```

In the component body, replace `outOfStock` and `availabilityLabel`:

```ts
const outOfStock = !product.trackInventory
  ? false  // non-tracked are never "out of stock" on the card
  : product.stockStatus === "out";
const isOnRequest = !product.trackInventory;
const badgeClass = isOnRequest
  ? ON_REQUEST_BADGE
  : product.stockStatus === "in"
    ? STOCK_BADGE_CLASSES.in
    : product.stockStatus === "limited"
      ? STOCK_BADGE_CLASSES.limited
      : STOCK_BADGE_CLASSES.out;

const badgeText = isOnRequest
  ? "Available on Request"
  : product.stockStatus === "in"
    ? `${STOCK_LABEL.in} — ${product.stockQuantity} available`
    : product.stockStatus === "limited"
      ? `${STOCK_LABEL.limited} — only ${product.stockQuantity} left`
      : STOCK_LABEL.out;
```

In the JSX badge `<span>` (line 64-68), replace:

```tsx
<span
  className={`absolute left-3 top-3 rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
>
  {badgeText}
</span>
```

- [ ] **Step 3: Replace the Add to quote button**

Replace the button (lines 94-119). When out-of-stock or on-request, show a WhatsApp "Request Quote" link instead of a disabled button:

```tsx
{outOfStock || isOnRequest ? (
  <a
    href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Hi, I'd like to enquire about ${product.name}. Is this available?`)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] bg-violet-600/15 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-600/25 sm:px-3 sm:py-2"
  >
    Request Quote
  </a>
) : (
  <button
    type="button"
    onClick={handleAdd}
    className={`mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] sm:px-3 sm:py-2 ${
      added
        ? "add-pulse bg-accent text-[#0d3d1a]"
        : "bg-accent text-[#0d3d1a] hover:bg-accent-light"
    }`}
  >
    <span aria-live="polite">
      {added ? (
        <>
          <Check weight="duotone" size={14} className="pop-in inline" aria-hidden="true" />
          Added
        </>
      ) : (
        "Add to quote"
      )}
    </span>
  </button>
)}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/product-card.tsx
git commit -m "feat: product card shows quantity-based badges and Request Quote for out-of-stock/non-tracked"
```

---

## Phase 4 — Backend validation + deduction

### Task 9: Server-side stock validation on quote submission

**Files:**
- Modify: `src/app/api/quote/route.ts`

**Interfaces:**
- Consumes: `fetchProducts` from `src/server/catalog-store` (or `getProduct` from static); `siteConfig` for whatsapp number
- Produces: HTTP 400 `stock_unavailable` with message when requested qty exceeds available stock

- [ ] **Step 1: Add stock validation after body parsing**

After `const body = await parseBody(request, quoteSubmitSchema);` (line 32), add:

```ts
// Stock validation: check tracked items against available quantity
const products = await fetchProducts();
const shortages = findShortLines(body.items, products);
if (shortages.length > 0) {
  const line = shortages[0];
  const unit = products.find((p) => p.slug === line.slug)?.unit || "units";
  throw badRequest(
    "stock_unavailable",
    `Only ${line.available} ${unit} are currently available for ${line.name}.`,
  );
}
```

Add the imports:
```ts
import { badRequest } from "@/server/http-error";
import { fetchProducts } from "@/server/catalog-store";
import { findShortLines } from "@/server/inventory";
```

> **Design note:** This mirrors the *exact* same availability rule as the "won" transition (`acceptQuoteWithInventory`). The message uses the unit from the catalog so the customer sees the same unit they picked on the card.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quote/route.ts
git commit -m "feat: quote submission validates stock availability against tracked products"
```

---

### Task 10: Inventory deduction on quote "won" transition

**Files:**
- Modify: `src/server/quote-store.ts`
- Modify: `src/server/quote-store.test.ts`

**Interfaces:**
- Consumes: `fetchProducts` from catalog-store; `applyQuantityChange`, `findShortLines` from inventory; `getSupabaseClient` from audit
- Produces: `acceptQuoteWithInventory(id, changedBy?)` returns `{ ok: true }` or `{ ok: false, error, shortLines }` on short stock

- [ ] **Step 1: Add inventory deduction function to quote-store.ts**

Add the import at the top of quote-store.ts (next to the existing `getSupabaseClient` import):

```ts
import { applyQuantityChange, findShortLines } from "./inventory";
```

Add a new exported function after `setQuoteAccepted`:

```ts
export type AcceptResult =
  | { ok: true }
  | { ok: false; error: string; shortLines?: string[] };

/**
 * Accept a quote and deduct inventory for tracked items.
 * Returns { ok: false, error, shortLines } if any tracked product has
 * insufficient stock — no partial deductions are applied.
 */
export async function acceptQuoteWithInventory(
  id: string,
  changedBy: string = "system",
): Promise<AcceptResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Database not available." };

  // 1. Load the quote
  const quote = await getQuote(id);
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === "won") return { ok: true }; // already accepted

  // 2. Load products (raw rows include the UUID id for history) and build lookup
  const { data: productRows } = await client
    .from("products")
    .select("id, slug, name, unit, stock_quantity, track_inventory")
    .order("sort_order", { ascending: true });
  const rawProducts = productRows ?? [];

  // 3. Pre-check with the same pure rule as the quote submission route.
  //    Non-tracked items are never flagged; unknown slugs are best-effort.
  const shortages = findShortLines(
    quote.items,
    rawProducts.map((p) => ({
      slug: String(p.slug),
      name: String(p.name),
      unit: String(p.unit ?? ""),
      trackInventory: Boolean(p.track_inventory),
      stockQuantity: Number(p.stock_quantity ?? 0),
    })),
  );

  if (shortages.length > 0) {
    const shortLines = shortages.map((s) => {
      const raw = rawProducts.find((r) => String(r.slug) === s.slug);
      const unit = String(raw?.unit || "units");
      return `${s.name}: ${s.available} ${unit} available, quote needs ${s.requested}`;
    });
    return {
      ok: false,
      error: `Cannot accept: insufficient stock for ${shortLines.length} item(s).`,
      shortLines,
    };
  }

  // 4. All clear — deduct inventory and log history
  const productMap = new Map(rawProducts.map((p) => [String(p.slug), p]));
  for (const item of quote.items) {
    const product = productMap.get(item.slug);
    if (!product || !product.track_inventory) continue;
    if (item.quantity <= 0) continue;

    const previousQuantity = Number(product.stock_quantity ?? 0);
    const { newQuantity, quantityChanged } = applyQuantityChange(
      previousQuantity,
      -item.quantity,
    );

    // Update product stock
    await client
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("slug", item.slug);

    // Write inventory history (product_id is the UUID)
    await client.from("inventory_history").insert({
      product_id: String(product.id),
      previous_quantity: previousQuantity,
      quantity_changed: quantityChanged,
      new_quantity: newQuantity,
      change_type: "order",
      reference_id: id,
      changed_by: changedBy,
    });
  }

  // 5. Mark quote as won
  const { error } = await client
    .from("quotes")
    .update({ accepted_at: new Date().toISOString(), status: "won" })
    .eq("id", id);

  if (error) {
    console.warn(`[quote-store] accept failed: ${error.message}`);
    return { ok: false, error: "Failed to update quote status." };
  }

  return { ok: true };
}
```

- [ ] **Step 2: Update the status route to use acceptQuoteWithInventory for "won" transitions**

In `src/app/api/admin/quotes/status/route.ts`, import `acceptQuoteWithInventory`:

```ts
import { acceptQuoteWithInventory, setQuoteStatus, type QuoteStatus } from "@/server/quote-store";
```

Replace the simple `setQuoteStatus` call with a won-aware path:

```ts
export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);

  const body = await parseBody(request, adminQuoteStatusSchema);
  const status = body.status as QuoteStatus;

  if (status === "won") {
    const result = await acceptQuoteWithInventory(body.id, principal.email ?? "owner");
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: "stock_unavailable", message: result.error, details: result.shortLines } },
        { status: 400 },
      );
    }
    await audit("quote_status_updated", { id: body.id, status: "won" });
    return NextResponse.json({ ok: true });
  }

  const updated = await setQuoteStatus(body.id, status);
  if (!updated) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Quote status could not be updated." } },
      { status: 502 },
    );
  }
  await audit("quote_status_updated", { id: body.id, status });
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 3: Write quote-store.test.ts degraded test for acceptQuoteWithInventory**

Add to the existing `quote-store (degraded, no live Supabase)` describe block:

```ts
import { acceptQuoteWithInventory } from "./quote-store";

it("acceptQuoteWithInventory degrades to error without throwing", async () => {
  const result = await acceptQuoteWithInventory("some-id", "owner@test.com");
  expect(result.ok).toBe(false);
  expect(result.error).toBeTruthy();
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/server/quote-store.test.ts`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/quote-store.ts src/app/api/admin/quotes/status/route.ts src/server/quote-store.test.ts
git commit -m "feat: acceptQuoteWithInventory deducts stock on won transition, refuses on short stock"
```

---

## Phase 5 — Admin inventory overview

### Task 11: Create inventory API routes

**Files:**
- Create: `src/app/api/admin/inventory/route.ts`
- Create: `src/app/api/admin/inventory/history/route.ts`

**Interfaces:**
- Consumes: `fetchProducts`, `updateProduct` from catalog-store; `getSupabaseClient` from audit; `requireOwner`; `parseBody`; `audit`; `withErrorHandling`

- [ ] **Step 1: Create `src/app/api/admin/inventory/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit, getSupabaseClient } from "@/server/audit";
import { fetchProducts, updateProduct } from "@/server/catalog-store";
import { requireOwner } from "@/server/require-owner";
import { revalidatePublic } from "@/server/revalidate";
import { withErrorHandling } from "@/server/with-error-handling";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adjustSchema = z
  .object({
    slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(0),
    changeType: z.enum(["stock_addition", "stock_adjustment", "manual_correction"]),
    referenceId: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/** GET — inventory summary + all products with inventory fields */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }

  const products = await fetchProducts();
  const summary = {
    total: products.length,
    inStock: products.filter((p) => p.trackInventory && p.stockStatus === "in").length,
    limited: products.filter((p) => p.trackInventory && p.stockStatus === "limited").length,
    outOfStock: products.filter((p) => p.trackInventory && p.stockStatus === "out").length,
    onRequest: products.filter((p) => !p.trackInventory).length,
  };

  return NextResponse.json({ products, summary });
});

/** PATCH — manual inventory adjustment */
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_encoding", message: "Request body could not be read." } },
      { status: 400 },
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Expected a JSON body." } },
      { status: 400 },
    );
  }

  const parsed = adjustSchema.safeParse(value);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "One or more fields are invalid.",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join(".") || "(root)",
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  const { slug, quantity, changeType, referenceId, note } = parsed.data;

  // Look up current product
  const products = await fetchProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Product not found." } },
      { status: 404 },
    );
  }

  if (!product.trackInventory) {
    return NextResponse.json(
      { error: { code: "invalid_operation", message: "Cannot adjust inventory for non-tracked products." } },
      { status: 400 },
    );
  }

  const previousQuantity = product.stockQuantity;
  const quantityChanged = quantity - previousQuantity;
  const newQuantity = quantity;

  if (newQuantity < 0) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Quantity cannot be negative." } },
      { status: 400 },
    );
  }

  // Update product
  const ok = await updateProduct(slug, {
    stockQuantity: newQuantity,
  });

  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — inventory not updated." } },
      { status: 503 },
    );
  }

  // Write history
  const client = getSupabaseClient();
  if (client) {
    // Resolve product UUID
    const { data: row } = await client
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (row) {
      await client.from("inventory_history").insert({
        product_id: row.id,
        previous_quantity: previousQuantity,
        quantity_changed: quantityChanged,
        new_quantity: newQuantity,
        change_type: changeType,
        reference_id: referenceId ?? null,
        changed_by: principal.email ?? "owner",
      });
    }
  }

  await audit("inventory_adjusted", { slug, previousQuantity, newQuantity, changeType });
  revalidatePublic();

  return NextResponse.json({ ok: true, previousQuantity, newQuantity });
});
```

- [ ] **Step 2: Create `src/app/api/admin/inventory/history/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/server/audit";
import { requireOwner } from "@/server/require-owner";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — inventory change history, newest first */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }

  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json({ history: [] });
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);

  let query = client
    .from("inventory_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ history: [] });
  }

  // Enrich with product slug/name so the UI never needs a slug↔uuid join.
  const { data: productRows } = await client
    .from("products")
    .select("id, slug, name");
  const productById = new Map<string, { slug: string; name: string }>(
    (productRows ?? []).map((row) => [
      String(row.id),
      { slug: String(row.slug), name: String(row.name) },
    ]),
  );

  const history = (data ?? []).map((row) => {
    const product = productById.get(String((row as { product_id?: unknown }).product_id ?? ""));
    return {
      ...row,
      productSlug: product?.slug ?? null,
      productName: product?.name ?? null,
    };
  });

  return NextResponse.json({ history });
});
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/inventory/route.ts src/app/api/admin/inventory/history/route.ts
git commit -m "feat: admin inventory API — summary, manual adjust, history log"
```

---

### Task 12: Admin inventory overview UI (summary strip + history + low-stock alerts)

**Files:**
- Create: `src/components/admin/inventory-view.tsx`
- Modify: `src/components/admin/materials-view.tsx` (add summary strip + low-stock alerts)

**Interfaces:**
- Consumes: `api` helper from helpers; `CatalogProduct` type

- [ ] **Step 1: Create `src/components/admin/inventory-view.tsx`**

This is a standalone admin view accessible via `?view=inventory` in the admin shell. It shows the summary counts, product inventory table, and full history.

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, Warning } from "@phosphor-icons/react";
import type { CatalogProduct } from "@/lib/catalog-types";
import type { Session } from "./helpers";
import { api } from "./helpers";

type InventorySummary = {
  total: number;
  inStock: number;
  limited: number;
  outOfStock: number;
  onRequest: number;
};

type HistoryEntry = {
  id: string;
  product_id: string;
  productSlug: string | null;
  productName: string | null;
  previous_quantity: number;
  quantity_changed: number;
  new_quantity: number;
  change_type: string;
  reference_id: string | null;
  changed_by: string | null;
  created_at: string;
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  initial_stock: "Initial Stock",
  stock_addition: "Stock Addition",
  stock_adjustment: "Stock Adjustment",
  order: "Order",
  order_cancellation: "Order Cancellation",
  return: "Return",
  manual_correction: "Manual Correction",
};

const CHANGE_TYPE_ICONS: Record<string, string> = {
  initial_stock: "📦",
  stock_addition: "📥",
  stock_adjustment: "✏️",
  order: "🛒",
  order_cancellation: "↩️",
  return: "🔄",
  manual_correction: "🔧",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function InventoryView(props: { session: Session }) {
  const { session } = props;
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      const data = await api<{ products: CatalogProduct[]; summary: InventorySummary }>(
        "/api/admin/inventory",
      );
      setProducts(data.products);
      setSummary(data.summary);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inventory.");
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api<{ history: HistoryEntry[] }>("/api/admin/inventory/history?limit=200");
      setHistory(data.history);
    } catch {
      // history is best-effort
    }
  }, []);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    setLoading(true);
    void Promise.all([loadData(), loadHistory()]).finally(() => setLoading(false));
  }, [session.status, loadData, loadHistory]);

  const filtered = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => {
      if (filter === "on_request") return !p.trackInventory;
      if (!p.trackInventory) return false;
      return p.stockStatus === filter;
    });
  }, [products, filter]);

  if (session.status !== "signed-in") return null;

  return (
    <section aria-label="Inventory" className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Inventory Overview</h2>
        <button
          type="button"
          onClick={() => void Promise.all([loadData(), loadHistory()])}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-surface-alt"
        >
          <ArrowClockwise weight="duotone" size={14} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", value: summary.total, color: "text-ink" },
            { label: "In Stock", value: summary.inStock, color: "text-emerald-700" },
            { label: "Limited", value: summary.limited, color: "text-amber-700" },
            { label: "Out of Stock", value: summary.outOfStock, color: "text-rose-700" },
            { label: "On Request", value: summary.onRequest, color: "text-violet-700" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-primary/10 bg-surface p-4 text-center"
            >
              <div className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="mt-1 text-xs text-ink-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All" },
          { value: "in", label: "In Stock" },
          { value: "limited", label: "Limited" },
          { value: "out", label: "Out of Stock" },
          { value: "on_request", label: "On Request" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === opt.value
                ? "bg-accent text-[#0d3d1a]"
                : "border border-primary/20 bg-surface text-ink-muted hover:border-primary/40"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Products table */}
      {loading ? (
        <p className="text-sm text-ink-muted">Loading inventory…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {filtered.map((product) => (
                <tr key={product.slug} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{product.name}</div>
                    {product.brand ? (
                      <div className="text-xs text-ink-muted">{product.brand}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{product.categoryId}</td>
                  <td className="px-4 py-3">
                    {product.trackInventory ? (
                      <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        product.stockStatus === "in"
                          ? "bg-emerald-600/15 text-emerald-700"
                          : product.stockStatus === "limited"
                            ? "bg-amber-600/15 text-amber-700"
                            : "bg-rose-600/15 text-rose-700"
                      }`}>
                        {product.stockStatus === "in" ? "In Stock" : product.stockStatus === "limited" ? "Limited" : "Out of Stock"}
                        {product.trackInventory && product.stockStatus === "limited" && product.stockQuantity <= product.lowStockThreshold ? (
                          <Warning weight="duotone" size={10} className="ml-1 inline" aria-hidden="true" />
                        ) : null}
                      </span>
                    ) : (
                      <span className="rounded-full bg-violet-600/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                        On Request
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {product.trackInventory ? product.stockQuantity : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-ink-muted">
                    {product.trackInventory ? product.lowStockThreshold : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History log */}
      <div>
        <h3 className="font-display text-base font-semibold tracking-tight text-ink">Inventory History</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No inventory changes recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Qty Change</th>
                  <th className="px-4 py-3 font-medium">New Qty</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {history.map((entry) => (
                  <tr key={entry.id} className="align-top">
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{entry.productName ?? entry.product_id}</div>
                      {entry.productSlug ? (
                        <div className="text-xs text-ink-muted">{entry.productSlug}</div>
                      ) : null}
                    </td>
                      <td className="px-4 py-3 text-xs">
                        <span>{CHANGE_TYPE_ICONS[entry.change_type] ?? "📝"}</span>{" "}
                        {CHANGE_TYPE_LABELS[entry.change_type] ?? entry.change_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className={entry.quantity_changed > 0 ? "text-emerald-700" : entry.quantity_changed < 0 ? "text-rose-700" : "text-ink-muted"}>
                          {entry.quantity_changed > 0 ? "+" : ""}{entry.quantity_changed}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{entry.new_quantity}</td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{entry.reference_id ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-ink-muted">{entry.changed_by ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add low-stock alerts to materials-view.tsx product table**

In the products table body row (around line 572-646), inside the `<td>` for status (the new inventory-aware `<td>` from Task 7), add a low-stock alert badge below the status pill when `product.trackInventory && product.stockStatus === "limited"`:

After the status `<span>` in the Inventory column, add:

```tsx
{product.trackInventory && product.stockStatus === "limited" ? (
  <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700">
    <Warning weight="duotone" size={10} aria-hidden="true" />
    {product.stockQuantity} left / {product.lowStockThreshold} threshold
  </div>
) : null}
```

Import `Warning` from phosphor-icons at the top of materials-view.tsx:
```ts
import { ..., Warning } from "@phosphor-icons/react";
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/inventory-view.tsx src/components/admin/materials-view.tsx
git commit -m "feat: admin inventory overview view + low-stock alerts in materials table"
```

---

### Task 13: Wire inventory view into admin shell

**Files:**
- Modify: `src/components/admin/sidebar.tsx`
- Modify: `src/components/admin/admin-shell.tsx`

**Interfaces:**
- Consumes: `InventoryView` component; extends `AdminView` union + `ICONS` record (sidebar iterates `Object.entries(ICONS)`)

- [ ] **Step 1: Add "inventory" to the AdminView union in sidebar.tsx**

Change line 18:

```ts
export type AdminView = "messages" | "customers" | "materials" | "settings" | "inventory";
```

- [ ] **Step 2: Add the icon to the ICONS record in sidebar.tsx**

Add `Package` to the phosphor-icons import (line 6-14):

```ts
import {
  ArrowSquareOut,
  Camera,
  ChatCircleText,
  Gear,
  Package,
  SignOut,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
```

Add the entry to `ICONS` (line 20-25):

```ts
const ICONS: Record<AdminView, typeof ChatCircleText> = {
  messages: ChatCircleText,
  customers: UsersThree,
  materials: SquaresFour,
  inventory: Package,
  settings: Gear,
};
```

The sidebar nav renders automatically from the ICONS record — no `<li>`/link edits needed.

- [ ] **Step 3: Add Inventory to VIEWS + render switch in admin-shell.tsx**

In `admin-shell.tsx` line 14, add `"inventory"` to the VIEWS array:

```ts
const VIEWS: AdminView[] = ["messages", "customers", "materials", "inventory", "settings"];
```

Add the import (near line 11):

```ts
import { InventoryView } from "./inventory-view";
```

Add a `case` to the view switch (around line 72-106), e.g. before `case "settings"`:

```tsx
case "inventory":
  return <InventoryView session={session} />;
```

The mobile pill nav (line 188-213) iterates `VIEWS`, so Inventory appears there automatically too.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/sidebar.tsx src/components/admin/admin-shell.tsx
git commit -m "feat: add Inventory view to admin shell navigation"
```

---

## Phase 6 — Tests + verification

### Task 14: Write quote-route stock validation test

**Files:**
- Create: `src/app/api/quote/route.test.ts`

**Interfaces:**
- Consumes: `POST` handler from `./route`; `new NextRequest` (already proven in `require-owner.test.ts`); mocks for `catalog-store`, `audit`, `csrf`, `rate-limit`, `require-customer`, `quote-store`

- [ ] **Step 1: Create the quote route test**

```ts
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const fetchProducts = vi.fn();

vi.mock("@/server/catalog-store", () => ({
  fetchProducts: (...args: unknown[]) => fetchProducts(...args),
}));

vi.mock("@/server/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/csrf", () => ({
  verifySameOrigin: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  clientIp: () => "127.0.0.1",
  enforceRateLimit: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/server/require-customer", () => ({
  requireCustomer: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/quote-store", () => ({
  persistQuote: vi.fn().mockResolvedValue(true),
}));

import { POST } from "./route";

function quoteRequest(items: { slug: string; label: string; quantity: number }[]) {
  return new NextRequest("https://example.com/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.com" },
    body: JSON.stringify({ name: "Ama", phone: "0558850667", area: "Accra", items }),
  });
}

describe("quote route stock validation", () => {
  it("rejects a tracked item that exceeds available stock with stock_unavailable", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "cement-42-5",
        name: "Ghacem Supacem 42.5R",
        unit: "bag",
        pricingMode: "fixed",
        kind: "unit",
        visible: true,
        sortOrder: 1,
        lowStockThreshold: 10,
        stockQuantity: 10,
        trackInventory: true,
        stockStatus: "limited",
      },
    ]);

    const res = await POST(quoteRequest([{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 20 }]));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("stock_unavailable");
    expect(json.error.message).toMatch(/10 bag/i);
  });

  it("does not flag exact-quantity or unknown slugs", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "cement-42-5",
        name: "Ghacem Supacem 42.5R",
        unit: "bag",
        pricingMode: "fixed",
        kind: "unit",
        visible: true,
        sortOrder: 1,
        lowStockThreshold: 10,
        stockQuantity: 10,
        trackInventory: true,
        stockStatus: "limited",
      },
    ]);

    const res = await POST(
      quoteRequest([
        { slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 10 },
        { slug: "unknown-product", label: "Mystery", quantity: 3 },
      ]),
    );
    const json = await res.json();
    expect(res.status).toBe(202);
    expect(json.ok).toBe(true);
    expect(json.reference).toBeTruthy();
  });

  it("allows non-tracked (Available on Request) items without a stock check", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "sharp-sand",
        name: "Sharp Sand",
        unit: "trip",
        pricingMode: "quote",
        kind: "measure",
        visible: true,
        sortOrder: 2,
        lowStockThreshold: 10,
        stockQuantity: 0,
        trackInventory: false,
        stockStatus: "in",
      },
    ]);

    const res = await POST(quoteRequest([{ slug: "sharp-sand", label: "Sharp Sand", quantity: 999 }]));
    const json = await res.json();
    expect(res.status).toBe(202);
    expect(json.ok).toBe(true);
  });
});
```

> **Note:** `fetchProducts` is hoisted above the `vi.mock` factory so the mock can read it. If degraded-mode behavior changes later, update the mock, not the route.

- [ ] **Step 2: Run test**

Run: `npx vitest run src/app/api/quote/route.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quote/route.test.ts
git commit -m "test: quote route rejects over-stock tracked items with stock_unavailable"
```

---

### Task 15: Run full verification suite

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all tests PASS (249+ tests)

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: BUILD SUCCESS with no errors

- [ ] **Step 4: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix: resolve any typecheck/build issues from inventory feature"
```
