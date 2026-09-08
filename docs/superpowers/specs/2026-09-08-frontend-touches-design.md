# Frontend Changes — Shine Sweep, Card Polish, Add-to-Quote Feedback, Owner Sign-In

**Date:** 2026-09-08
**Status:** Approved
**Committed in scope:** `7027186` (backend security floor) — this spec builds on its `src/server` modules.

## Why

Four owner-directed touches, staying inside the site's "subtle / refined" motion guardrails:

1. A **shining ray that sweeps across product-card images on hover** (piazam.com's signature glint — the ray across the photo, triggered by pointing at an already-loaded card; the *loading skeleton* shimmer from piazam is explicitly **not** wanted).
2. **Card hover polish** — a soft elevated shadow and border tint on top of the existing lift + image zoom, plus a gentle price pop.
3. **Add-to-quote feedback** — a check-icon pop-in and a one-shot accent pulse instead of a plain text swap.
4. **Owner sign-in in the nav** — a "Sign in" icon + label (desktop action cluster and mobile menu) opening a working password + TOTP login, wired to the tested `src/server` auth modules. On success the nav flips to an "Owner" chip with Sign out.

**Out of scope (deferred):** admin dashboard, quote/catalogue persistence, live Supabase migration, customer accounts, prompt-to-login gates for visitors.

## 1. Card shine sweep

- Host element: the card image wrapper in `product-card.tsx` (already `relative ... overflow-hidden`).
- A single decorative span (`aria-hidden`) inside it: full-height skewed white-gradient bar, `pointer-events-none`, resting off-card left at `opacity 0`.
- On `group-hover`, a one-shot CSS animation sweeps it across the image and fades it out near the far edge (~700ms, `ease-out`). No reverse sweep on unhover (keyframes-as-trigger, not a transition).
- Runs over grayscale out-of-stock images too — reads as a glass glint.
- Respects `@media (prefers-reduced-motion: reduce)` (no animation) and only visually matters on hover-capable devices (naturally inert on touch).

## 2. Card hover polish

- Keep `hover:-translate-y-1` + `group-hover` image `scale-105`.
- Add on `group-hover`: elevated green-tinted shadow and a slightly stronger border tint (no layout shift — border stays 1px, tint changes; optional inner ring instead of border-width change).
- Price row: ~200ms scale deepen (group-hover) — reads as a tiny focus pop without moving the layout.

## 3. Add-to-quote feedback

- Keep the existing 1600ms JS timer and `added` state.
- On add: check icon pops in (small scale keyframe), and the accent button does a one-shot fill pulse (deep-green flash, back to accent), then rests. Accessible: the existing `aria-live="polite"` span is preserved.

## 4. Owner sign-in

### Frontend

- **Nav (desktop):** "Sign in" button (icon + label) in the right action cluster in `header.tsx`. When signed in it becomes an "Owner" chip with a Sign out action.
- **Nav (mobile):** — a "Sign in" (or "Owner · Sign out") row pinned at the top of the `mobile-menu.tsx` panel, above Primary links.
- **Dialog** (`components/sign-in-dialog.tsx`): email, password, 6-digit TOTP; inline generic error (`Invalid email, password, or code.`); busy submit state; Escape + backdrop close; focus move into the dialog on open (pattern copied from `mobile-menu.tsx`).
- **Session hook** (`lib/use-session.ts`): on mount calls `GET /api/auth/me`; exposes `{ status: "loading" | "signed-out" | "signed-in", email, refresh(), signOut() }`. Header and mobile menu share it.

### Backend (thin routes over tested modules)

- `POST /api/auth/login` — `verifySameOrigin` → rate limits (`rl:login:ip` 20/15min, `rl:login:email` 5/15min) → `loginWithPassword` → `createSession` (Redis) → set httpOnly `SameSite=Lax` session cookie → `204`. Errors via `withErrorHandling` (structured, no leak).
- `GET /api/auth/me` — read session cookie → `readSession` → `200 { email, role }` or `401`.
- `POST /api/auth/signout` — `verifySameOrigin` → `revokeSession` → clear cookie → `204`.
- No new design: all auth/validation primitives already shipped and unit-tested in `src/server/*`.
- **Operational caveat:** end-to-end login requires real `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in `.env.local` (sessions live in Redis). Until then the degrade path keeps rate limiting permissive; module behavior stays covered by the 70 green unit tests.

## Files

- `src/app/globals.css` — shine + pop keyframes, reduced-motion guard
- `src/components/product-card.tsx` — shine span, hover polish, add feedback
- `src/components/header.tsx` — Sign in / Owner chip (desktop)
- `src/components/mobile-menu.tsx` — Sign in / Owner row
- `src/components/sign-in-dialog.tsx` — new login dialog
- `src/lib/use-session.ts` — new session hook
- `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/auth/signout/route.ts` — new auth routes
- `.env.example`, `README.md`, `PROJECT-PLAYBOOK.md` — env note + status touch

## Verification

- `npm test` (70 green), `npm run typecheck`, `npm run build` all pass.
- Manual smoke: hover shine on a card, add-to-quote feedback, dialog open/close/Escape, and — with keys present — the full login flip.