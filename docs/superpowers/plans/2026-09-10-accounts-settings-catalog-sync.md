# Customer Accounts, Online Orders, Settings & Catalog Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Banning Procurement Hub e-commerce capable — customers register/sign in, submit delivery-aware quotes that attach to their account, and view their orders; the owner edits site-wide settings (marquee, contact, payment methods + bank transfer details, delivery areas) and the materials catalog from one place, with home/material pages reflecting those edits.

**Architecture:** Extend the existing Redis-session auth from owner-only to an `owner | customer` principal union; introduce a DB-backed `users` store and a key→jsonb `site_settings` store (DB-first with the existing `site.ts` static seed as fallback, mirroring `catalog-store.ts`); replace the split-brain static reads (home category grid, product search, footer, header marquee) with the DB-first stores; revalidate the public shell on admin writes. One idempotent migration covers users, settings, and the new quote columns.

**Tech Stack:** Next.js App Router, TypeScript, Zod, @upstash/redis + @upstash/ratelimit, bcryptjs, Supabase (service-role via `getSupabaseClient`), Vitest (jsdom), React 19.

## Global Constraints

- `VAT_RATE = 0.15`; totals server-computed only; `doc_token` minted once.
- Quote status funnel exactly `new | reviewed | won | lost`; payment methods exactly `cash | mobile_money | bank | other`.
- Client never writes audit; `security_events` best-effort.
- Session cookie remains `bph_session`, SameSite=Lax, HttpOnly; absolute TTL from env.
- No customer "forgot password" (no outbound email/SMS infra) — change-password with current password only.
- PowerShell shell: no `&&`, no `head/tail`; run `npx tsc --noEmit`, `npx vitest run`, `npm run build` as separate calls.
- Per-task local commits on `main`; NOTHING pushed without explicit user go-ahead.
- Every DB call must degrade gracefully (fallback/empty) when Supabase/Redis is unconfigured (same contract as `task-{A..F}`).
- Copy tones/terms follow existing `site.ts` wording. GH₵ formatting via `money()`.

## Decision Records

1. **Bank transfer details live in `site_settings.payments`** (editable in admin; rendered on quote document when `payment_method = bank`), not code.
2. **One combined migration** `0004_phase3.sql` (users + site_settings + quote columns) → single SQL paste.
3. **Content sections (stats/testimonials/faqs/certifications) deferred**; same `site_settings` table can carry them later.
4. **User settings full scope**: profile, delivery defaults, change password (all in `/account`).
5. **Catalog becomes single source of truth everywhere (DB-first, site.ts fallback)**; admin writes call `revalidatePath("/", "layout")`.

---

## Task 1: Migration + Settings Types + Session Union

**Files:**
- Create: `supabase/migrations/0004_phase3.sql`
- Create: `src/lib/settings-types.ts`
- Create: `src/server/user-store.ts`
- Modify: `src/server/session.ts` (principal union)
- Create: `src/server/require-customer.ts`
- Modify: `src/server/validate.ts` (add register/account/settings schemas + `accountProfileSchema`)
- Test: `src/server/session.test.ts` (extend), `src/server/user-store.test.ts`, `src/server/catalog-store.test.ts` (extend if needed)

**Interfaces:**
- Produces:
  - `type Principal = OwnerPrincipal | CustomerPrincipal` where `CustomerPrincipal = { id: string; role: "customer"; email: string; name: string; phone: string }`
  - `SessionRecord = { principal: Principal; lastSeen: number }`
  - `createSession(store, principal: Principal)` / `readSession(store, id): Promise<Principal | null>` / `rotateSession` / `revokeSession` — same signatures, union widened.
  - `requireCustomer(request: NextRequest): Promise<CustomerPrincipal | null>`
  - `src/server/user-store.ts`: `CustomerUser`, `createUser`, `findUserByEmail`, `findUserByPhone`, `findUserById`, `updateCustomerProfile`, `updateCustomerPasswordHash`, `autoAdoptQuotes(phone, userId)`
  - `src/lib/settings-types.ts`: `SiteSettingsContent`, `MarqueeItem`, `MarqueeSettings`, `BankDetails`, `PaymentSettings`, `DeliverySettings`, `SettingsMap = { site; marquee; payments; delivery }`, `SEED_SETTINGS: SettingsMap`, `SETTINGS_SCHEMAS`
