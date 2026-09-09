# Admin Panel Phase 2 — Ops-First Shell + Quote Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-scope the admin panel to an operations-first shell (Messages is the landing view, analytics view dropped) and add the quote-document lifecycle — price each line, issue a Quotation (15% VAT, validity), mark Accepted, collect payment and issue a Receipt — delivered three ways (WhatsApp text reply, print-to-PDF document, private `/quote/[token]` link).

**Architecture:** Supersedes Tasks 5–6 of `2026-09-09-admin-panel.md` (Tasks 1–4 are done and green: 130/130 vitest, tsc clean). New server pieces follow the existing `quote-store.ts` pattern: idempotent `0003_quote_documents.sql` ALTERs, pure `src/lib/quote-document.ts` (client-safe totals + WhatsApp summary text), extended `quote-store.ts`, an extended PUT + new paid route, and a public `/quote/[token]` page. The admin frontend lives in `src/components/admin/` (helpers, avatar, sidebar already scaffolded) with view switching via `?view=` + `?tab=`.

**Tech Stack:** Next.js 16 (App Router, ISR), React 19, TypeScript, Supabase postgres + Storage, Zod v4, @phosphor-icons/react, Tailwind v4, vitest.

## Global Constraints

- Follow existing patterns exactly: `require-owner.ts` guard, `with-error-handling.ts`, `parseBody` + zod `.strict()`, `audit.ts`, `.env.local` via `getSupabaseClient()`; never log secrets.
- Admin APIs: 403 not-owner, 400 `validation_failed`, 503 `storage_unavailable`; every mutation `audit(...)`.
- Money: GH₵, numeric, 2dp half-up rounding; `VAT_RATE = 0.15`; totals **always computed on the server** from line prices — client never ships a total.
- `doc_token` is 16 random bytes hex, generated server-side; public page 404s on missing/invalid; `noindex`.
- Public pages never 500 on DB absence (fall back to `site.ts`); the `/quote/[token]` page 404s when the DB is absent.
- Brand tokens: `--color-primary #0d3d1a`, `--color-accent #f0b429`; white text on sidebar; no purple. Migrations are pasted by the user into the Supabase SQL Editor — code must stay resilient before they're applied.
- Phones normalized `+233…`; customers keyed by phone.
- Commits only when the user explicitly asks.
- Version floor: Next `>=16`, `@phosphor-icons/react` already a dependency. Windows shell: run `npx vitest run` and `npx tsc --noEmit` as separate bash calls (no `&&`, no `tail`).
- Gates: `npx vitest run` → `npx tsc --noEmit` → `npm run build` → dev spot-checks with `DEV_OWNER_BYPASS=1` (owner `banning173@gmail.com`).

---

## File Structure

**Created:**
- `supabase/migrations/0003_quote_documents.sql` — idempotent ALTERs (user pastes via SQL Editor)
- `src/lib/quote-document.ts` — pure, client-and-server-safe: `money`, `computeTotals`, `buildQuoteSummary`, `VAT_RATE`
- `src/lib/quote-document.test.ts`
- `src/app/quote/[token]/page.tsx` — public document page
- `src/components/admin/admin-shell.tsx` — shell container (sidebar + pill nav + view routing + badge polling + sign-in gate)
- `src/components/admin/messages-view.tsx` — Quotes + Contact sub-tabs
- `src/components/admin/customers-view.tsx`
- `src/components/admin/materials-view.tsx`
- `src/components/admin/quote-document.tsx` — printable Quotation/Receipt component
- `src/components/admin/quote-drawer.tsx` — edit/pricing/payment drawer for a quote
- `src/app/api/admin/quotes/paid/route.ts`
- `src/app/api/admin/quotes/token/route.ts`
- `src/app/(public)/products/details.md` — no; products ISR stays as old Task 6

**Modified:**
- `src/server/quote-store.ts` — extend `QuoteRecord`/`QuoteItem` (document fields); add `ensureQuoteToken`, `setQuoteAccepted`, `setQuotePaid`, `findQuoteByToken`; `updateQuote` recomputes totals
- `src/server/validate.ts` — extend `quoteUpdateSchema` (items `unitPrice`, `validUntil`); add `quotePaidSchema`
- `src/server/validate.test.ts` — new schema cases
- `src/app/api/admin/quotes/route.ts` — PUT recomputes totals + ensures token; GET already lists (now includes document fields)
- `src/components/admin/helpers.ts` — extend `QuoteRow`/`QuoteItem` with document fields + `ctaToWhatsApp`
- `src/app/admin/page.tsx` — render `AdminShell`
- `src/app/(public)/products/page.tsx` + `src/app/(public)/products/[category]/page.tsx` — ISR off `catalog-store` (old Task 6, unchanged)
- `src/lib/catalog-context.tsx` (new, old Task 6), `src/components/quote-builder.tsx` (consume `useCatalog`)
- `src/app/globals.css` — print styles + sidebar/modal helpers

