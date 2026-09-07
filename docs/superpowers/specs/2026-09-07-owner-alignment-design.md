# Banning Procurement Hub — Owner-Alignment Frontend Pass

> **Status:** Approved 7 September 2026
> **Source:** `Banning-Procurement-Hub-Website-Guide.md` (owner questionnaire responses)

## Purpose

Align the existing frontend with the owner's questionnaire decisions, ahead of the backend
phase. No rebrand, no cart/checkout/payments, no auth build — those are backend-phase work.
Keeps the current green/gold design system and the existing quote basket as the unified
request lane.

## Decisions confirmed with the user

1. Scope: data/content alignment, form→email delivery, navigation & phone CTA, delivery-area
   dropdown. No palette rebrand.
2. Form→email uses **Web3Forms** (owner does a one-time signup to verify `banning173@gmail.com`
   and supply an access key). WhatsApp handoff is retained as the live channel.
3. Auth gate (browse open; add-to-quote / request-quote requires sign-up or login) is
   **specified for the backend phase only** — no behavior change this pass.
4. Dual pricing model uses a **unified basket**: fixed-price items show price + "Buy Now",
   quote-only items show no price + "Get Quote"; both add to the existing basket.

## Changes

### 1. Data & content — `src/lib/site.ts` + images

- `siteConfig.email` → `banning173@gmail.com` (updates footer mailto, contact page, form
  destinations automatically).
- Add categories `blocks`, `paint`, `other` (name, short, description, image). Category grid,
  products jump-nav, per-category pages, and sitemap derive from the `categories` array, so no
  wiring needed there.
- Add ~8 sample products across the new categories with plausible sample pricing.
- Add `pricingMode: "fixed" | "quote"` to `Product`. Sample assignment: iron rods
  (`deformed-bar-12mm`, `deformed-bar-16mm`), long-span roofing sheets, and bulk sand are
  `quote`; everything else is `fixed`.
- Stats `"6 categories"` → `"9"`.
- `deliveryAreas` → the 16 Ghana regions (dropdown source).
- Update page copy/metadata that enumerates the old six categories (products page, contact page).

### 2. Product card — "Buy Now" vs "Get Quote" (`src/components/product-card.tsx`)

- `fixed`: show price, a "Buy Now" badge, and a "Buy Now" button.
- `quote`: show no price, a "Get Quote" badge, and a "Get pricing" button.
- Both add to the existing basket via `useQuote().add`. Stock badge/behavior unchanged.

### 3. Forms → email (`quote-builder.tsx`, `contact-form.tsx`, lib)

- New `src/lib/forms.ts`: `submitViaWeb3Forms(payload)` POSTs to `https://api.web3forms.com/submit`
  using `NEXT_PUBLIC_WEB3FORMS_KEY`. Inert (skips POST) when the key is unset — WhatsApp handoff
  remains. `.env.example` updated.
- Quote and contact forms keep the WhatsApp deep-link and additionally POST to email on submit.
- Add optional `email` field to the quote form; extend `QuoteContact`, validation util, and
  `whatsapp.ts` message format.
- Delivery area free-text input → `<select>` of the 16 regions, in both forms.

### 4. Navigation & phone CTA (`header.tsx`, `mobile-menu.tsx`)

- Desktop nav: "Materials" → "Products"; add "Request a Quote" link; add a click-to-call button
  in the right-side actions.
- Mobile menu: same label change, add "Request a Quote" primary item, add a phone action.

### 5. Auth requirement (backend phase, documented only)

- Browse stays open; quote/request actions will require sign-up/login in the backend phase.
  No behavior change this pass.

## Out of scope (backend phase or owner confirmation)

- Real cart, checkout, payment gateway, order status.
- Auth implementation.
- Product detail pages, delivery-fee calculator, delivery/district rate cards.
- Exact brands, MoMo/bank numbers, warehouse address, logo assets, real product photos.
- Palette/design rebrand.

## Error handling

- Web3Forms POST never blocks the user: failures and unconfigured keys degrade to the WhatsApp
  handoff and a friendly status message.
- Region select defaults to empty and validates as required.
- Email is optional; validated with a standard regex when provided.

## Testing & verification

- Vitest: extend validation tests (email valid/invalid, region select), add `forms` helper tests
  (mock `fetch`: configured/success, configured/failure, unconfigured skip).
- `npm test`, `npm run build` (static export must succeed), TypeScript typecheck.