- Consumes: `getSupabaseClient` (audit.ts), `getEnv`, `hashPassword`/`verifyPassword`, `newSessionId`, `RedisSessionStore`.

### Migration (`supabase/migrations/0004_phase3.sql`)

```sql
-- 0004_phase3.sql - Accounts, online orders, site settings + catalog sync
-- Apply via Supabase SQL Editor. Idempotent: safe to run twice.

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  phone text not null unique,
  name text not null default '',
  area text not null default '',
  address text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quote attachments
alter table public.quotes add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.quotes add column if not exists delivery_address text not null default '';
alter table public.quotes add column if not exists intended_payment_method text not null default '';
create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists users_phone_idx on public.users (phone);

-- Site settings (key -> jsonb, seeded from src/lib/site.ts)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('site', '{"name":"Banning Procurement Hub","tagline":"Your one-stop source for quality building materials across Ghana.","phoneDisplay":"055 885 0667","phoneIntl":"+233558850667","whatsappNumber":"233558850667","email":"banning173@gmail.com","address":"Office location shared on request. Serving all 16 regions of Ghana.","addressShort":"Accra, Ghana","hours":{"summary":"Mon to Sat, 8am to 6pm","detail":"Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment."},"mapEmbedUrl":"https://maps.google.com/maps?q=Accra%2C%20Ghana&t=&z=12&ie=UTF8&iwloc=&output=embed","responsePromise":"Quotes within 24 hours","guarantee":"Every material is quality-checked before delivery. Replacements or refunds for genuine defects."}'::jsonb),
  ('marquee', '{"messages":["Quotes within 24 hours","Delivered across all 16 regions"]}'::jsonb),
  ('payments', '{"methods":["mobile_money","bank","cash"],"bank":{"bankName":"","accountName":"","accountNumber":""}}'::jsonb),
  ('delivery', '{"areas":["Greater Accra","Ashanti","Central","Western","Eastern","Volta","Ahafo","Bono","Bono East","Oti","Northern","North East","Savannah","Upper East","Upper West","Western North"]}'::jsonb)
on conflict (key) do nothing;
```

Steps (test-first for the pure/logic parts):

- [ ] **Step 1: Extend `session.test.ts`** — add cases: `createSession`/`readSession` round-trips a `CustomerPrincipal`; `rotateSession` preserves it. Use the existing in-memory stub store if present, else add one.
- [ ] **Step 2: Widen types in `src/server/session.ts`**: `OwnerPrincipal` unchanged; add `CustomerPrincipal`; `SessionRecord`/`createSession`/`readSession`/`rotateSession` use `Principal`.
- [ ] **Step 3: `src/lib/settings-types.ts`** — types + `SEED_SETTINGS` (values exactly mirroring migration + `site.ts`); export `SettingsKey = "site" | "marquee" | "payments" | "delivery"`.
- [ ] **Step 4: `src/server/user-store.ts`** — TDD: `createUser` inserts + returns `CustomerUser { id, email, phone, name, area, address }`; `findUserByEmail`/`findUserByPhone`/`findUserById` return row or null; `updateCustomerProfile(id, partial)`; `updateCustomerPasswordHash(id, hash)`; `autoAdoptQuotes(phone, userId)` updates `quotes.set user_id` where `phone = $1 and user_id is null` (page size cap, e.g. 200). All best-effort → null/false/0 on missing client, warn logged (follow `customer-store.ts` cadence).
- [ ] **Step 5: `src/server/require-customer.ts`** — mirror `require-owner.ts` (no dev bypass): cookie → `readSession` → cast to `CustomerPrincipal` when `role === "customer"`, else null.
- [ ] **Step 6: validate.ts additions** (TDD in `validate.test.ts`):
  - `registerSchema` `{ name, email, phone, password, area?, address? }` (password 8–200, has upper+lower+digit; area/address optional max 120/500).
  - `customerLoginSchema` = `loginCredentialsSchema` shape (reuse).
  - `accountProfileSchema` `{ name?, email?, phone?, area?, address? }` all optional.
  - `changePasswordSchema` `{ currentPassword, newPassword }` (same password rule).
  - `settingsUpdateSchema` discriminated by key → per-key schema (`siteSettingsSchema`, `marqueeSettingsSchema` `{ messages: string[] 1..12 each <=160 }`, `paymentSettingsSchema` `{ methods: enum[] min1; bank: { bankName<=120, accountName<=120, accountNumber<=60 } }`, `deliverySettingsSchema` `{ areas: string[] 1..40 each <=120 }`).