**Deleted:**
- `src/components/admin/analytics-view.tsx` (created then superseded — analytics nav/view is dropped)

---

## Task A: Quote document core

**Files:**
- Create: `supabase/migrations/0003_quote_documents.sql`, `src/lib/quote-document.ts`, `src/lib/quote-document.test.ts`, `src/app/api/admin/quotes/paid/route.ts`, `src/app/api/admin/quotes/token/route.ts`, `src/app/quote/[token]/page.tsx`
- Modify: `src/server/quote-store.ts`, `src/server/validate.ts`, `src/server/validate.test.ts`, `src/app/api/admin/quotes/route.ts`

**Interfaces:**
- Consumes: `getSupabaseClient` (audit.ts), `requireOwner`, `withErrorHandling`, `parseBody`, `QuoteRecord`
- Produces:
  - `quote-document.ts`: `VAT_RATE = 0.15`; `money(n: number): string` → `"GH₵ 120.50"`; `computeTotals(lines: { quantity: number; unitPrice?: number }[]): { subtotal: number; vat: number; total: number }`; `buildQuoteSummary(q: { reference: string; items: { label: string; quantity: number; unitPrice?: number }[]; validUntil?: string | null; totals: { subtotal: number; vat: number; total: number } | null }): string`
  - `quote-store.ts` additions: `ensureQuoteToken(id): Promise<string | null>`; `setQuoteAccepted(id): Promise<boolean>`; `setQuotePaid(id, method): Promise<boolean>`; `findQuoteByToken(token): Promise<QuoteRecord | null>`; `getQuote(id): Promise<QuoteRecord | null>`; `QuoteItem` gains `unitPrice?: number`; `QuoteRecord` gains `valid_until: string | null; accepted_at: string | null; paid_at: string | null; payment_method: string | null; total_amount: number | null; doc_token: string | null`
  - `validate.ts`: `quotePaidSchema = z.object({ id, method: z.enum(["cash","mobile_money","bank","other"]) }).strict()`
  - Routes: `POST /api/admin/quotes/paid` `{ok}`; `GET /api/admin/quotes/token?&id=` `{token}`; `/quote/[token]` public page.

- [ ] **Step 1: Write `0003_quote_documents.sql`**

```sql
-- 0003_quote_documents.sql — Quotation/Receipt lifecycle on quotes
-- Apply via Supabase SQL Editor. Idempotent (safe to paste twice / after 0002).

alter table public.quotes add column if not exists valid_until date;
alter table public.quotes add column if not exists accepted_at timestamptz;
alter table public.quotes add column if not exists paid_at timestamptz;
alter table public.quotes add column if not exists payment_method text;
alter table public.quotes add column if not exists total_amount numeric(12,2);
alter table public.quotes add column if not exists doc_token text;
create unique index if not exists quotes_doc_token_key on public.quotes (doc_token);
```

