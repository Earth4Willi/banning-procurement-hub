# Catalogue Polish — Design

**Date:** 2026-09-06
**Status:** Approved by user

## Context

Banning Procurement Hub is a fully static Next.js 16 site (App Router, `output: "export"`) for a Ghana building-materials supplier. The catalogue data lives in one file, `src/lib/site.ts` (SAMPLE data). This change improves three areas after the local-image pass: the hero, the product cards, and the catalogue-page organisation.

## Goals

1. Use the hero photo (`/hero.jpg`) as a full-bleed background image behind the hero content.
2. Compact product cards with a stock badge showing one of three states: **In stock**, **Limited**, **Out of stock**.
3. Organise `/products` category-first: six grouped sections (one per category) with a sticky jump-nav, while keeping the existing live search.

## Non-goals

- No route changes, no new dependencies, no component test harness (RTL), no parallax/zoom hero animation (deferred).
- Home page `Shop by material` grid stays as-is.

## Design

### 1. Data model (`src/lib/site.ts`)

Add to the `Product` type a required field:

```ts
export type StockStatus = "in" | "limited" | "out";
// Product gains: stock: StockStatus;
```

Per-product SAMPLE values (client edits these later like any other field):

- `limited`: ghacem-supacem-42-5, deformed-bar-16mm, porcelain-floor-80x80, long-span-roofing-sheet, bathroom-faucet-set
- `out`: pvc-pipe-6-inch, led-bulb-15w
- everything else: `in`

Invariant: all three states appear in the data; exactly 18 products.

### 2. Product card (`src/components/product-card.tsx`)

Denser card:

- Image container `aspect-[16/10]`, `object-cover`, `loading="lazy"`.
- Badge overlaid `absolute left-3 top-3`, styled `rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider`:
  - In stock → `bg-primary text-white`
  - Limited → `bg-accent text-[#0d3d1a]`
  - Out of stock → `bg-ink/85 text-white`
- Body `p-4`: brand mono `text-[11px]`, name `text-base`, description `line-clamp-2 text-xs`, price `font-mono text-sm` with `text-[11px]` unit, CTA `px-3 py-2 text-xs rounded-[10px]`.
- Out of stock behaviour: image `opacity-70 grayscale`; button `disabled`, `aria-disabled`, `cursor-not-allowed bg-ink/10 text-ink-muted`, label **Unavailable**. Out-of-stock products must never be added to a quote.

Grids use `grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` on the catalogue page, category pages, and search results.

### 3. Hero (`src/components/sections/home-hero.tsx`)

Full-bleed background hero:

- Section `relative flex min-h-[100dvh] items-center overflow-hidden py-20`.
- DOM order (no explicit z-index needed): `<img src="/hero.jpg" alt="" aria-hidden fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />`, then overlay `<div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0a2410]/95 via-[#0a2410]/70 to-[#0a2410]/30" />`, then content wrapper `relative`.
- Copy unchanged. Text becomes white: h1 `text-white`, sub `text-white/85`, eyebrow `text-accent-light`. CTA "Get a Quote" (gold accent) unchanged; "Browse Materials" becomes `border-white/70 bg-black/20 text-white backdrop-blur-sm hover:bg-white hover:text-primary`.
- "Same day / Faster deliveries in Accra" chip keeps its `bg-surface` card styling and moves to `absolute bottom-8 right-4 md:right-6`.

### 4. Catalogue page (`src/app/products/page.tsx` + `src/components/product-search.tsx`)

- Header narrows (`pb-6 pt-20 lg:pt-28`).
- Sticky jump-nav: `<nav aria-label="Jump to category" className="sticky top-[64px] z-30 -mx-4 border-b border-primary/10 bg-surface/95 px-4 py-3 backdrop-blur-sm">` with six anchor chips (`href="#cement"` … `#electricals`), each `rounded-[10px] border border-primary/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-primary hover:bg-primary hover:text-white`.
- Six sections in `space-y-16`; each `<section id={c.id} className="scroll-mt-32">` with heading row (h2 + `category.short` + plain-text "View all" Link to `/products/{id}`), then its products in the dense grid.
- `product-search.tsx`: drop `CategoryPreview` and featured-category logic (redundant now); render search box, results grid when searching, and a muted hint line otherwise. Remove unused imports.
- Header is `h-16 sticky top-0 z-50`, hence `top-[64px]` / `scroll-mt-32`.

### 5. Consistency + docs

- `src/app/products/[category]/page.tsx` grid → `mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- README: document `stock` field and the grouped-catalogue layout.

## Verification

- `npx vitest run` green (suite grows with stock invariants).
- `npm run typecheck` clean.
- `npm run build` clean; `out/` contains grouped catalogue HTML (6 `id="…"` anchors, badge strings present, no picsum).
- Local route walk on `http://localhost:3000` (`/`, `/products`, `/products/cement`).