- [ ] **Step 7: Gates** — `npx tsc --noEmit`; `npx vitest run` (all pass).
- [ ] **Step 8: Commit** — `feat(auth+settings): session union, user-store, settings types, 0004_phase3 migration`

---

## Task 2: Customer Auth + Account APIs + Quote Attachment

**Files:**
- Create: `src/server/customer-auth.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/customer/login/route.ts`
- Modify: `src/app/api/auth/me/route.ts` (return customer principal)
- Create: `src/app/api/account/profile/route.ts` (GET/PATCH)
- Create: `src/app/api/account/password/route.ts` (POST)
- Create: `src/app/api/account/orders/route.ts` (GET)
- Modify: `src/server/quote-store.ts` (`QuoteRecord`/`QuoteInput` + `listQuotesByUser`)
- Modify: `src/app/api/quote/route.ts` (attach user_id if customer session; accept `deliveryAddress`, `intendedPaymentMethod`)
- Modify: `src/server/validate.ts` (`quoteSubmitSchema` gains optional fields)
- Test: `src/server/customer-auth.test.ts`, `src/server/quote-store.test.ts` (extend), `src/server/validate.test.ts` (extend)

**Interfaces:**
- `registerCustomer({ name, email, phone, password, area?, address? }): Promise<CustomerUser>` — normalizes via schemas, rate-limits (ip 10/900), constant-time generic errors, bcrypt cost 12, `autoAdoptQuotes(phone, id)`, audit `customer_registered`.
- `loginCustomer({ request, email, password }): Promise<CustomerPrincipal>` — rate-limit ip 15/900 + email 6/900, `GENERIC = "Invalid email or password."`, always run bcrypt against existing user hash when found else against a dummy hash.
- `requireCustomer` from Task 1.
- `listQuotesByUser(userId, limit=100): Promise<QuoteRecord[]>`.
- `quoteSubmitSchema` gains `deliveryAddress?` (max 500) and `intendedPaymentMethod?` (enum incl. "") → undefined.

Steps:

