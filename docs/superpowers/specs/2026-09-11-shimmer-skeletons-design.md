# Shimmer Loading Skeletons — Design

**Date:** 2026-09-11
**Status:** Approved
**Scope:** Add shape-matched shimmer loading skeletons across both public and admin surfaces, replacing the existing plain-text "Loading …" placeholders and the admin Suspense fallback.

## Problem

The project currently signals loading with plain gray text (`<p>Loading products…</p>`) and inline spinners. There are no route-level `loading.tsx` boundaries and no layout-aware placeholders. Objective: replace text placeholders with animated, shape-matched skeletons that mirror real component layouts, on both the public and admin sides.

## Approach (chosen: A)

Tiny CSS primitive + composed per-surface skeleton components. Implementation skill: per writing-plans. No new dependencies.

## 1. Animation & tokens

- Add `@keyframes skeleton-shimmer` to `src/app/globals.css` alongside the existing keyframes.
- Effect: a diagonal highlight sweep across a muted square.
- Uses existing design tokens so it adapts to light/dark automatically:
  - Base: `bg-ink/6`-style muted tone (matches `text-ink-muted` family).
  - Sweep: translucent white gradient highlight.
  - Rounding: `rounded-md` default; compositions use existing card rounding (`rounded-xl` / `rounded-2xl` where they mirror real cards).
- Do NOT reuse `shine-sweep` / `shine-open` — those are one-shot hover/entry glints, not looping placeholders.

## 2. Primitive component

`src/components/ui/skeleton.tsx` (client-safe, no hooks needed):

- `<Skeleton className="h-4 w-24" />` — a shimmering block; `className` controls size/shape/rounding.
- `<SkeletonText rows={2} className="w-40" />` — stacked text-line rows; last row narrower by default; `rows` count configurable.
- All primitives set `aria-hidden="true"`.

## 3. Per-surface compositions

Each mimics its real layout shape (image ratios, row structure, card count).

**Public:**
- `ProductsGridSkeleton` — grid of 8 product cards: image block, 2 title lines, price pill, button bar. Mirrors `product-card.tsx` structure.
- `CategoryGridSkeleton` — mirrors `category-card.tsx` (image block + title line).
- `QuoteTokenSkeleton` — quote summary panel shape.
- `ContactSkeleton` — contact form shape (label + input-line stacks, textarea, submit button).

**Admin:**
- `AdminShellSkeleton` — replaces the `admin/page.tsx:15` Suspense fallback text.
- `AdminTableSkeleton` — table header row + 5 body rows with cell-sized blocks (empty-state spacing preserved where the real list uses `p-10` empties).
- `MessagesListSkeleton` — message rows: avatar circle + name/area lines + timestamp block.
- `CustomersSkeleton` — table rows as in `customers-view.tsx`.
- `InventorySkeleton` — table rows as in `inventory-view.tsx`.
- `SettingsFormSkeleton` — stacked label + input-line groups (matches the settings sections' stacked layout).

## 4. Mount points

- **New `loading.tsx` route files** (server-side route loading):
  - `src/app/(public)/products/loading.tsx` → `ProductsGridSkeleton` (keeps page shell/header visible)
  - `src/app/(public)/products/[category]/loading.tsx` → `ProductsGridSkeleton`
  - `src/app/(public)/quote/[token]/loading.tsx` → `QuoteTokenSkeleton`
  - `src/app/(public)/contact/loading.tsx` → `ContactSkeleton`
- **Admin shell:** replace Suspense fallback in `src/app/admin/page.tsx` with `AdminShellSkeleton`.
- **Client components:** replace the `loading ? <p>…</p>` ternaries with mounted skeleton compositions:
  - `src/components/admin/materials-view.tsx:609,741`
  - `src/components/admin/messages-view.tsx:448,548`
  - `src/components/admin/customers-view.tsx:203,380`
  - `src/components/admin/inventory-view.tsx:169`
  - `src/components/admin/settings-view.tsx:47`

## 5. Accessibility

- All skeleton divs are `aria-hidden="true"`.
- Each mounted skeleton surface includes a visually-hidden `role="status"` text (e.g. "Loading products") for screen readers.
- Under `prefers-reduced-motion`, the global 0.01ms rule in `globals.css:137-139` collapses animation durations; add a targeted media query so the skeleton shimmer renders as a **static** block (sweep/opacity suppressed, no flash) rather than the frozen mid-sweep state the blanket rule would produce.

## 6. Testing

- Small vitest suite (e.g. `src/components/ui/skeleton.test.tsx`): primitive renders with expected classes/rows; compositions render the expected number of blocks; `aria-hidden` present; stylesheet contains the reduced-motion skeleton override.

## Out of scope

- Button-level spinners (`CircleNotch` while saving) stay as-is — they convey in-flight writes, not initial loads.
- The comment placeholder in `materials-view.tsx:124` (thumbnail "Loading…" inside the image preview) stays — it is a tiny inline state, not a page-level load.
- No new dependency added.