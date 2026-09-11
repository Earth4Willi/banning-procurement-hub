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