- [ ] **Step 1: TDD `customer-auth.test.ts`** — register returns user; duplicate email/phone throw `unauthorized("email_in_use")`/`("phone_in_use")` (code review: use `HttpError 400`, generic message to avoid enumeration, issue codes `email_taken`/`phone_taken`); login success returns principal; wrong password throws 401 generic; unknown email 401 generic; rate-limit respected (mock Redis limiting → assert 429 path via `enforceRateLimit`).
- [ ] **Step 2: `customer-auth.ts`** impl (uses `user-store`, `passwords`, `rate-limit`, `http-error`).
- [ ] **Step 3: register route** — `verifySameOrigin`, `parseBody(registerSchema)`, `registerCustomer`, then `createSession` + `sessionCookieConfig` on response `Set-Cookie`; audit; return 201 `{ ok: true, user }` (no hash).
- [ ] **Step 4: login route** — `verifySameOrigin`, `parseBody(customerLoginSchema)`, `loginCustomer`, `createSession` + cookie, audit `customer_logged_in`; 200 `{ ok: true }`.
- [ ] **Step 5: `me` route** — when `requireCustomer` returns a user, return `{ role: "customer", email, name, phone, area, address }` (avatarUrl omitted); owner branch unchanged. (Read current me route first.)
- [ ] **Step 6: account/profile** — GET returns `requireCustomer` profile; PATCH `parseBody(accountProfileSchema)` → `updateCustomerProfile`, re-session (email/phone changed) via `rotateSession`, audit `profile_updated`.
- [ ] **Step 7: account/password** — POST `changePasswordSchema`; verify `currentPassword` against stored hash (`verifyPassword`), always-bcrypt if unknown guard, `updateCustomerPasswordHash`, `rotateSession` (rotate existing session), audit `password_changed`.
- [ ] **Step 8: account/orders** — GET `requireCustomer` → `listQuotesByUser(principal.id)` → map to safe rows (reference, status, created_at, items, totals, payment_method, doc link path `/api/quote/{token}/document` if doc_token).
- [ ] **Step 9: quote route attachment** — read customer via `requireCustomer` (optional); `persistQuote({...body, userId: principal?.id ?? null})`; `quote-store` inserts `user_id`, `delivery_address`, `intended_payment_method`; update `QuoteRecord`/`QuoteInput` types + `coerceQuote`. `listQuotesByUser` filters `user_id = id`.
- [ ] **Step 10: Gates** — `npx tsc --noEmit`; `npx vitest run`.
- [ ] **Step 11: Commit** — `feat(auth): customer register/login/me, account profile/password/orders, quote->user attach`

---

## Task 3: Account + Auth Pages

**Files:**
- Create: `src/app/register/page.tsx`, `src/components/auth/register-form.tsx`
- Create: `src/app/login/page.tsx`, `src/components/auth/login-form.tsx`
- Create: `src/app/account/page.tsx`, `src/components/account/account-view.tsx`
- Modify: `src/components/header.tsx` (customer-aware auth nodes), `src/components/mobile-menu.tsx`
- Test: `src/components/auth/register-form.test.tsx`, `src/components/auth/login-form.test.tsx`, `src/components/account/account-view.test.tsx` (mock `fetch`)

**Notes:**
- Pages are server components rendering the client forms. Login redirects to `/account` on success via `router.push`.
- `/account`: client view with tabs **Profile | Delivery | Security | My Orders**; guards `useSession()`-style via a new `useCustomerSession()` hook (fetch `/api/auth/me`, handle owner) or reuse `useSession` extended to expose `role`. Sign-out reuses the existing `signOut` path.
- Header: when `role === "customer"` show Account link (+ sign out); owner keeps Admin + sign-out. Add "My account" link in `mobile-menu` alongside sign in.
- Forms mirror the existing `sign-in-dialog.tsx` visual language + `helpers.ts` `api()`.

Steps are standard TDD: write failing component tests (mock fetch), implement, pass, gates, commit `feat(ui): customer register/login/account pages + header wiring`.

---

## Task 4: Settings Store + Admin Settings UI + Bank on Quote Document

