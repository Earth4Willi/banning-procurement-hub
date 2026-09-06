# Catalogue Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hero image a full-bleed background, ship compact product cards with In Stock / Limited / Out of Stock badges, and reorganize `/products` into category-first sections with a sticky jump-nav.

**Architecture:** Pure presentation changes on top of `src/lib/site.ts` as the single data source. Add a `stock` status to each product; the `ProductCard` component renders status-driven styling; the catalogue page becomes grouped sections with anchor chips. No route changes, no new deps, static-export stays intact.

**Tech Stack:** Next.js 16 App Router (static export), TypeScript, Tailwind v4 (`line-clamp` is built-in), Vitest+jsdom, existing components.

## Global Constraints

- Static export only; no `use client` needed for new catalogue nav (plain anchors). Phosphor icons remain client-only components.
- No em-dashes, no pills (10px small / 16px card radii), honor `prefers-reduced-motion`.
- Brand colors: primary green `#0d3d1a`-family, gold accent, cream surface; dark theme works via `data-theme`.
- Slug-based identity (`add(product.slug)`); out-of-stock products must never reach the quote.
- All images: 900×700 4:3 originals (cards crop to 16:10 via `object-cover`); keep `loading="lazy"` except hero.
- Tests stay at the data/logic layer (existing suite has no component harness — do not add RTL); rendering verified via build + HTML grep.

---

### Task 1: Stock status data model

**Files:**
- Modify: `src/lib/site.ts`
- Test: `src/lib/site.test.ts`

**Interfaces:**
- Consumes: existing `Product` type (currently listed at `src/lib/site.ts:11`), existing `products` array (18 items), existing test file `src/lib/site.test.ts`.
- Produces: `StockStatus` union type `"in" | "limited" | "out"`; `Product.stock: StockStatus`. Later tasks read `product.stock` and the exported `StockStatus` type.

- [ ] **Step 1: Add the type and field**

In `src/lib/site.ts`, add after the `Product` type (or above it):

```ts
export type StockStatus = "in" | "limited" | "out";
```

Add to the `Product` type:

```ts
  stock: StockStatus;
```

- [ ] **Step 2: Write the failing test**

In `src/lib/site.test.ts`, add inside the `describe("site data", ...)` block:

```ts
it("tags every product with a valid stock status covering all three states", () => {
  expect(products.length).toBe(18);
  const statuses = products.map((p) => p.stock);
  for (const p of products) {
    expect(["in", "limited", "out"]).toContain(p.stock);
  }
  for (const s of ["in", "limited", "out"] as const) {
    expect(statuses).toContain(s);
  }
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/site.test.ts`
Expected: type error on `p.stock` (no `stock` on `Product`) and the new test fails to compile.

- [ ] **Step 4: Assign stock values to all 18 products**

Per product, add `stock:` with these exact values:

| slug | stock |
| --- | --- |
| ghacem-supacem-42-5 | limited |
| dangote-cement-42-5 | in |
| cestos-cement-32-5 | in |
| deformed-bar-12mm | in |
| deformed-bar-16mm | limited |
| binding-wire-roll | in |
| porcelain-floor-60x60 | in |
| ceramic-wall-30x60 | in |
| porcelain-floor-80x80 | limited |
| long-span-roofing-sheet | limited |
| roofing-roofmate-r | in |
| roofing-nails-2kg | in |
| pvc-pipe-6-inch | out |
| pvc-pipe-1-5-inch | in |
| bathroom-faucet-set | limited |
| electric-cable-2-5mm | in |
| surface-mount-socket | in |
| led-bulb-15w | out |

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: all tests pass (previous 19 + the new one = 20).
Also run: `npm run typecheck` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/site.ts src/lib/site.test.ts
git commit -m "feat: add stock status to product data"
```

---

### Task 2: Compact ProductCard with stock badge and out-of-stock handling

**Files:**
- Modify: `src/components/product-card.tsx`

**Interfaces:**
- Consumes: `Product` and `StockStatus` from `@/lib/site` (Task 1); `useQuote()` from `@/lib/quote-context` (unchanged — `add(product.slug)`).
- Produces: the dense card + badge component used by Tasks 4–5 and existing consumers (`product-search.tsx`, `/products/[category]`).

- [ ] **Step 1: Rewrite the card**

Replace the body of `src/components/product-card.tsx` with this implementation (column layout, dense, with stock badge and disabled out-of-stock state):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Product, StockStatus } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";

type Props = {
  product: Product;
};

const STOCK_LABEL: Record<StockStatus, string> = {
  in: "In stock",
  limited: "Limited",
  out: "Out of stock",
};

const STOCK_BADGE_CLASSES: Record<StockStatus, string> = {
  in: "bg-primary text-white",
  limited: "bg-accent text-[#0d3d1a]",
  out: "bg-ink/85 text-white",
};

export function ProductCard({ product }: Props) {
  const { add } = useQuote();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<number | null>(null);
  const outOfStock = product.stock === "out";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = () => {
    add(product.slug);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-primary/10 bg-surface-alt">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          width={900}
          height={700}
          loading="lazy"
          className={`h-full w-full object-cover ${outOfStock ? "opacity-70 grayscale" : ""}`}
        />
        <span
          className={`absolute left-3 top-3 rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${STOCK_BADGE_CLASSES[product.stock]}`}
        >
          {STOCK_LABEL[product.stock]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent-dark">
          {product.brand}
        </p>
        <h3 className="mt-1 font-display text-base font-semibold text-ink">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{product.description}</p>
        <p className="mt-auto flex items-baseline gap-2 pt-3 font-mono text-sm font-semibold text-ink">
          {product.unitPrice}
          <span className="text-[11px] font-normal text-ink-muted">{product.unit}</span>
        </p>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-disabled={outOfStock}
          className={`mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-xs font-semibold transition-colors active:scale-[0.98] ${
            outOfStock
              ? "cursor-not-allowed bg-ink/10 text-ink-muted"
              : "bg-accent text-[#0d3d1a] hover:bg-accent-light"
          }`}
        >
          <span aria-live="polite">
            {added ? (
              <>
                <Check weight="duotone" size={14} className="inline" aria-hidden="true" />
                Added
              </>
            ) : outOfStock ? (
              "Unavailable"
            ) : (
              "Add to Quote"
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests and typecheck**

Run: `npx vitest run` then `npm run typecheck`
Expected: all green.

- [ ] **Step 3: Build and verify output**

Run: `npm run build`
Then grep the exported catalogue HTML:

```powershell
Select-String -Path out/products/index.html -Pattern "In stock|Limited|Out of stock|Unavailable" | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: > 0 (badge strings present in static output).

