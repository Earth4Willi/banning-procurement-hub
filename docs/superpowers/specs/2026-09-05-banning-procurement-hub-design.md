# Banning Procurement Hub — Design Spec

- **Date:** 2026-09-05
- **Status:** Approved
- **Author:** OpenCode agent + client via brainstorming
- **Project root:** `D:\Opencode\Web Projects\BPH`

## 1. Context

Banning Procurement Hub is a Ghana-based construction and real-estate procurement
business (+233 055 885 0667). This site is its digital storefront and lead-generation
engine. Visitor journey: **Discover → Browse Products → Request Quote → Receive Quote
(via WhatsApp) → Place Order & Pay → Delivery**.

The site must build trust (testimonials, "1,200+ Projects Completed" stats,
certifications), make contact frictionless (click-to-call, WhatsApp float button,
Google Maps embed), and position the business as "Ghana's #1 Procurement Hub for
Construction".

## 2. Decisions (locked)

- **Stack:** Next.js 15 App Router, **static export** (`output: "export"`). No server,
  no DB, no keys. Deploy via any static host.
- **Quote delivery:** WhatsApp handoff. The quote form builds a structured pre-filled
  `wa.me/233558850667?text=...` message. No backend form service.
- **Catalogue data:** ship with **sample data + placeholder imagery**, clearly tagged
  as replaceable. Data lives in one typed file so real data swaps in without rework.
- **Styling:** Tailwind v4 with brand tokens (CSS custom properties + theme).
- **Animation:** Motion (import `motion/react`), subtle scroll reveals only, honors
  `prefers-reduced-motion`.
- **Icons:** `@phosphor-icons/react` (single family, consistent stroke).
- **Fonts:** self-hosted via `next/font` — Outfit (display), Manrope (body),
  JetBrains Mono (numeric data only).
- **Design read:** local-business storefront / lead-gen, trust-first + premium accent
  language. Dials: DESIGN_VARIANCE 4, MOTION_INTENSITY 3, VISUAL_DENSITY 5.

## 3. Architecture

### 3.1 Stack detail

- Next.js 15 App Router, `output: "export"`, TypeScript.
- Tailwind v4 via `@tailwindcss/postcss`.
- Brand palette as CSS custom properties; mapped into Tailwind theme tokens.
- Motion for scroll-reveal (client leaf components only; server components render
  static layouts).
- All images via `next/image` (fills as static export target supports `unoptimized`
  or the export build handles them).

### 3.2 Data layer (single source of truth)

`src/lib/site.ts` — typed constants:

```ts
siteConfig  // name, phone, whatsapp number, email placeholder, address,
            // hours, map embed URL, socials, response-time promise
stats       // 1,200+ projects, team size, delivery coverage, payment trust
categories  // id, name, short, image, description, items[]
products    // slug, categoryId, name, brand, unit, unitPrice, image, description
testimonials // name, role, company, quote (sample, marked)
certifications // name, issuer/annual, description
faqs        // 5 questions/answers
```

All sample data entries carry a `SAMPLE` marker so the client knows what to replace.

### 3.3 Quote builder state

Client-side only, React context + reducer:

- `state: { items: { [productId]: qty }, }`
- Actions: `add`, `remove`, `setQty`, `clear`.
- Persisted to `localStorage` so the cart survives navigation/reloads.
- Header badge shows item count; `/quote` consumes and prefills the WhatsApp message.

## 4. Information Architecture

| Route | Purpose |
|---|---|
| `/` | Hero (split, asymmetric), stats band, 6-category grid, How It Works (Discover → Browse → Quote → Deliver), testimonials, certifications, FAQ (5), final CTA, footer (hours, map, links) |
| `/products` | Catalogue overview: category cards + client-side search/filter |
| `/products/[category]` | Six category pages: cement, iron-rods, tiles, roofing, plumbing, electricals. Grid of sample product cards with "Add to Quote" |
| `/quote` | Request a Quote: itemized builder + contact fields → WhatsApp handoff |
| `/about` | Company story, mission, certifications, guarantee + response-time promise |
| `/contact` | Contact details, hours, map embed, WhatsApp form |
| `/privacy`, `/terms` | Legal pages (launch gate) |
| `/404` | Custom 404 |