**Files:**
- Create: `src/server/settings-store.ts` (DB-first, seed fallback; `getSettings(key)`, `getPublicSettings()`, `updateSettings(key, value)`; `revalidatePath` NOT here — caller)
- Create: `src/app/api/admin/settings/route.ts` (GET all / PUT per key; owner-only; validate via `settingsUpdateSchema`; audit `settings_updated`; `revalidatePath("/", "layout")`)
- Create: `src/app/api/settings/route.ts` (public GET, safe merged: site summary + marquee.messages + payment methods + bank label-safe fields? — expose `paymentMethods` labels and `bank` details only in admin; public exposes methods + delivery.areas + responsePromise)
- Modify: `src/components/admin/admin-shell.tsx` + `src/components/admin/sidebar.tsx` (add `settings` view + icon)
- Create: `src/components/admin/settings-view.tsx` (Site & contact, Marquee, Payments & bank, Delivery sections; add/edit/delete/reorder marquee entries; reuses `inputClass`/`api()` from materials-view/helpers; bank details fields)
- Modify: `src/components/admin/quote-document.tsx` (render bank block when `payment_method === "bank"`: fetch bank details from `GET /api/admin/settings?key=payments` or pass as prop from messages-view which already loads quote; simplest: a small `getBankDetails` helper fetched in the dialog)
- Modify: `src/app/api/admin/catalog/*` write routes (`products`/`categories`) + `settings` route → call `revalidatePath("/", "layout")` after successful write (single helper `src/server/revalidate.ts` `revalidatePublic()`).
- Test: `src/server/settings-store.test.ts`, `src/components/admin/settings-view.test.tsx`

**Interfaces:**
- `settings-store.ts`:
  - `getSettings<K extends SettingsKey>(key: K): Promise<SettingsMap[K]>` — DB row else `SEED_SETTINGS[key]`.
  - `getPublicSiteSettings(): Promise<{ site, marquee, payments, delivery }>` — used by server components + `/api/settings`.
  - `updateSettings(key, value): Promise<boolean>` — upsert; best-effort false on missing client.
- `/api/settings` GET returns `{ site: {responsePromise, phoneIntl, whatsappNumber, email, addressShort, hours}, marquee: { messages }, delivery: { areas }, payments: { methods: [{key, label}] } }` — no bank details publicly.
- `quote-document.tsx` bank block: `PaymentInformation` shows `Bank Transfer` + `Bank: X · Account name: Y · Account number: Z` from the admin-loaded bank details when method = bank.

Commit: `feat(settings): admin settings store+api+ui, public settings, bank transfer block on quote doc, public revalidation`

---

## Task 5: Catalog Sync (home/footer/search DB-first) + Image Remove

**Files:**
- Modify: `src/components/sections/category-grid.tsx` → server `async` component reading `fetchCategories()` + `fetchProducts()` (visible-only, `sort_order`) then mapping to a server-safe card (`CategoryCard` stays client; pass category record + count props).
- Modify: `src/components/product-search.tsx` → fetch `/api/catalog` on mount (DB-first), search in state; keep untouched static fallback until fetch resolves.
- Modify: `src/components/footer.tsx` → `fetchCategories()`.
- Modify: `src/components/materials-view.tsx` → "Remove image" button (sets form imageUrl "") next to Upload in both product + category modals.
- Modify: `src/app/api/catalog/route.ts` → confirm it returns visible-only; add `?kind=catalog` parity. (Likely already DB-first via `catalog-store`.)
- Test: `src/components/sections/category-grid.test.tsx` (mock `catalog-store` via vi.mock), `src/components/product-search.test.tsx`.

**Revalidation:** `src/server/revalidate.ts` `revalidatePublic()` → `revalidatePath("/", "layout")` + `revalidatePath("/products", "layout")`. Wire into `products`, `categories`, `image`, and `settings` admin routes after successful mutations.

Commit: `fix(catalog): DB-first home/footer/search, revalidate public shell on admin writes, image remove`

---

## Wrap-up

- Run full gates: `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Lead-review walkthrough; capture brain notes.
- Hand user: paste `supabase/migrations/0004_phase3.sql` (single paste), restart `npm run dev`, smoke checklist; NOTHING pushed.

## Deferred Explicitly
Password reset/forgot (no outbound email/SMS); content sections CMS (stats/testimonials/faqs/certs) — extensible via same `site_settings` table; online cart/checkout + payment capture (Approach B, WhatsApp/Momo confirm); RLS policies on `users`/`site_settings` (all reads/writes are service-role server-side today — revisit when adding anon auth).