- [ ] **Step 4: Commit**

```bash
git add src/components/product-card.tsx
git commit -m "feat: compact product cards with stock badges"
```

---

### Task 3: Hero as full-bleed background

**Files:**
- Modify: `src/components/sections/home-hero.tsx`

**Interfaces:**
- Consumes: `stats` from `@/lib/site` (unchanged — `sameDay` lookup), `Reveal` from `@/components/reveal` (unchanged).
- Produces: the new hero; no downstream dependencies.

- [ ] **Step 1: Rewrite the hero**

Replace the contents of `src/components/sections/home-hero.tsx` matching this structure (image first, then overlay, then content in DOM order; no explicit z-index — positioned elements paint in DOM order):

```tsx
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { stats } from "@/lib/site";

const sameDay =
  stats.find((stat) => stat.value.toLowerCase().includes("same")) ?? stats[stats.length - 1];

export function HomeHero() {
  return (
    <section
      className="relative flex min-h-[100dvh] items-center overflow-hidden py-20"
      aria-label="Introduction"
    >
      <img
        src="/hero.jpg"
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#0a2410]/95 via-[#0a2410]/70 to-[#0a2410]/30"
      />
      <div className="relative mx-auto w-full max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-light">
            Construction materials, delivered across Ghana
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
            Materials for your next build, delivered on time.
          </h1>
          <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-white/85 md:text-lg">
            Cement, rods, tiles, roofing, plumbing and electricals supplied and delivered across all
            16 regions of Ghana.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
            >
              Get a Quote
            </Link>
            <Link
              href="/products"
              className="rounded-[10px] border border-white/70 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-primary active:scale-[0.98]"
            >
              Browse Materials
            </Link>
          </div>
        </Reveal>
        <div className="absolute bottom-8 right-4 rounded-[16px] border border-primary/10 bg-surface p-4 shadow-[0_12px_24px_-8px_rgba(13,61,26,0.35)] md:right-6">
          <p className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">
            {sameDay.value}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{sameDay.label}</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build + HTML**

Run: `npm run build`
Then:

```powershell
Select-String -Path out/index.html -Pattern "Same day|Materials for your next build" | Measure-Object | Select-Object -ExpandProperty Count
```

Expected: > 0 (headline and chip in output). Confirm no split-grid remnants (left `grid-cols-[1.05fr_1fr]` gone).

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/home-hero.tsx
git commit -m "feat: hero as full-bleed background image"
```

---

### Task 4: Catalogue page grouped by category with jump-nav

**Files:**
- Modify: `src/app/products/page.tsx`
- Modify: `src/components/product-search.tsx`

**Interfaces:**
- Consumes: `categories`, `productsByCategory` from `@/lib/site`; `ProductCard` from `@/components/product-card` (Task 2); `ProductSearch` from `@/components/product-search`; `Reveal` from `@/components/reveal`.
- Produces: the grouped `/products` page. Category section anchors `#cement`, `#iron-rods`, `#tiles`, `#roofing`, `#plumbing`, `#electricals` (ids from `categories`).

- [ ] **Step 1: Rewrite the products page**

Replace the body of `src/app/products/page.tsx` (keep the heading copy, keep the final CTA band unchanged at the bottom) with:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ProductSearch } from "@/components/product-search";
import { categories, productsByCategory } from "@/lib/site";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "Browse Building Materials",
  description:
    "Browse cement, iron rods, tiles, roofing, plumbing and electrical materials with live search. Request a quote and get nationwide delivery across Ghana.",
  alternates: { canonical: "/products/" },
};