- [ ] **Step 2: Write failing tests `src/lib/quote-document.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildQuoteSummary, computeTotals, money } from "./quote-document";

describe("computeTotals", () => {
  it("computes subtotal, 15% VAT and total with 2dp half-up rounding", () => {
    const result = computeTotals([
      { quantity: 10, unitPrice: 13 },
      { quantity: 1, unitPrice: 95.55 },
    ]);
    expect(result.subtotal).toBe(225.55);
    expect(result.vat).toBe(33.83);
    expect(result.total).toBe(259.38);
  });
  it("handles a missing unit price as zero", () => {
    expect(computeTotals([{ quantity: 3, unitPrice: 0 }]).total).toBe(0);
  });
});

describe("buildQuoteSummary", () => {
  const priced = {
    reference: "Q-1234",
    items: [
      { label: "Ghacem Supacem 42.5R", quantity: 10, unitPrice: 120 },
      { label: "Hollow Block 6 inch", quantity: 50, unitPrice: 13 },
    ],
    validUntil: "2026-09-30",
    totals: computeTotals([
      { quantity: 10, unitPrice: 120 },
      { quantity: 50, unitPrice: 13 },
    ]),
  };
  it("renders a priced quotation summary", () => {
    const text = buildQuoteSummary(priced);
    expect(text).toContain("Q-1234");
    expect(text).toContain("Ghacem Supacem 42.5R");
    expect(text).toContain("10 × GH₵ 120.00");
    expect(text).toContain("Subtotal: GH₵ 1,850.00");
    expect(text).toContain("VAT (15%): GH₵ 277.50");
    expect(text).toContain("Total: GH₵ 2,127.50");
    expect(text).toContain("Valid until 30 Sep 2026");
  });
  it("renders an unpriced request fallback", () => {
    const text = buildQuoteSummary({ reference: "Q-1", items: [{ label: "Cement", quantity: 5 }], validUntil: null, totals: null });
    expect(text).toContain("Q-1");
    expect(text).toContain("5 × Cement");
    expect(text).not.toContain("Subtotal");
  });
});

describe("money", () => {
  it("formats GH₵ with thousands separators", () => {
    expect(money(2127.5)).toBe("GH₵ 2,127.50");
  });
});
```

- [ ] **Step 3: Run to verify failure** — `npx vitest run src/lib/quote-document.test.ts` → FAIL (module missing)
- [ ] **Step 4: Implement `src/lib/quote-document.ts`**

```ts
export const VAT_RATE = 0.15;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function money(n: number): string {
  return `GH₵ ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function computeTotals(lines: { quantity: number; unitPrice?: number }[]): { subtotal: number; vat: number; total: number } {
  const subtotal = round2(lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0));
  const vat = round2(subtotal * VAT_RATE);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatValidUntil(dateText: string): string {
  const [y, m, d] = dateText.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export type SummaryQuote = {
  reference: string;
  items: { label: string; quantity: number; unitPrice?: number }[];
  validUntil?: string | null;
  totals: { subtotal: number; vat: number; total: number } | null;
};

export function buildQuoteSummary(q: SummaryQuote): string {
  const lines = q.items.map((item) => {
    if (typeof item.unitPrice === "number") {
      return `${item.quantity} × ${item.label} @ ${money(item.unitPrice)}`;
    }
    return `${item.quantity} × ${item.label}`;
  });
  const header = [`Quote ${q.reference}`, ...lines].join("\n");
  if (!q.totals) return header;
  const tail = [
    "",
    `Subtotal: ${money(q.totals.subtotal)}`,
    `VAT (15%): ${money(q.totals.vat)}`,
    `Total: ${money(q.totals.total)}`,
  ];
  if (q.validUntil) tail.push(`Valid until ${formatValidUntil(q.validUntil)}`);
  return `${header}\n${tail.join("\n")}`;
}
```

- [ ] **Step 5: Run tests** → PASS
- [ ] **Step 6: Extend `src/server/quote-store.ts`** — `QuoteItem` gains `unitPrice?: number`; `QuoteRecord` gains the six document fields (all `| null`); extend `updateQuote` patch type with `validUntil?: string | null` and keep camelCase→snake_case mapping; add:

```ts
export async function ensureQuoteToken(id: string): Promise<string | null> {
  const docToken = randomBytes(16).toString("hex");
  const ok = await updateQuote(id, { docToken });
  return ok ? docToken : null;
}

export async function setQuoteAccepted(id: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    if (!client) return false;
    const { error } = await client
      .from("quotes")
      .update({ accepted_at: new Date().toISOString(), status: "won" })
      .eq("id", id);
    if (error) { console.warn(...); return false; }
    return true;
  } catch { return false; }
}

export async function setQuotePaid(id: string, method: string): Promise<boolean> { /* update({ paid_at: now, payment_method: method }) */ }

export async function findQuoteByToken(token: string): Promise<QuoteRecord | null> {
  /* select("*").eq("doc_token", token).maybeSingle(); null on error/none */
}
```

Add `updateQuote` support for `docToken` and `validUntil` keys, and when a patch carries `items`, compute totals with `computeTotals` from `src/lib/quote-document.ts` and include `total_amount` + ensure `doc_token`. (Apply `.update(_) `.eq("id", id)` exactly as existing code; call `ensureQuoteToken` from the route, not inside `updateQuote`, to keep the store single-purpose.)

