# Shimmer Loading Skeletons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace plain-text "Loading …" placeholders with shape-matched shimmer skeletons across public and admin surfaces.

**Architecture:** One CSS `@keyframes skeleton-shimmer` + a `.skeleton` base class in `globals.css`; a `Skeleton`/`SkeletonText` primitive component in `src/components/ui/skeleton.tsx`; per-surface compositions in `src/components/skeletons/public.tsx` and `admin.tsx`; mounted via new `loading.tsx` route files (public) and inline `loading ?` ternaries / Suspense fallback (admin).

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4, React 19, Vitest 5 + jsdom. No new runtime dependencies.

## Global Constraints

- **Zero new dependencies.** Tests use `react-dom/server`'s `renderToStaticMarkup` (already installed) — do not add `@testing-library/react`.
- **Design tokens only.** Skeleton base uses `var(--ink)` via `color-mix`; rounding/size via existing Tailwind utilities (`rounded-md`, `rounded-xl`, `rounded-2xl`, `rounded-[10px]`, etc.). Do not add new color tokens.
- **Async `params` and page components unchanged.** Only add files and swap placeholder text — do not refactor page components.
- **Do not touch button-level spinners** (`CircleNotch` in `account-view.tsx` / `sign-in-dialog.tsx`) or the thumbnail "Loading…" at `materials-view.tsx:124`.
- **Environment:** Windows PowerShell — no `head`/`tail`; use `rg -n`. Full vitest run takes ~73–98s; use a 600s timeout.
- **Accessibility:** every skeleton element `aria-hidden="true"`; each mounted composition includes an `sr-only` `role="status"` label.
- **Commits:** run `git commit` steps ONLY if the user has approved committing this round (ask at execution handoff). Use conventional commit messages.
- **Verification commands:** `npx vitest run` (600s timeout), `npx tsc --noEmit` (expect no output), `npm run build`.

---

### Task 1: Shimmer animation + Skeleton primitives

**Files:**
- Modify: `src/app/globals.css` (add keyframes + `.skeleton` class + reduced-motion override)
- Create: `src/components/ui/skeleton.tsx`
- Test: `src/components/ui/skeleton.test.tsx`

**Interfaces:**
- Produces:
  - CSS class `.skeleton` (sets position/overflow/background + the animated `::after` sweep; border-radius and size set via className utilities in components)
  - `Skeleton({ className? }: { className?: string })` → `<div aria-hidden="true" className={"skeleton " + className} />`
  - `SkeletonText({ rows = 2, className? }: { rows?: number; className?: string })` → stacked rows; last row `w-2/3`, others `w-full`; each `h-3 rounded-md`

- [ ] **Step 1: Add the animation and base class to `globals.css`**

Append just above the existing `@media (prefers-reduced-motion: reduce)` block (`src/app/globals.css:137`):

```css
/* Shimmer loading skeletons */
@keyframes skeleton-shimmer {
  100% { transform: translateX(100%); }
}
.skeleton {
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
}
.skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, white 28%, transparent) 50%,
    transparent
  );
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
}
```

Then append `.skeleton::after` to the existing reduced-motion block (after the blanket `* { animation-duration: 0.01ms !important; … }` line) so the shimmer renders as a static block instead of a frozen mid-sweep:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  .skeleton::after { animation: none; }
}
```

- [ ] **Step 2: Create the primitive component**

`src/components/ui/skeleton.tsx`:

```tsx
type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton ${className ?? ""}`} />;
}

type SkeletonTextProps = {
  rows?: number;
  className?: string;
};

export function SkeletonText({ rows = 2, className }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-3 rounded-md ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write the failing tests**

`src/components/ui/skeleton.test.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText } from "./skeleton";

