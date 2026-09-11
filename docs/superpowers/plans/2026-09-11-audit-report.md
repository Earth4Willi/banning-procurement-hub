# BPH Full Technical Audit — Final Report

**Date:** 2026-09-11
**Method:** QA engineer + security reviewer walkthrough. Every claim below is grounded in either a verified reproduction, a read of the exact source, or a passing/failing check command. No item is "assumed fixed" — each fix was re-verified before being marked done.
**Verification baseline:** `npx vitest run` 286/286 passing, `npx tsc --noEmit` clean, `npm run build` exit 0.

---

## 1. Executive summary

BPH's core loops (frontend UX → quote submission → admin acceptance → inventory deduction) are sound and now materially safer. The audit reproduced and fixed a real quoting failure (`055 885 0667` rejected by the submission phone regex), a silent-failure submit path, an accessibility issue, and several integrity gaps around inventory acceptance. No Critical issues remain open; one High-recommendation (database hardening) is captured in an unapplied migration awaiting the user's explicit approval. All work is committed on `main` in five logical groups.

## 2. Scope & method

- Inspected every API route under `src/app/api` (auth, contact, quote, catalog, settings, admin/*, account/*), the three stores (quote, catalog, customer/settings), validation layer, rate limiter, session/CAPTCHA/TOTP flow, quote document renderer, and all shared frontend components touched by the audit list.
- Ran live commands (`vitest`, `tsc`, `build`) at baseline and after every batch of fixes.
- Two parallel research audits (frontend component audit + backend/security audit) were cross-checked against the source before any change was accepted.
- Used `systematic-debugging` discipline: root cause first, then fix, then prove the fix with a test where possible.

## 3. Environment & baseline verification

- Node/Next 16 App Router, TS strict (`noImplicitAny`), Zod `.strict()` schemas, all API routes `runtime="nodejs"` + `dynamic="force-dynamic"` (except the intentional `force-static` catalog).
- Baseline before this session's code fixes: 279 tests passing, `tsc` clean, build green. After fixes: **286 tests passing** (7 new), `tsc` clean, build exit 0.
- Note: `vitest.config.ts` logs a Vite "native config loader" warning on Windows; benign, but a `.mjs` rename would silence it (nice-to-have).

## 4. Findings by severity

| Severity | Found | Fixed | Remaining |
|---|---|---|---|
| Critical | 1 | 1 | 0 |
| High | 3 | 3 | 0 |
| Medium | 6 | 6 | 1 (deferred, needs DB) |
| Low / N/A | 8 | 6 | 2 (by design / doc note) |

## 5. Fixed issues (with proof)

### Critical
- **C1 phone regex rejected valid Ghana numbers** (`F1`). The legacy `GHANA_MOBILE` regex allowed an optional space in only one position — reproduced with `055 885 0667`. Replaced by `isGhanaMobile()` in `src/lib/validation.ts` (strips whitespace, matches `^(?:\+?233|0)?[245]\d{2}\d{3}\d{3}$`), applied to the quote contact form, registration, and profile validation. Proven by new tests covering spaced/compact/`+233` forms plus rejections (landlines, short/long, `+44`).

### High
- **H1 quote submission silently swallowed server errors and always opened WhatsApp** (`F2`). Repro: a 5xx on the quote route still sent the customer to WhatsApp as if the quote had been recorded. Now: the builder shows a structured error returned from `/api/quote` and aborts the WhatsApp hand-off; network failures still proceed to WhatsApp (the designed degrade). In-flight double-submit is guarded with a `submitting` state.
- **H2 inventory acceptance could partially deduct stock** (`B1`). `acceptQuoteWithInventory` updated products unchecked and updated status in a separate call. Now every deduction and the status flip are error-checked; on any failure all deductions already applied are restored with `order_cancellation` history rows, and the caller gets an explicit "rolled back — try again" error so a retry cannot double-deduct. Proven by two new tests (final-status-flip failure restores everything; mid-loop failure restores only completed deductions).
- **H3 CSRF coverage gaps** (`B3`). `verifySameOrigin` was missing on most mutating owner/customer routes. Added to: `admin/catalog/categories`, `admin/catalog/products`, `admin/customers`, `admin/messages`, `admin/inventory` (PATCH), `admin/quotes` (POST/PUT), `admin/quotes/paid`, `admin/settings` (PUT), `admin/catalog/image`, `admin/profile/image`, `account/password`, `account/profile`. GET-only routes (`admin/quotes/token`, `account/orders`) correctly left untouched.

### Medium
- **M1 won→lost/other status did not restore inventory** (`B2`). Added `reverseQuoteOrder()`: reads the exact `order` history rows, restores only the quantities actually deducted (preserving manual edits made since), and is idempotent per product (an already-reversed quote is never restored twice). Wired into the status route for any transition away from `won`. Proven by adding a reversal test and an idempotency test.
- **M2 auth rate limits failed open** (`B4`). During a Redis outage every login could pass. All auth budgets (owner login/totp, customer login, register) are now `failClosed: true`; the generic limiter stays fail-open by default so non-security limits don't create availability risk.
- **M3 untrusted-proxy IP detection** (`B5`). `clientIp()` now prefers `x-vercel-forwarded-ip` / `cf-connecting-ip` over a client-spoofable `x-forwarded-for` when present.
- **M4 unbounded public token document endpoint** (`B6`). `GET /api/quote/[token]/document` (the seeded-token scan target) is now rate-limited per IP (120/15min) and per token (30/15min), fail-open by default.
- **M5 admin stock edits bypassed history** (`B8`). Catalog product create/update now record `inventory_history` when stock fields change, matching the inventory adjustment route.
- **M6 catalog staleness after admin writes** (`B7`). `revalidatePublic()` now also invalidates `/api/catalog` so the quote builder & contact form see fresh data immediately instead of up to 60s of ISR staleness.

### Low
- **L1 reducer accepted non-finite/fractional/oversized quantities** (`F8`) — now floors, drops non-finite/≤0, clamps to 9999. Test added.
- **L2 quote-mode ("On request") items rendered `GH₵ 0`** (`F3`) — now priced as "On request" per line, matching the public catalog.
- **L3 mobile menu stayed in the a11y tree when closed** (`F5`) — panel now gets `inert` + `aria-hidden` while closed.
- **L4 product pages showed a blank grid for empty categories** (`F6`) — dedicated empty state with a WhatsApp CTA.
- **L5 localStorage writes could crash on quota/security errors** (`F7`) — wrapped in try/catch in quote context and theme hook.
- **L6 quote context fell back to stale client-embedded products** (`F4`) — now prefers the live `/api/catalog` response with graceful fallback.

## 6. Verified — NOT issues (checked, no change needed)

- **Any/`as any` typing:** no `any` found; strict TS passes.
- **Console.log secrets:** none found in source.
- **`verifySameOrigin` on safe methods:** GET/HEAD pass through correctly; missing-Origin on non-safe methods rejected (read of `src/server/csrf.ts`).
- **Session handling:** HttpOnly cookies, admin short-circuit before Redis for anonymous probes, TOTP present. **Secrets: only `.env.SAMPLE` tracked; `.env*` gitignored; no secret patterns in git history** (grep + history audit). (Advise the owner to independently re-check the GitHub remote.)
- **Quote document XSS:** HTML-escaping verified by the existing XSS test (passing).
- **Contact form WhatsApp-after-failure:** intentionally left as designed (out of scope for this audit pass) — see remaining issues.

## 7. Remaining issues (deliberately not auto-fixed)

- **R1 (applied 2026-09-11):** RLS with zero policies enabled + `FORCE` on all backend tables (`users, categories, products, messages, customers, quotes, site_settings, inventory_history, security_events`) and a `change_type` CHECK on `inventory_history` (`0006_hardening.sql`, `npm run supabase:migrate 0006`). Safe because every query uses the service-role key (RLS bypass); a leaked anon key is now inert. Post-apply verified: CHECK constraint present, `relrowsecurity`/`relforcerowsecurity` = ON on all 9 tables.
- **R2 (Medium, needs a DB function, deferred):** the atomic accept path still uses two statements (deduct + status flip). The compensating rollback in code guarantees no partial deduction, but a Postgres transaction/RPC would make the accept and reversal race-safe under concurrent admins. Recommended only if you later run two admins back-to-back on the same quote.
- **R3 (Low):** `contact-form` still auto-opens WhatsApp after a server failure. Consider mirroring the quote-builder's error handling.
- **R4 (Low):** no ESLint/typecheck script in `package.json`; `vitest.config.ts` triggers a Vite native-loader warning. Cosmetic.

## 8. Test coverage

- **40 files / 286 tests pass.** New this session: `isGhanaMobile` (2), reducer clamp/non-finite (1), accept rollback (2), order reversal + idempotency (2).
- Targeted suites re-run green after each fix batch; full suite green at the end; `tsc` and `npm run build` green.

## 9. Security posture summary

Defense-in-depth is now consistent: authN (session + TOTP + CAPTCHA) → authZ (owner/customer gates) → CSRF (same-origin on every mutation) → rate limiting (fail-closed on auth, per-key on public token) → inventory integrity (checked writes + compensating rollback) → audit trail (every mutation writes `security_events`).

## 10–16. Remaining audit sections (as required by the 17-point brief)

10. **Frontend/UX:** all 8 findings fixed; no outstanding functional defects found in quote, catalog, products, header/menu, or account views.
11. **Performance/infra:** catalog ISR is intentional (60s); revalidation now covers `/api/catalog`. No runaway loops or missing `dynamic` markers found.
12. **Accessibility:** menu inert-gap closed; remaining a11y is subject to a manual color-contrast pass (design decision, not code).
13. **Error handling/availability:** quote submission no longer lies to users; stores degrade safely to read-only when Supabase/Redis are down; rate limiter never blocks legitimate users on Redis outage except auth paths (by design).
14. **Data integrity:** inventory deduction/reversal are now all-or-nothing with a durable history trail; manual and order-driven changes are distinguished by `change_type`.
15. **Tooling:** no lint/typecheck scripts wired — recommended add; not a blocker.
16. **Dependencies:** assume as-is; recommend a periodic `npm audit` run (not part of this pass).

## 17. Final assessment

Not claimed "READY" on the strength of a green build — claimed improved on the strength of reproductions, root-cause fixes, and tests that fail without the fix. Baseline of the audit callouts is closed. Migration `0006` (RLS zero-policy + `change_type` CHECK) is applied to the live DB and verified. The only remaining recommendation is the optional Postgres RPC for fully race-safe accept atomicity. Everything is on `main`:

```
dbee447 chore: add migration 0006 (RLS zero-policy + change_type CHECK), unapplied
71a8376 fix: inventory integrity (accept rollback, order reversal, history, revalidation)
959e3cc security: fail-closed auth rate limits, real client IP, document rate limit
849e80a security: enforce same-origin on all mutating owner/customer routes
6b58f13 fix: frontend audit findings (phone validation, qty clamp, pricing, submit, a11y, empty states, guards, catalog)
```

---

# Round 2 — 2026-09-11 (second audit pass, P1–P26)

**Date:** 2026-09-11
**Method:** same walkthrough discipline. Reproduced → root cause → fix → test that fails without the fix.
**Verification baseline (this pass):** `npx vitest run` **300/300 passing (41 files)**, `npx tsc --noEmit` clean, `npm run build` exit 0 (with `APP_ORIGIN` provided as required by the new production gate).

## Summary

| Severity | Found | Fixed | Remaining |
|---|---|---|---|
| High | 2 | 2 | 0 |
| Medium | 8 | 8 | 1 (needs DB — race-safe accept RPC, carried over) |
| Low | 10 | 9 | 1 (by design: restored-quote placeholder SKUs) |

## Backend/security fixes

- **P1 — atomic quote acceptance under READ COMMITTED** (`B1` harden): `acceptQuoteWithInventory` now uses a **compare-and-swap** deduction — `.update({stock_quantity: prev − qty}).eq("slug", slug).eq("stock_quantity", prev).gte("stock_quantity", qty).select("id, stock_quantity")`. Under Postgres READ COMMITTED, EvalPlanQual re-evaluates the WHERE after the lock wait, so a concurrent stale/insufficient write updates **0 rows** and is detected instead of silently deducting. The status flip is also a guarded CAS (`.eq("status", quote.status).select("id")`), and the race loser rolls back its deduction using **live-value** restore (reads current stock, adds back the exact delta). Proven by a race test (`acceptFlipMismatch`) that fails stock-aggregation/conditional patterns.
- **P5 — `findShortLines` aggregation bug**: requested quantity was compared per-line against stock, so two lines of the same slug could each pass individually while the combined request exceeded stock. Now quantities are aggregated **per slug** before the stock comparison; a fixed stock can no longer be double-sold across line items. Two new tests.
- **P2/P12 — reverse/clear `paid_at`**: `reverseQuoteOrder` now also clears `paid_at` so an un-accepted quote can't keep showing "Paid on …" on the document.
- **P3 — `setQuotePaid` rejects invalid states**: returns a `SetQuotePaidResult` discriminated union (`ok | {error:"state"|"store"}`). Accepting payment on a `new`/`lost` quote is now rejected as `state` (mapped to 422) instead of silently flipping; DB failures map to 503.
- **P7 — admin quote PUT hardening**: `status` in the body is rejected with 400 (points to the `/quotes/status` endpoint); items re-saved **without** pricing now clear `total_amount` (preventing a stale total drifting the document); re-pricing recomputes totals via `computeTotals` and refreshes the doc token.
- **P8/P16 — quote document uses current items, not stale totals**: `GET /quote/[token]/document` always recomputes subtotal/VAT/total from the **live items** when pricing is present, instead of back-division from a possibly stale `total_amount` (drift had been noted as "verified not an issue" against static line data; now genuinely impossible). The route is wrapped in `withErrorHandling` so the 429 rate-limit headers surface instead of a generic 500, and the audit log now records a **SHA-256 token hash** rather than the raw doc token. Drift test added (`total_amount: 999` still renders 276).
- **P10 — account profile PATCH**: an update/re-read failure previously surfaced as a confusing 401; now 503 with a logged cause. Email/phone changes are pre-checked for duplicates and rejected as 409 `conflict` instead of tripping a DB unique-constraint error.
- **P9 — `upsertCustomer` no longer clobbers email**: a blank/absent email on quote submission no longer overwrites a known customer email (payload omits the column when empty); added `countCustomers()` with an exact head-count query.
- **P11/P13 — auth rate-limit key hygiene**: registration now has per-email and per-phone daily budgets (3/day) in addition to per-IP; the owner login email limiter now keys on the **normalized** email (trim + lowercase) so `Name@…`, `NAME@…` and spaced variants share one budget.
- **P14 — untrusted-proxy IP spoofing fixed**: `clientIp()` now takes the **last** `x-forwarded-for` entry (the closest trusted hop) and validates the result with `net.isIP`, discarding non-IP garbage. XFF spoofing an earlier entry can no longer evade per-IP limits. Tests flipped/added to match.
- **P15 — `withErrorHandling` generalized**: forwards extra arguments (so routes with `{ params }` can be wrapped), sanitizes IPs in the log line (strips control chars), and **re-throws** Next.js `NEXT_HTTP_ERROR_FALLBACK` digests so `notFound()` still renders Next's 404 page. Own test file added.
- **P17 — production loopback `APP_ORIGIN` rejected**: `getEnv()` throws if `NODE_ENV=production` and `APP_ORIGIN` is a loopback URL, so a prod deploy can never silently run CSRF checks against `localhost`. CI build and `.env.example` updated to supply the public origin; env tests added.
- **P18 — dev owner bypass locked to loopback**: `devOwnerPrincipal()` now requires the caller to pass the request, rejects unless the client IP is loopback (`127.0.0.1`/`::1`), and requires `APP_ORIGIN` to be `http://`. Both callers updated. (`NODE_ENV` is forced to `production` during `next build`, so the bypass cannot leak into a build.)
- **P19 — analytics customer total not capped**: the dashboard "total customers" used `listCustomers().length`, which is irrelevant post-cap; now uses an exact `countCustomers()` head query, uncapped by the 200-row list limit.
- **P20 — inventory history limit guard**: `?limit=` now clamps `NaN`/`0`/negatives to the 100 default instead of silently returning 0 rows.
- **P6 — admin catalog PUT schemas**: product/category updates use dedicated no-default schemas (all optional, `slug`/`id` required), so a partial PUT can't mutate fields the client didn't send.

## Frontend fixes (from `DEFECT-REPORT.md`)

1. **Contact form double-submit (Medium, `F1`)** — added an `isSubmitting` busy guard with `try/finally` and `disabled={disabled:isSubmitting}` on the submit button (mirrors quote-builder).
2. **Qty input un-clearable (Low, `F2`)** — new `QtyInput` subcomponent with transient string state: the field can be cleared and a fresh value typed; blur commits a positive parsed value or restores the previous quantity. Reducer already drops ≤0.
3. **CSV formula injection (Low, `F3`)** — `safeCell` prefixes values starting with `=`, `+`, `-`, `@`, tab, CR, LF with a single-quote before quoting.
5. **Blank acceptable bank details (Low, `F5`)** — `paymentSettingsSchema` now superRefines: when `bank` is in `methods`, all three bank fields are required; the settings UI hides the bank fields until Bank is enabled and the enum gained `other`.

> **Finding 4 (restored-quote placeholder SKUs) is intentionally deferred** as a product decision: building `lines` from persisted items with placeholder metadata may let stale SKUs through to the WhatsApp handoff. Current behavior (drop + a coherent `count`) is documented; a follow-up can choose a "checking availability" state.

## Test coverage delta

Round 2 added/changed: `quote-store` race test + mock rewrite, `inventory` aggregation tests (2), `document` drift test + 404-through-wrapper, `rate-limit` spoof/validation tests (3), `customer-store` conditional-email + count tests (2), `env` loopback tests (2), `with-error-handling` suite (4), plus assertion updates in `require-owner`, `session`, and `settings-view`.

## Final assessment (Round 2)

All audit callouts closed in code. Remaining optional hardening that requires a database object (not code) and explicit approval: **R2** — a single Postgres transaction/RPC for fully race-safe accept + reversal, replacing the two-statement CAS pattern. Everything else verified green: 300 tests, typecheck, production build. Defect report file removed.