- [ ] **Step 7: Extend `src/server/validate.ts`** — `quoteUpdateSchema.items` items gain `unitPrice: z.number().min(0).max(9_999_999).optional()`; add `validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined))`; new export `quotePaidSchema`. Add matching cases to `validate.test.ts` (invalid unitPrice negative rejected, extra key rejected, valid paid schema) and run → PASS.
- [ ] **Step 8: Extend `src/app/api/admin/quotes/route.ts` PUT** — after `parseBody`, if `body.items` or `body.validUntil` present and `body.items` has any `unitPrice`, call `computeTotals` then `ensureQuoteToken(id)` to mint `doc_token`; include `total_amount`/`valid_until`/`doc_token` in the update; audit `quote_edited` (and additionally `quote_priced` when prices changed). Keep 503 handling.
- [ ] **Step 9: Create `POST /api/admin/quotes/paid`** — `requireOwner` → `parseBody(quotePaidSchema)` → `setQuotePaid(id, method)` → audit `quote_receipted` → `{ ok: true }`; 503 on false.
- [ ] **Step 10: Create `GET /api/admin/quotes/token`** — `requireOwner` → `?id=` → fetch quote by id (reuse `listQuotes(1, phone)`? No — add `getQuote(id)` to quote-store returning `QuoteRecord | null`), ensure/return `doc_token`; 404 if missing.
- [ ] **Step 11: Create `/quote/[token]/page.tsx`** — `export const dynamic = "force-dynamic"` + `export const metadata = { robots: { index: false, follow: false } }`; server component: `findQuoteByToken(token)` → null or DB absent → `notFound()`; render `<QuoteDocument quote={record} />` (server-safe import from quote-document.tsx — make the document component server-compatible, no hooks) with a Print button (`window.print` via `onClick` client wrapper).
- [ ] **Step 12: Full suite + typecheck** — `npx vitest run` then `npx tsc --noEmit` → green
- [ ] **Step 13: Commit** (only on user go-ahead)

---

## Task B: Ops-first admin shell

**Files:**
- Create: `src/components/admin/admin-shell.tsx`
- Modify: `src/app/admin/page.tsx`, `src/app/globals.css`
- Delete: `src/components/admin/analytics-view.tsx`
- Already done (keep): `src/components/admin/helpers.ts`, `avatar.ts`, `sidebar.tsx`

**Interfaces:**
- Consumes: `useSession` (guard + avatar + signOut), `SidebarNav` + `signOutFlow` + `AdminView` (sidebar.tsx), `NAV` labels
- Produces: `AdminShell` — renders sidebar (desktop) + mobile pill nav, routes `?view=messages|customers|materials` (default `messages`), sign-in gate (render sign-in UI when `session.status !== "signed-in"` or redirect to `/admin/login` — use the existing Phase A login page), badge counts polled from quotes/messages list endpoints every 30s + on focus + after mutations, `onNeedRefresh` wiring to view components.

- [ ] **Step 1: Delete `analytics-view.tsx`** (superseded; no nav tab renders it).
- [ ] **Step 2: Write `admin-shell.tsx`** — client component:

```tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/use-session";
import { SidebarNav, signOutFlow, type AdminView } from "./sidebar";
import { MessagesView } from "./messages-view";
import { CustomersView } from "./customers-view";
import { MaterialsView } from "./materials-view";
import type { Session } from "./helpers";

export default function AdminShell() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") ?? "messages") as AdminView;
  const tab = searchParams.get("tab") ?? undefined;
  const [badges, setBadges] = useState<Partial<Record<AdminView, number>>>({});

  const refreshBadges = useCallback(async () => {
    try {
      const [q, m] = await Promise.all([
        fetch(`/api/admin/quotes?${searchParams.has("phone") ? "" : ""}`, { credentials: "same-origin" }),
        fetch("/api/admin/messages", { credentials: "same-origin" }),
      ]);
      if (!q.ok || !m.ok) return;
      const quotes = (await q.json()) as { quotes: { status: string }[] };
      const messages = (await m.json()) as { messages: { read: boolean }[] };
      setBadges({
        messages: quotes.quotes.filter((x) => x.status === "new").length + messages.messages.filter((x) => !x.read).length,
      });
    } catch { /* ignore polling failures */ }
  }, []);

  useEffect(() => {
    void refreshBadges();
    const id = setInterval(() => void refreshBadges(), 30_000);
    const onFocus = () => void refreshBadges();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [refreshBadges]);

  const navigate = (next: AdminView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    if (next !== "messages") params.delete("tab");
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (session.status === "loading") return <p className="p-6 text-sm text-ink-muted">Checking session…</p>;
  if (session.status === "signed-out") { router.replace("/admin/login"); return null; }

  const content = (() => {
    switch (view) {
      case "customers": return <CustomersView session={session} onNeedRefresh={refreshBadges} />;
      case "materials": return <MaterialsView session={session} onNeedRefresh={refreshBadges} />;
      case "messages":
      default: return <MessagesView session={session} tab={tab === "contact" ? "contact" : "quotes"} onNeedRefresh={refreshBadges} />;
    }
  })();

  return <ShellLayout session={session} active={view} onNavigate={navigate} badges={badges} content={content} />;
}
```