**Global chrome:** sticky header (nav on one line, ≤ 72px), mobile menu,
WhatsApp float button, quote badge, scroll-to-top, skip-to-content link.

## 5. Visual Design System

### 5.1 Palette (locked tokens)

| Token | Hex |
|---|---|
| `--color-primary-900` | `#0d3d1a` |
| `--color-primary-700` | `#1a6b2f` |
| `--color-primary-500` | `#2e9e4f` |
| `--color-accent` | `#F0B429` |
| `--color-accent-light` | `#FDD87A` |
| `--color-surface` | `#FAF8F3` |
| `--color-white` | `#FFFFFF` |
| `--color-ink` | `#111A14` |

Single accent (gold), used everywhere. No floating colors, no purple gradients
(guardrail). Deep green = brand, gold = CTA/highlights, cream = page surface.

### 5.2 Theme

- **Light (default):** cream surface, ink text, deep-green brand, gold CTAs.
- **Dark:** deep-green charcoal (`#0a2410` family) surfaces, gold preserved, ink→cream
  text. Respects `prefers-color-scheme` + manual toggle.
- WCAG AA on all body text (min 4.5:1), AAA on hero copy.

### 5.3 Type & shape

- Display: Outfit, tracking-tight, `leading-[1.05]` with descender clearance
  (`pb-1`) on italic/descender words.
- Body: Manrope, `text-base`, `max-w-[65ch]`.
- Mono: JetBrains Mono for stats/prices.
- Corner scale (documented rule): buttons 10px, inputs 10px, cards 16px. No pills.
- Shadows tinted to surface hue (no pure-black shadows).

### 5.4 Interactive states (full cycle)

- Loading: skeleton loaders matching final layout shape.
- Empty: composed empty states ("Real pricing & photos coming soon").
- Error: inline form errors below inputs; toast for transient confirmations.
- Tactile: `:active` translate/scale push; hover on every interactive element.
- CTA contrast: gold button = dark-green text (AA); verified per button.

### 5.5 Imagery

- Sample photography per category/product (real-stock-style, seeded, replaceable).
- Palette-consistent; no AI-slop, no unlabeled fakes.
- Hero uses a real photo asset (not gradient blob).

## 6. Conversion & Trust

- One CTA label per intent: **"Get a Quote"** used across nav/hero/footer/quote.
- Phone clickable everywhere (`tel:+233558850667`).
- WhatsApp float button on every page.
- Response-time promise ("Quotes within 24 hours").
- Stats, testimonials, certifications, guarantee statement.
- Trust microstrip (delivery coverage, payment methods) lives below hero, not inside.

## 7. SEO & Launch

- Per-page titles + meta descriptions, OG tags, `robots.txt`, `sitemap.xml`,
  `llms.txt`, `manifest`, favicon.
- LocalBusiness/Organization JSON-LD on home + contact.
- Alt text on all images; last-updated dates on FAQ/legal.
- Custom 404, breadcrumbs on category pages.

## 8. Testing & QA

- `npm run build` (static export) must pass clean.
- Serve `out/` (`npx serve`) and walk every route, every state.
- Lighthouse pass ≥ 90 across categories; CLS < 0.1; images sized/reserved.
- Check both light & dark modes; mobile (`< 768px`) single-column collapse.
- No horizontal scroll on any viewport; all links resolve; copyright year current.
- Color contrast audit on every button/form.

## 9. Scope Boundaries (what we are NOT building now)

- No admin panel / CMS.
- No payment processing / checkout.
- No server or database.
- No real order tracking.
- No blog (deferred; `llms.txt` and sitemap cover indexing).
- Catalogue sample data to be replaced by the business.

## 10. Design isolation notes (SOLID)

- Data (`site.ts`), quote state (context), WhatsApp builder (pure util), UI components
  (one purpose each), and metadata/SEO (per-page) are separate modules with narrow
  contracts. Swapping sample→real data touches only `site.ts`.