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

- Next.js 16 (App Router) with static export (`output: "export"`)
- TypeScript
- Tailwind CSS v4
- Motion for animations
- Phosphor icons
- Vitest + jsdom for tests

## Design system

- Colors: deep green `#0d3d1a` / `#1a6b2f` / `#2e9e4f`, gold `#F0B429` / `#FDD87A`, cream surface `#FAF8F3`, ink `#111A14`
- Dark theme switches via `data-theme` on the document root, persisting under the `bph-theme` key
- Fonts: Outfit (display), Manrope (body), JetBrains Mono (numeric) via `next/font/google`
- Shapes: 10px on small controls, 16px on cards; no pill-shaped elements by design
- Design tokens live in `src/app/globals.css`

## Quickstart

```bash
npm install
npm run dev       # local dev server
npm run build     # production static export to out/
npx serve out     # serve the exported build locally
npm test          # vitest (20 tests)
npm run typecheck # tsc --noEmit
```

## How to update the catalogue

All site content lives in one file: `src/lib/site.ts`.

Edit `categories`, `products`, `testimonials`, `certifications` and `faqs`, then re-run `npm run build`. Prices, brands, descriptions and stats are current SAMPLE data to be replaced with confirmed figures before launch.

Each product also has a `stock` field: `"in"`, `"limited"` or `"out"`. The catalogue shows an In stock / Limited / Out of stock badge on every card, and out-of-stock products cannot be added to a quote.

The `/products` page groups the catalogue by category with a sticky jump-nav; each category also has a dedicated page (`/products/<category-id>`).

The site is fully static. No environment variables or API keys are required.

### Images

- Hero: `public/hero.jpg` (1200×800) — replace with the final brand photo.
- Logo lockup: `public/logo.svg` — single self-contained SVG embedding the full brand lockup (mark + "Banning Procurement Hub" wordmark, from `logo/logo main 3.jpg`, 665×186), used in the header, footer and mobile menu. Regenerate after any master-logo change with `scripts/build-logo-lockup.ps1`.
- Brand mark (for icons/OG): `public/main-logo.jpg` is a copy of the same lockup; the favicon (`src/app/icon.png`), PWA icons and social card (`public/og.png`) are regenerated from it via `scripts/generate-logo-assets.ps1`.
- Category and product images are local files in `public/materials/<key>.jpg` (900×700, 4:3), referenced from `site.ts` as `/materials/<key>.jpg`.
- Current material photos are CC-licensed placeholders sourced from Wikimedia Commons; attribution is recorded in `public/materials/credits.json`.
- Swap them for your own photos (matching filename) and re-run `npm run build`. Keep the aspect ratio to preserve CLS.
- `scripts/seed-material-images.mjs` regenerates the material placeholders from Wikimedia Commons (requires an internet connection).

## How quotes work

- Visitors add products to a quote which persists in `localStorage` under the `bph-quote` key.
- The quote page validates name, phone and delivery area client-side.
- Submitting builds a WhatsApp message and opens `wa.me/233558850667?text=...`; the buyer sends it manually, nothing is transmitted to a server.

## Project structure

```
src/
  app/              App Router pages and layouts
  components/       UI components and sections
  lib/              site data, quote state, validation, formatting
public/             static assets: favicon, OG image, manifest
```

## Deployment

Build produces a static `out/` directory. Deploy it to any static host (Netlify, Vercel, Cloudflare Pages, S3/CloudFront). No build-time environment variables are needed.

Pending client confirmation before launch: the live domain (the sitemap, `metadataBase` and the "Live site" line above use https://banningprocurementhub.com as a placeholder), real product data and photos (current content is SAMPLE), the JSON-LD `email` address, official social links and any analytics ID (none configured by design).

## Legal review note

The privacy policy and terms of service are DRAFTS written by an AI and have not been reviewed by a lawyer. The privacy page's claim that hauliers are "verified" should be confirmed against your actual vetting process before launch, and the JSON-LD `email` field is intentionally empty until the client confirms it.