`ShellLayout` (same file): `<div className="flex min-h-dvh"><aside className="fixed inset-y-0 left-0 z-40 w-64 hidden lg:block"><SidebarNav …/></aside><div className="flex-1 lg:pl-64"><MobilePillNav …/><main className="mx-auto max-w-5xl p-4 sm:p-8">{content}</main></div></div>`. Mobile pill nav: horizontal scroll `<nav>` with the same NAV views + badges, sticky top. Sign out on mobile pill row too (small icon button at the end).
- [ ] **Step 3: Print CSS in `globals.css`** — the classic visibility technique:

```css
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
```

- [ ] **Step 4: Rewrite `src/app/admin/page.tsx`** to return `<AdminShell />` (keep the existing `max-w` section out; the shell owns layout). Confirm `/admin/login` and `/admin` guard logic still intact.
- [ ] **Step 5: Typecheck** — `npx tsc --noEmit` → clean; dev smoke: `/admin?view=messages` lands on Messages, pills navigate, mobile pill shows, badge updates after a new quote lands.
- [ ] **Step 6: Commit** (on user go-ahead)

---

## Task C: Messages view (Quotes + Contact) + quote document preview

**Files:**
- Create: `src/components/admin/messages-view.tsx`, `src/components/admin/quote-drawer.tsx`, `src/components/admin/quote-document.tsx`
- Modify: `src/components/admin/helpers.ts` (QuoteRow document fields + `ctaToWhatsApp` + `copyText`)

**Interfaces:**
- Consumes: `GET /api/admin/quotes`, `POST /api/admin/quotes/status`, `PUT /api/admin/quotes`, `POST /api/admin/quotes/paid`, `GET /api/admin/quotes/token`, `GET/PUT/DELETE /api/admin/messages`, `ClientQuoteDocument` from quote-document.tsx, `buildQuoteSummary` + `computeTotals` from quote-document.ts (for preview + reply text)
- Produces: `MessagesView({ session, tab: "quotes" | "contact", onNeedRefresh })`; `QuoteDrawer({ quote, open, onClose, onSaved, onNeedRefresh })`; `ClientQuoteDocument({ quote })` (client-safe wrapper rendering `<QuoteDocument>` + Print/Copy-link buttons)

- [ ] **Step 1: Extend `helpers.ts`** — `QuoteRow` gains `valid_until: string | null; accepted_at: string | null; paid_at: string | null; payment_method: string | null; total_amount: number | null; doc_token: string | null`; `QuoteItem` gains `unitPrice?: number`; add:

```ts
export function ctaToWhatsApp(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/^0/, "233").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}
export async function copyText(value: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(value); return true; } catch { return false; }
}
```