describe("Skeleton primitives", () => {
  it("renders an aria-hidden shimmering block with merged classes", () => {
    const html = renderToStaticMarkup(<Skeleton className="h-4 w-24 rounded-xl" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("skeleton");
    expect(html).toContain("h-4");
    expect(html).toContain("w-24");
    expect(html).toContain("rounded-xl");
  });

  it("SkeletonText renders the requested rows with a narrower last row", () => {
    const html = renderToStaticMarkup(<SkeletonText rows={3} />);
    expect(html.match(/class="skeleton/g)).toHaveLength(3);
    expect(html).toContain("w-2/3");
    expect(html).toContain("w-full");
  });
});

describe("globals.css skeleton styles", () => {
  it("defines the shimmer keyframes and the reduced-motion override", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("@keyframes skeleton-shimmer");
    expect(css).toContain(".skeleton");
    expect(css).toContain(".skeleton::after");
    expect(
      css.match(/prefers-reduced-motion: reduce[\s\S]*\.skeleton::after\s*\{\s*animation:\s*none;/),
    ).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/ui/skeleton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit (if commits approved)**

```bash
git add src/app/globals.css src/components/ui/skeleton.tsx src/components/ui/skeleton.test.tsx
git commit -m "feat(ui): add shimmer skeleton primitives and animation"
```

---

### Task 2: Public skeletons + route `loading.tsx` boundaries

**Files:**
- Create: `src/components/skeletons/public.tsx`
- Create: `src/app/(public)/products/loading.tsx`
- Create: `src/app/(public)/products/[category]/loading.tsx`
- Create: `src/app/(public)/quote/[token]/loading.tsx`
- Create: `src/app/(public)/contact/loading.tsx`
- Test: `src/components/skeletons/public.test.tsx`

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `@/components/ui/skeleton`
- Produces:
  - `ProductsGridSkeleton` — `role="status"` sr-only "Loading products", then a `ul` grid (mirrors `products/page.tsx:93` and `[category]/page.tsx:78`: `grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4`) with 8 card blocks
  - `QuoteTokenSkeleton` — `role="status"` sr-only "Loading quote", then a quote-panel shape (reference header, rows, totals block)
  - `ContactSkeleton` — `role="status"` sr-only "Loading contact form", then a form panel (label + field stacks, textarea block, submit button block)

- [ ] **Step 1: Write the failing tests**

`src/components/skeletons/public.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactSkeleton, ProductsGridSkeleton, QuoteTokenSkeleton } from "./public";

describe("public skeletons", () => {
  it("ProductsGridSkeleton renders 8 product-card blocks and a status label", () => {
    const html = renderToStaticMarkup(<ProductsGridSkeleton />);
    expect(html.match(/aspect-\[4\/3\]/g) ?? []).toHaveLength(8);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading products");
  });

  it("QuoteTokenSkeleton and ContactSkeleton include a status label", () => {
    expect(renderToStaticMarkup(<QuoteTokenSkeleton />)).toContain('role="status"');
    expect(renderToStaticMarkup(<ContactSkeleton />)).toContain('role="status"');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/skeletons/public.test.tsx`
Expected: FAIL — module "./public" cannot be resolved.

- [ ] **Step 3: Implement the public compositions**

`src/components/skeletons/public.tsx`:

```tsx
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export function ProductsGridSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading products
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-alt sm:rounded-[16px]"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-[16/10]" />
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
              <Skeleton className="h-3 w-2/3 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="mt-auto h-4 w-1/3 rounded-md" />
              <Skeleton className="h-8 w-1/2 rounded-[10px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuoteTokenSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading quote
      </p>
      <div className="rounded-2xl border border-primary/10 bg-surface p-6">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="mt-3 h-7 w-56 rounded-md" />
        <Skeleton className="mt-1 h-4 w-40 rounded-md" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <SkeletonText rows={1} className="w-1/2" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-primary/10 bg-surface-alt p-4">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="mt-2 h-6 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ContactSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading contact form
      </p>
      <Skeleton className="h-7 w-40 rounded-md" />
      <div className="mt-6 rounded-2xl border border-primary/10 bg-surface p-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="mb-4">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
          </div>
        ))}
        <div className="mb-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="mt-2 h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[10px]" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement the route `loading.tsx` files**

`src/app/(public)/products/loading.tsx`:

```tsx
import { ProductsGridSkeleton } from "@/components/skeletons/public";

export default function Loading() {
  return (
    <section className="py-12 lg:py-20" aria-label="Loading products">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <ProductsGridSkeleton />
      </div>
    </section>
  );
}
```

`src/app/(public)/products/[category]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { ProductsGridSkeleton } from "@/components/skeletons/public";

function SkeletonBreadcrumb() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      <Skeleton className="h-4 w-14 rounded-md" />
      <span>/</span>
      <Skeleton className="h-4 w-20 rounded-md" />
      <span>/</span>
      <Skeleton className="h-4 w-24 rounded-md" />
    </div>
  );
}

export default function Loading() {
  return (
    <section className="py-12 lg:py-28" aria-label="Loading category">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <SkeletonBreadcrumb />
        <div className="mt-8">
          <ProductsGridSkeleton />
        </div>
      </div>
    </section>
  );
}
```

`src/app/(public)/quote/[token]/loading.tsx`:

```tsx
import { QuoteTokenSkeleton } from "@/components/skeletons/public";

export default function Loading() {
  return <QuoteTokenSkeleton />;
}
```

`src/app/(public)/contact/loading.tsx`:

```tsx
import { ContactSkeleton } from "@/components/skeletons/public";

export default function Loading() {
  return <ContactSkeleton />;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/skeletons/public.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck + build check**

Run: `npx tsc --noEmit && npm run build`
Expected: no tsc output; Next build completes (the four new `loading.tsx` routes compile).

- [ ] **Step 7: Commit (if commits approved)**

```bash
git add src/components/skeletons/public.tsx src/components/skeletons/public.test.tsx "src/app/(public)/products/loading.tsx" "src/app/(public)/products/[category]/loading.tsx" "src/app/(public)/quote/[token]/loading.tsx" "src/app/(public)/contact/loading.tsx"
git commit -m "feat(ui): add loading skeletons for public routes"
```

---

### Task 3: Admin skeleton compositions

**Files:**
- Create: `src/components/skeletons/admin.tsx`

**Interfaces:**
- Consumes: `Skeleton`, `SkeletonText` from `@/components/ui/skeleton`
- Produces:
  - `AdminTableSkeleton({ columns = 5, framed = true }: { columns?: number; framed?: boolean })` — renders a `<tr>` header row with `columns` `px-4 py-3` header blocks then 5 body `<tr>`s, each with `columns` cell blocks (`h-3`) separated by `px-4 py-3`. When `framed`, wraps in `overflow-x-auto rounded-2xl border border-primary/10 bg-surface` with a `<table className="w-full min-w-[700px] text-left text-sm" aria-hidden="true">`; the first body cell in each row also gets a leading `h-8 w-8 rounded-lg` "avatar" block.
  - `MessagesListSkeleton` — sr-only "Loading messages", then a `ul grid gap-3` of 4 list rows (avatar `h-8 w-8 rounded-full`, name line, area + timestamp lines, right-side read-state pill).
  - `SettingsFormSkeleton` — sr-only "Loading settings", then a `space-y-6` of 3 section panels, each "heading" line + stacked label/field pairs.
  - `AdminShellSkeleton` — sr-only "Loading admin", then page-title lines + a `rounded-2xl border border-primary/10 bg-surface p-4` block with the `AdminTableSkeleton` shape (framed=false, 5 columns).
  - `QuoteHistorySkeleton` — sr-only "Loading quote history", then 3 stacked rows (label line + right-aligned value block).

- [ ] **Step 1: Implement the module**

`src/components/skeletons/admin.tsx`:

```tsx
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

type AdminTableSkeletonProps = {
  columns?: number;
  framed?: boolean;
};

export function AdminTableSkeleton({ columns = 5, framed = true }: AdminTableSkeletonProps) {
  const table = (
    <table className="w-full min-w-[700px] text-left text-sm" aria-hidden="true">
      <thead>
        <tr className="border-b border-primary/10">
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-3 w-16 rounded-md" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 5 }, (_, row) => (
          <tr key={row} className="border-b border-primary/10 last:border-0">
            {Array.from({ length: columns }, (_, col) => (
              <td key={col} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {col === 0 ? <Skeleton className="h-8 w-8 shrink-0 rounded-lg" /> : null}
                  <Skeleton className="h-3 w-full max-w-28 rounded-md" />
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!framed) return table;
  return <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">{table}</div>;
}

export function MessagesListSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading messages
      </p>
      <ul className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-start justify-between gap-4 rounded-2xl border border-primary/10 bg-surface p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading settings
      </p>
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <section key={i} className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
            <Skeleton className="h-5 w-40 rounded-md" />
            <div className="mt-4 space-y-4">
              <div>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading admin
      </p>
      <Skeleton className="h-8 w-48 rounded-md" />
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/10 bg-surface p-4">
        <AdminTableSkeleton columns={5} framed={false} />
      </div>
    </div>
  );
}

export function QuoteHistorySkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading quote history
      </p>
      <div className="mt-3 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-primary/10 pb-2">
            <SkeletonText rows={1} className="w-1/3" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note: `max-w-28` requires Tailwind v4 (spacing scale supports arbitrary numeric values by default in v4). If typecheck/build reject it, use `max-w-[112px]`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit (if commits approved)**

```bash
git add src/components/skeletons/admin.tsx
git commit -m "feat(ui): add admin skeleton compositions"
```

---

### Task 4: Mount skeletons in admin surfaces

**Files:**
- Modify: `src/app/admin/page.tsx:14-18` (Suspense fallback → `AdminShellSkeleton`)
- Modify: `src/components/admin/materials-view.tsx:608-609` and `:740-741`
- Modify: `src/components/admin/messages-view.tsx:447-448` and `:547-548`
- Modify: `src/components/admin/customers-view.tsx:202-203` and `:379-380`
- Modify: `src/components/admin/inventory-view.tsx:168-169`
- Modify: `src/components/admin/settings-view.tsx:46-48`

**Interfaces:**
- Consumes: `AdminTableSkeleton`, `MessagesListSkeleton`, `SettingsFormSkeleton`, `AdminShellSkeleton`, `QuoteHistorySkeleton` from `@/components/skeletons/admin`

**Column counts (matching each real table's header):**
- `materials-view.tsx` products table: 6 columns (Image, Name, Category, Price, Inventory, Visible) — use `AdminTableSkeleton columns={6}`
- `materials-view.tsx` categories table: 4 columns (Image, Name, Short, Visible) — use `AdminTableSkeleton columns={4}`
- `messages-view.tsx` quotes table: 6 columns — use `AdminTableSkeleton columns={6}`
- `inventory-view.tsx`: 5 columns (Product, Category, Status, Quantity, Threshold) — use `AdminTableSkeleton columns={5}`
- `customers-view.tsx` list: 5 columns — use `AdminTableSkeleton columns={5} framed={false}` (it renders inside the already-bordered `section` at `customers-view.tsx:182`)
- `customers-view.tsx` quote history: `QuoteHistorySkeleton` (replaces the `<p>` at `:380`, keep the `mt-3` spacing)
- `messages-view.tsx` messages list: `MessagesListSkeleton`
- `settings-view.tsx`: `SettingsFormSkeleton`
- `admin/page.tsx`: `AdminShellSkeleton`

- [ ] **Step 1: Add imports**

In each of `materials-view.tsx`, `messages-view.tsx`, `customers-view.tsx`, `inventory-view.tsx`, `settings-view.tsx` add near the other imports:

```tsx
import { AdminTableSkeleton, MessagesListSkeleton, QuoteHistorySkeleton, SettingsFormSkeleton } from "@/components/skeletons/admin";
```

Import only what each file uses (defaults to `AdminTableSkeleton` for materials/messages-quotes/inventory; `AdminTableSkeleton` + `QuoteHistorySkeleton` for customers; `MessagesListSkeleton` for messages; `SettingsFormSkeleton` for settings). In `src/app/admin/page.tsx` add:

```tsx
import { AdminShellSkeleton } from "@/components/skeletons/admin";
```

- [ ] **Step 2: Swap the placeholder text for skeleton mounts**

`src/app/admin/page.tsx`:

```tsx
<Suspense fallback={<AdminShellSkeleton />}>
  <AdminShell />
</Suspense>
```

`materials-view.tsx:608-609` (products) → replace:

```tsx
          {loading ? (
            <p className="text-sm text-ink-muted">Loading products…</p>
```

with:

```tsx
          {loading ? (
            <AdminTableSkeleton columns={6} />
```

`materials-view.tsx:740-741` (categories) → replace with `<AdminTableSkeleton columns={4} />`.

`messages-view.tsx:447-448` (quotes) → replace with `<AdminTableSkeleton columns={6} />`.

`messages-view.tsx:547-548` (messages) → replace with:

```tsx
          {loading ? (
            <MessagesListSkeleton />
```

`inventory-view.tsx:168-169` → replace with `<AdminTableSkeleton columns={5} />`.

`customers-view.tsx:202-203` → replace with `<AdminTableSkeleton columns={5} framed={false} />`.

`customers-view.tsx:379-380` → replace with:

```tsx
              {historyLoading ? (
                <QuoteHistorySkeleton />
```

`settings-view.tsx:46-48` → replace with:

```tsx
  if (loading) {
    return <SettingsFormSkeleton />;
  }
```

- [ ] **Step 3: Run the targeted component/type checks**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Full test suite**

Run: `npx vitest run` (600s timeout)
Expected: PASS — 308 existing + 5 new = 313 tests.

- [ ] **Step 5: Build**

Run: `npm run build` (600s timeout)
Expected: build completes; no new routes.

- [ ] **Step 6: Commit (if commits approved)**

```bash
git add src/app/admin/page.tsx src/components/admin/materials-view.tsx src/components/admin/messages-view.tsx src/components/admin/customers-view.tsx src/components/admin/inventory-view.tsx src/components/admin/settings-view.tsx
git commit -m "feat(ui): mount shimmer skeletons across admin surfaces"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full check**

Run: `npx vitest run` then `npx tsc --noEmit` then `npm run build` (each with a 600s timeout).
Expected: 313 tests pass, tsc silent, build completes.

- [ ] **Step 2: Smoke-check the loading states in `npm run dev` (manual, browser)**

Per instruction of the executing/verification skill — confirm for each surface that the skeleton shows during load and is replaced by content, and that `prefers-reduced-motion: reduce` (devtools emulation) shows static blocks, on:
- `/products`, `/products/:category`, `/quote/:token`, `/contact`
- `/admin` (shell), Messages → Add WhatsApp quote + messages list, Materials, Inventory, Customers, Settings

- [ ] **Step 3: Commit (if commits approved)**

```bash
git add docs/superpowers/plans/2026-09-11-shimmer-skeletons.md
git commit -m "docs: shimmer skeletons implementation plan"
```

---

## Self-Review

**Spec coverage:**
- §1 Animation & tokens → Task 1 (`globals.css` keyframes + `.skeleton`).
- §2 Primitive component → Task 1 (`skeleton.tsx`, `Skeleton` + `SkeletonText`).
- §3 Per-surface compositions → Task 2 (public) + Task 3 (admin).
- §4 Mount points → Task 2 (`loading.tsx` files) + Task 4 (admin shell + client ternaries).
- §5 Accessibility → `aria-hidden` on every `Skeleton`/`SkeletonText`, `sr-only role="status"` per composition, reduced-motion override in Task 1.
- §6 Testing → Task 1 (primitives + CSS), Task 2 (public counts), Task 4/5 (full suite).
- Out-of-scope exclusions → Global Constraints (spinners, thumbnail still).

**Placeholder scan:** No TBD/TODO/implement-later; every code step has concrete code.

**Type consistency:** `Skeleton({ className })`, `SkeletonText({ rows, className })` defined in Task 1 and consumed identically in Tasks 2–3; `AdminTableSkeleton({ columns, framed })` defined in Task 3 and used with `columns`/`framed` in Task 4 with matching names.

**Ambiguity check:** `max-w-28` in Task 3 flagged with a fallback if the v4 build rejects it.