# Shimmer loading skeletons (public + admin)

**Status:** ✅ Shipped
**Date:** 2026-09-11
**Committed in:** `a362601`

## What
Shape-matched loading skeletons with a shimmer animation across public and admin surfaces, replacing plain `<p>Loading…</p>` placeholder text.

## Implementation
- **CSS** in `globals.css`: `color-mix(in srgb, var(--ink) 8%, transparent)` background + white gradient sweep via `::after`, 1.8s ease-in-out infinite; reduced-motion disables it
- **Primitives** (`ui/skeleton.tsx`): `Skeleton` (single bar), `SkeletonText` (row stack). Both `aria-hidden`
- **A11y**: every skeleton element `aria-hidden`; each mounted composition carries an `sr-only role="status"` label. Primitives do NOT carry labels — the surface compositions own them (avoids duplicate announcements)
- **Public** (`skeletons/public.tsx`): `ProductsGridSkeleton` (8 cards, mirrors 2→4 col grid), `QuoteTokenSkeleton` (quote panel shape), `ContactSkeleton` (form shape)
- **Admin** (`skeletons/admin.tsx`): `AdminTableSkeleton` (`columns`/`framed` props), `MessagesListSkeleton`, `SettingsFormSkeleton`, `AdminShellSkeleton`, `QuoteHistorySkeleton`
- **Routes**: `loading.tsx` for `products`, `products/[category]`, `quote/[token]`, `contact`
- **Admin mounts**: `admin/page.tsx` Suspense fallback + empty-state loading blocks in materials, messages, customers, inventory, settings views

## Key design tokens
- Card: `rounded-xl border border-primary/10 bg-surface-alt` (public), `rounded-2xl border border-primary/10 bg-surface` (admin)
- `AdminTableSkeleton framed=false` only inside existing bordered sections (customers); default framed=true elsewhere

## Delivery
Implemented via subagent-driven development (SDD): task briefs → implementer subagents → review packages → reviewer subagents → final verification. **313/313 tests**, tsc clean, build success.

## Files
- `src/app/globals.css`
- `src/components/ui/skeleton.tsx` + `skeleton.test.tsx`
- `src/components/skeletons/public.tsx` + `public.test.tsx`
- `src/components/skeletons/admin.tsx`
- `src/app/(public)/products/loading.tsx`, `products/[category]/loading.tsx`, `quote/[token]/loading.tsx`, `contact/loading.tsx`
- Admin mounts: admin/page.tsx, materials-view.tsx, messages-view.tsx, customers-view.tsx, inventory-view.tsx, settings-view.tsx
- Docs: `docs/superpowers/specs/2026-09-11-shimmer-skeletons-design.md`, `docs/superpowers/plans/2026-09-11-shimmer-skeletons.md`