- [ ] **Step 2: `quote-document.tsx`** — shared presentational component (server-safe: no hooks, no `use client`). Props `{ quote: QuoteRow }`. Render inside `div.print-area`: business header (name/phone/email from `src/lib/site.ts` static import — safe server-side), title `QUOTATION` or `RECEIPT` (when `paid_at`), reference + date + customer (name, phone, email, area), item table (description | qty | unit | amount), subtotal/VAT 15%/total rows, `valid_until` ("Valid until {date}"), payment method + paid-at when receipt, plus a large `PAID` stamp overlay when `paid_at`. Cash-neutral styling: sans-serif font stack, `#0d3d1a` accents, no `print:hidden` deps.
- [ ] **Step 3: `quote-drawer.tsx`** — slide-over/right panel modal. Sections:
  - Customer fields: name, phone, email, area, note.
  - **Items editor**: one row per line — label (text), quantity (number), **Price (GH₵)** (number input, blank = unpriced). Buttons to remove a line; "Add line". A "Use catalog prices" affordance is deferred (blank is fine).
  - **Live totals preview**: subtotal / VAT (15%) / total from `computeTotals` over the current prices (client preview only; server is authoritative on save).
  - **Document fields**: Valid until (date input, MM-DD), status select (new/reviewed/won/lost), **Mark accepted** (calls `POST /api/admin/quotes/status` `{id, status:"won"}`), **Mark paid** (opens inline method select cash/mobile_money/bank/other → `POST /api/admin/quotes/paid`).
  - **Actions**: Save edits (PUT — notes that pricing triggers token mint; on success call `onSaved`), **Preview & print** (renders `<ClientQuoteDocument>` overlay + print button using the print CSS), **Copy link** (GET token → copy `/quote/{token}`; clipboard fallback), **Reply on WhatsApp** (`ctaToWhatsApp(quote.phone, buildQuoteSummary(...))` — priced summary when prices exist, else request summary).
  - `onNeedRefresh` after paid/status mutations.
- [ ] **Step 4: `messages-view.tsx`** —
  - Sub-tab bar (Quotes | Contact) writing `?tab=`; the `tab` prop from the shell drives it.
  - **Quotes tab**: loads `GET /api/admin/quotes` (no phone filter; newest first). Toolbar: **Export CSV** (`buildCsv`), **Add a WhatsApp quote** (reuse Phase A manual-add modal — move it in here), count of `status === "new"`. Table rows: reference, customer (name + phone), area, date (`formatDate`), status pill + select, items summary (`formatItems` with prices when present), actions: **Reply** (WhatsApp), **Edit** (opens drawer). Row buttons `onNeedRefresh`.
  - **Contact tab**: loads `GET /api/admin/messages`. Rows: name, phone, area, snippet, read chip; actions: read/unread toggle (`PUT {id, read}`), **Reply on WhatsApp** (pre-filled with quoted message text), edit (inline textarea via `PUT {id, message}`), delete (`DELETE`, confirm). **Mark all read** button top-right.
  - All mutations `onNeedRefresh` (badges) and locally refresh the list.
- [ ] **Step 5: Peak-gate** — `npx vitest run` + `npx tsc --noEmit` → green; dev smoke (dev bypass): open Messages, edit a quote, add prices, preview doc, print view (visually), paid status flips to receipt, copy link opens `/quote/[token]` (404 pre-migration is the expected path until 0003 applied — the drawer Save surfaces the 503 message and the site keeps working).
- [ ] **Step 6: Commit** (on user go-ahead)

---

## Task D: Customers view

**Files:**
- Create: `src/components/admin/customers-view.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/customers` (returns `CustomerRecord[]`), `GET /api/admin/quotes?phone=<normalized>` (history), `PUT /api/admin/customers` (notes/status), `audit` server-side already present
- Produces: `CustomersView({ session, onNeedRefresh })`

- [ ] **Step 1: Implement `customers-view.tsx`** — split pane:
  - List (left): search box (name/phone contains), rows: name, phone, area? (CustomerRecord has no area — show sources chip + `requestCount` + `lastContactAt`), select → detail. Highlight best status (`won`).
  - Detail (right): editable **Notes** textarea + **Status** select (`new|active|won|lost|blocked`) → `PUT /api/admin/customers {phone, notes?, status?}`; **Reply on WhatsApp** via `ctaToWhatsApp`; **quote history**: fetch `GET /api/admin/quotes?phone=<customer.phone>`; render rows with date, reference, items, status pill, and **Reply** on each.
  - Empty state copy when no customers yet ("Customers are built automatically from quotes and messages.").
  - `onNeedRefresh()` after a status change.
- [ ] **Step 2: Gates** — `npx vitest run` + `npx tsc --noEmit` → green; dev smoke: customer row renders from the derived `listCustomers()`; phone-filtered history returns only that phone.
- [ ] **Step 3: Commit** (on user go-ahead)

---

## Task E: Materials view

**Files:**
- Create: `src/components/admin/materials-view.tsx`