export default function ProductsPage() {
  return (
    <>
      <section className="pb-6 pt-20 lg:pt-28" aria-label="Catalogue overview">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Catalogue
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Browse materials
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Six categories covering cement, iron rods, tiles, roofing, plumbing and electricals.
              Browse by material, or search across everything.
            </p>
          </Reveal>

          <div className="mt-10">
            <Reveal>
              <ProductSearch />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20" aria-label="Materials by category">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <nav
            aria-label="Jump to category"
            className="sticky top-[64px] z-30 -mx-4 border-b border-primary/10 bg-surface/95 px-4 py-3 backdrop-blur-sm"
          >
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className="rounded-[10px] border border-primary/15 bg-surface px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-12 space-y-16">
            {categories.map((category) => {
              const products = productsByCategory(category.id);
              return (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-32"
                  aria-label={`${category.name} materials`}
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                        {category.name}
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">{category.short}</p>
                    </div>
                    <Link
                      href={`/products/${category.id}`}
                      className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-dark transition-colors hover:text-primary"
                    >
                      View all
                    </Link>
                  </div>
                  <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product, index) => (
                      <li key={product.slug}>
                        <Reveal delay={(index % 4) * 0.05}>
                          <ProductCard product={product} />
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0d3d1a] py-20 lg:py-24" aria-label="Request a quote">
        <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              Need a price for your project?
            </h2>
            <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
              Tell us what you need, and we will confirm pricing and delivery within 24 hours.
            </p>
            <div className="mt-8">
              <Link
                href="/quote"
                className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
              >
                Get a Quote
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Simplify the search component**

Replace the body of `src/components/product-search.tsx` (drop `CategoryPreview` and the featured/standard split entirely):

```tsx
"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { categories, products, getCategory } from "@/lib/site";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";

export function ProductSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return products.filter((product) => {
      const category = getCategory(product.categoryId);
      return (
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        (category?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query]);

  const searching = query.trim().length > 0;

  return (
    <div>
      <div className="max-w-xl">
        <label htmlFor="product-search" className="text-sm font-medium text-ink">
          Search materials
        </label>
        <div className="relative mt-2">
          <MagnifyingGlass
            weight="duotone"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, brand or category"
            className="w-full rounded-[10px] border border-primary/20 bg-surface px-11 py-3 text-base text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60"
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {searching
            ? results
              ? `${results.length} material${results.length === 1 ? "" : "s"} found`
              : "No materials match your search."
            : "Showing all categories"}
        </p>
      </div>

      {searching ? (
        <div className="mt-12">
          {results && results.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-ink-muted">No materials match your search.</p>
          )}
        </div>
      ) : (
        <p className="mt-10 text-sm text-ink-muted">Or scroll to browse by category below.</p>
      )}
    </div>
  );
}
```

Remove now-unused imports from `product-search.tsx` (`categories` and `productsByCategory` are no longer referenced there — keep `categories` only if used; the above code does not use it, so drop `categories` and `productsByCategory` from that file's import).

- [ ] **Step 3: Run tests, typecheck, build**

Run: `npx vitest run`, `npm run typecheck`, `npm run build` — all green.

- [ ] **Step 4: Verify exported catalogue HTML**

```powershell
$html = Get-Content out/products/index.html -Raw
foreach ($id in @("cement","iron-rods","tiles","roofing","plumbing","electricals")) {
  Write-Output ("id #$id present: " + ($html.Contains('id="' + $id + '"')))
}
```

Expected: all six `True`. Also confirm chips render: `Select-String -Path out/products/index.html -Pattern "Jump to category"` → found.

- [ ] **Step 5: Commit**

```bash
git add src/app/products/page.tsx src/components/product-search.tsx
git commit -m "feat: category-first catalogue page with jump nav"
```

---

### Task 5: Dense grids elsewhere + docs

**Files:**
- Modify: `src/app/products/[category]/page.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `ProductCard` change (Task 2), grouped `/products` page (Task 4). Category page route is `/products/[category]`, grid currently `mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3`.

- [ ] **Step 1: Dense category grid**

In `src/app/products/[category]/page.tsx`, change the products `<ul>` grid classes from:

```tsx
className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
```

to:

```tsx
className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

- [ ] **Step 2: Update README**

In `README.md`, "How to update the catalogue" section: add a line documenting the `stock` field (`"in" | "limited" | "out"`), noting out-of-stock products cannot be added to a quote, and update the catalogue-layout description to reflect that `/products` groups materials into category sections with a sticky jump-nav.

- [ ] **Step 3: Full verification gate**

Run: `npm run build`, `npx vitest run` (expect 20 tests), `npm run typecheck`.
Then verify the live export on `http://localhost:3000` (restart the python server against `out/` if needed). Route walk `/`, `/products`, `/products/cement` → all 200; `/products` HTML contains the six category anchors and badge strings.

- [ ] **Step 4: Commit**

```bash
git add src/app/products/[category]/page.tsx README.md
git commit -m "docs: stock field and grouped catalogue layout"
```