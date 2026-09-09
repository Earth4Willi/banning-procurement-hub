# Phase 4 wrap-up — live database, quote persistence, and the owner admin dashboard

> **Date:** 2026-09-09 · **Commit:** `1e01647` (pushed, auto-deployed) · Status: **LIVE**

## What shipped

1. **Live Supabase project** (`qubjxqbkipvokrbpxbqt`) — free tier, tables applied via the migration runner:
   - `public.quotes` — reference (unique, the `/api/quote` reference id), name, phone, email, area, note, items (jsonb), status (`new | reviewed | won | lost`), created_at.
   - `public.security_events` — `event`, `metadata` jsonb, created_at.
   - **RLS enabled on both, zero anon policies** — verified live: the anon key can *not* read (returns `[]`) or write (401 `row-level security policy`), while the server-side service-role client is unaffected.

2. **Quote persistence** — `POST /api/quote` now inserts through `src/server/quote-store.ts` (best-effort: degrades like `audit.ts` when Supabase isn't configured). Response stays `202 { ok, reference }`.

3. **Owner admin dashboard** (`/admin`, owner-gated):
   - `GET /api/admin/quotes` → quote inbox (newest first, `dbAvailable` flag)
   - `POST /api/admin/quotes/status` → `new → reviewed / won / lost` workflow, audited as `quote_status_updated`
   - `GET /api/admin/events` → tamper-proof audit trail
   - If a user isn't signed in the API redirects to login and the page shows the sign-in prompt; signed-in nav shows an **Admin** link (desktop + mobile menu).
   - CSV export (UTF-8 BOM + CRLF), owner portrait from the supplied photo (`public/owner.jpg`), dark-mode-ready.

4. **Env + tooling** — `SUPABASE_URL/ANON/SERVICE_ROLE` added to `.env.local` and Vercel prod (encrypted); `pg` devDependency + `npm run supabase:migrate` migration runner (DB password passed at runtime, never stored); `image/` source photos gitignored.

## Verification (all green)

- **CI equivalent local:** 90/90 tests (incl. new `quote-store` degraded-path, `require-owner`, `adminQuoteStatusSchema`), `tsc --noEmit`, `next build`.
- **Live e2e against the production domain** (`banning-procurement-hub.vercel.app`):
  - owner login (password → TOTP code) → 204 + session cookie
  - `GET /api/admin/quotes` → 200, `dbAvailable: true`
  - submit quote → `202` + reference; row appears in inbox; `quote_submitted` event recorded
  - status → `reviewed`; persisted + `quote_status_updated` event recorded
  - test row removed afterwards; RLS anon probes passed (`[]` read, 401 write).

## Config to carry forward

- `APP_ORIGIN` on Vercel prod governs the CSRF origin check used by every POST — keep in sync with the live domain (currently `https://banning-procurement-hub.vercel.app`).
- `OWNER_TOTP_SECRET`/`AUTH_SECRET` unchanged; owner creds and TOTP secret live in `.env.local` + Vercel.

## Still open

- **Web3Forms key** — verify `banning173@gmail.com` at web3forms.com, set `NEXT_PUBLIC_WEB3FORMS_KEY` in Vercel, redeploy (quote/contact form email delivery).
- Custom domain, real photos/catalogue data, GA4 + Search Console, legal review, brand doc, postgres password rotation (client action), `PROJECT-PLAYBOOK.md` remaining QA gates.