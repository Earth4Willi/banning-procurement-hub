# Banning Procurement Hub

Marketing site and quote builder for Banning Procurement Hub, a building materials supplier in Ghana. Browse cement, iron rods, tiles, roofing, plumbing and electrical materials, build a quote, and send it straight to the team on WhatsApp.

Live site: https://banningprocurementhub.com

## Features

- Catalogue across 6 categories with live client-side search
- Quote builder with client-side validation and WhatsApp handoff
- Dark and light themes, persisted per visitor
- Contact page with call, WhatsApp and email channels
- About, privacy, terms and custom 404 pages
- Static SEO: sitemap, robots, manifest, Open Graph and JSON-LD
- Responsive layout, skip-link and keyboard-friendly controls

## Tech stack

- Next.js 16 (App Router) in server mode — pages are prerendered; `/api/*` route handlers run on the server
- TypeScript
- Tailwind CSS v4
- Motion for animations
- Phosphor icons
- Vitest + jsdom for tests
- Server layer: Supabase (audit log, future persistence), Upstash Redis (rate limiting, owner sessions), zod, bcryptjs

## Design system

- Colors: deep green `#0d3d1a` / `#1a6b2f` / `#2e9e4f`, gold `#F0B429` / `#FDD87A`, cream surface `#FAF8F3`, ink `#111A14`
- Dark theme switches via `data-theme` on the document root, persisting under the `bph-theme` key
- Fonts: Outfit (display), Manrope (body), JetBrains Mono (numeric) via `next/font/google`
- Shapes: 10px on small controls, 16px on cards; no pill-shaped elements by design
- Design tokens live in `src/app/globals.css`

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in the backend keys (see below)
npm run dev                  # local dev server
npm run build                # production build
npm run start                # serve the production build (server mode)
npm test                     # vitest (70 tests)
npm run typecheck            # tsc --noEmit
```

Server-mode routes (`/api/quote`, owner sign-in at `/api/auth/*`) read their configuration from environment variables at runtime. They are validated by `src/server/env.ts` on first use and fail fast if a required variable is missing. Generate secrets with:

```bash
# AUTH_SECRET (>= 32 chars) and OWNER_TOTP_SECRET (20 random bytes, base32):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(20).toString('base64').replace(/=+$/,'').toUpperCase())"

# OWNER_PASSWORD_HASH (bcrypt, cost 12 in production):
npx tsx -e "import('bcryptjs').then(b=>console.log(b.hashSync(process.argv[1],12)))" 'your-password-here'
```

## How to update the catalogue

All site content lives in one file: `src/lib/site.ts`.

Edit `categories`, `products`, `testimonials`, `certifications` and `faqs`, then re-run `npm run build`. Prices, brands, descriptions and stats are current SAMPLE data to be replaced with confirmed figures before launch.

Each product also has a `stock` field: `"in"`, `"limited"` or `"out"`. The catalogue shows an availability badge on every card—countable items (`kind: "unit"`) read *In stock / Limited / Out of stock*, while uncountable measure items like sand (`kind: "measure"`) read *Available / Low stock / Unavailable*—and out-of-stock products cannot be added to a quote.

The `/products` page groups the catalogue by category with a sticky jump-nav; each category also has a dedicated page (`/products/<category-id>`).

Pages are prerendered and need no runtime backend; the `/api` route handlers (quote submission, owner authentication) do need the environment variables above. Rate limiting degrades gracefully: if Redis is unreachable, requests flow through rather than the site erroring. Same for the owner sign-in: it cannot complete end-to-end until real `UPSTASH_REDIS_*` keys exist (sessions live in Redis), though the auth modules themselves are unit-tested.

### Images

- Hero: `public/hero.jpg` (1200×800) — replace with the final brand photo.
- Logo lockup: `public/logo.svg` — single self-contained SVG embedding the brand lockup with a transparent background (no white box on light surfaces). Built by `scripts/make-logo-transparent.py` (clean luminance-based alpha from the original JPG, no flood-fill) and embedded by `scripts/build-logo-lockup.ps1`. Used in the header, footer and mobile menu.
- Dark mode lockup: `public/logo-dark.svg` — recolored variant (dark surface bg `#0b2412`, lightened content) for dark mode. Built by `scripts/make-logo-dark.py` (luminance-based recolor) and embedded by `scripts/build-logo-lockup.ps1 -Dark`. Swapped in via CSS when `[data-theme="dark"]`; the header also goes fully opaque in dark mode so the logo merges exactly.
- Transparent background: `scripts/remove-logo-bg.py` (edge flood-fill) produces `logo/logo main 3 transparent.png` for the app icons/OG compositing.
- App icons/OG: `public/main-logo.png` is the transparent lockup; the favicon (`src/app/icon.png`), PWA icons and social card (`public/og.png`) keep a brand-green field for visibility and are regenerated via `scripts/generate-logo-assets.ps1`.
- Category and product images are local files in `public/materials/<key>.jpg` (900×700, 4:3), referenced from `site.ts` as `/materials/<key>.jpg`.
- Current material photos are CC-licensed placeholders sourced from Wikimedia Commons; attribution is recorded in `public/materials/credits.json`.
- Swap them for your own photos (matching filename) and re-run `npm run build`. Keep the aspect ratio to preserve CLS.
- `scripts/seed-material-images.mjs` regenerates the material placeholders from Wikimedia Commons (requires an internet connection).

## How quotes work

- Visitors add products to a quote which persists in `localStorage` under the `bph-quote` key.
- The quote page validates name, phone and delivery area client-side.
- Submitting builds a WhatsApp message and opens `wa.me/233558850667?text=...`; the buyer sends it manually.

A parallel server path (`POST /api/quote`) records submissions through the security floor — rate limiting (Upstash, sliding window), strict origin check against CSRF, a 16 KB body cap with schema validation (zod), and a best-effort `security_events` audit insert into Supabase. It returns `202` with a reference id; persistence/CTAs for it arrive in a later iteration.

The nav offers an **owner sign-in** (desktop action cluster + mobile menu) with the same security floor applied across four routes in a standard two-step authenticator flow. `POST /api/auth/login` (same-origin check, per-IP and per-email rate limits, email + password verified via bcrypt) issues a one-shot, ip-bound pending login (TTL 120s). `POST /api/auth/login/verify` (per-IP rate limit, Redis `getdel` consume, TOTP check) completes login with a Redis-backed session cookie. `GET /api/auth/me` reads the session (fast 401 when no cookie), and `POST /api/auth/signout` revokes + clears it. The dialog auto-advances from credentials to the "Enter your code" screen. Success flips the nav to an "Owner" chip with a sign-out action. Sign-in is owner-only — visitors stay guests and add-to-quote stays frictionless. Admin dashboard, quote persistence and live database wiring are the next phase.

## Project structure

```
src/
  app/              App Router pages and layouts, plus /api route handlers
  components/       UI components and sections
  lib/              site data, quote state, validation, formatting
  server/           backend security modules (env, auth, csrf, rate-limit,
                    session, totp, pending-login, validate, audit) with unit tests
public/             static assets: favicon, OG image, manifest
```

## Deployment

Build produces a server-ready bundle. Deploy to any Node-capable host (Vercel, Netlify, Railway) and set the environment variables from `.env.example` (`SUPABASE_URL`, `UPSTASH_REDIS_REST_URL`, `AUTH_SECRET`, `OWNER_*`, etc.). The route handlers need the service-role Supabase key, so they must never run in the browser bundle — they are server-only (`src/server/*` is not imported by any client component).

The security headers (CSP, HSTS, frame/embedding protections, MIME sniffing) are emitted by `next.config.mjs` `headers()`.

Pending client confirmation before launch: the live domain (the sitemap, `metadataBase` and the "Live site" line above use https://banningprocurementhub.com as a placeholder), real product data and photos (current content is SAMPLE), the JSON-LD `email` address, official social links and any analytics ID (none configured by design).

## Legal review note

The privacy policy and terms of service are DRAFTS written by an AI and have not been reviewed by a lawyer. The privacy page's claim that hauliers are "verified" should be confirmed against your actual vetting process before launch, and the JSON-LD `email` field is intentionally empty until the client confirms it.