**Interfaces:**
- Consumes: `GET/POST/PUT/DELETE /api/admin/catalog/products`, `/api/admin/catalog/categories`, `POST /api/admin/catalog/image` (multipart), `CatalogCategory`/`CatalogProduct` types, `productSchema`/`categorySchema` shapes
- Produces: `MaterialsView({ session, onNeedRefresh })`

- [ ] **Step 1: Implement `materials-view.tsx`** — sub-tabs **Products | Categories** (`?tab=`).
  - **Products tab**: table (image thumb, name, category name, price or "Price on request", stock pill, visible dot, sort) + **Add product** button → modal form (fields per `productSchema`: slug, category select from loaded categories, name, brand, unit, unitPrice, imageUrl + **upload** button → `/api/admin/catalog/image`, description, stock select in|limited|out, pricing-mode switch fixed|quote — when `quote` show "Price on request" badge and blank unitPrice, kind unit|measure, visible toggle, sortOrder number). Row actions: **Edit** (same modal pre-filled), **Hide/Show** (PUT `{visible}`), **Delete** (DELETE with confirm; hard delete). After any mutation `onNeedRefresh()` — no-op for Materials but keeps cadence consistent.
  - **Categories tab**: same pattern (id, name, short, description, imageUrl + upload, visible, sortOrder). Delete = soft hide (server already does `visible=false` — label the button "Hide").
  - Load categories once (products need the id→name map for the table).
  - All forms zod-shaped; server returns `validation_failed` messages surfaced inline.
- [ ] **Step 2: Gates** — `npx vitest run` + `npx tsc --noEmit` → green; dev smoke: add/edit/hide a category + product (503 pre-migration is expected and surfaced), image upload round-trip once 0002 is applied.
- [ ] **Step 3: Commit** (on user go-ahead)

---

## Task F: Public catalog switch + CatalogProvider + final verification

**Files:**
- Create: `src/lib/catalog-context.tsx`
- Modify: `src/app/(public)/products/page.tsx`, `src/app/(public)/products/[category]/page.tsx`, `src/components/quote-builder.tsx`

**Interfaces:**
- Consumes: `catalog-store` (`fetchCategories()`, `fetchProducts()`), `/api/catalog`
- Produces: `CatalogProvider`/`useCatalog` (`{ categories, products, loading }`), ISR pages with `revalidate = 60`

- [ ] **Step 1: Products pages** — replace static `site.ts` imports with `fetchCategories()`/`fetchProducts()` (server components), add `export const revalidate = 60`, drop `generateStaticParams`; keep every other line (UI, filtering) identical.
- [ ] **Step 2: `catalog-context.tsx`** — client `CatalogProvider` fetching `/api/catalog` once with `credentials: "same-origin"`, exposing `{ categories, products, loading }`, seeding from `src/lib/site.ts` until the fetch resolves.
- [ ] **Step 3: Quote builder** — consume `useCatalog()`, keep `validateQuoteContact` + `/api/quote` submit (source `"web"`).
- [ ] **Step 4: Full gates** — `npx vitest run` (all green incl. 130 originals), `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 5: Migration handoff** — paste `0002_cms.sql` + `0003_quote_documents.sql` lines for the user to run in the Supabase SQL Editor; then live smoke: admin catalog edit reflects on `/products` within ~60s; price a quote → WhatsApp summary, document print, `/quote/[token]`, paid→receipt all round-trip against the live DB.
- [ ] **Step 6: Commit** (only with user's explicit go-ahead)

---

## Self-Review Notes

- Spec coverage (quote-documents + ops-first): lifecycle data model (T-A migration + store), totals/VAT server-authoritative (T-A), WhatsApp summary fallback to request text (T-A lib + T-C drawer), printable document + print CSS (T-B print CSS + T-C), public link token-protected + noindex + 404 (T-A), payments/acceptance (T-A routes + T-C drawer), analytics view dropped (T-B delete) with backend retained, badges from lists (T-B), CSV export moved to Messages (T-C), materials/customers (T-D/T-E), old Task 6 ISR (T-F). Deferred items (PDF lib, emailed docs, reminders, tax customisation, discounts) intentionally absent.
- The drawer's client-side totals preview is explicitly non-authoritative; the applied `total_amount` always comes from the server `computeTotals` in Task A Step 8.
- Pre-`0003` state stays resilient: PUT surfaces 503 `storage_unavailable`, the drawer still lets the owner edit unpriced fields, and the public `/quote/[token]` 404s rather than 500s.