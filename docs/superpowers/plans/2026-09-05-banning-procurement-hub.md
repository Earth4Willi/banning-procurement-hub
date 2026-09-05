# Banning Procurement Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-ready static Next.js storefront for Banning Procurement Hub with a catalogue, quote-builder, and WhatsApp lead handoff.

**Architecture:** Next.js 15 App Router with `output: "export"` (zero backend). All business data lives in a single typed file (`lib/site.ts`). Quote state is a client-side context + reducer persisted to `localStorage`. The quote form builds a structured pre-filled `wa.me` message. Static assets (robots, sitemap, manifest, JSON-LD) generated at build.

**Tech Stack:** Next.js 15, TypeScript, Tailwind v4 (`@tailwindcss/postcss`), Motion (`motion/react`), `@phosphor-icons/react`, Vitest + jsdom for unit tests. Fonts self-hosted via `next/font/google` (Outfit, Manrope, JetBrains Mono).

## Global Constraints

- Static export only. `next.config.mjs` must set `output: "export"`, `images.unoptimized: true`, `trailingSlash: true`. No server code, no env vars, no DB, no API routes.
- Phone (Ghana): display `055 885 0667`, `tel:+233558850667`, WhatsApp `wa.me/233558850667`.
- Brand palette (hex, locked): primary `#0d3d1a` / `#1a6b2f` / `#2e9e4f`, accent `#F0B429`, accent-light `#FDD87A`, surface `#FAF8F3`, white `#FFFFFF`, ink `#111A14`. Single accent = gold. No purple, no emojis, no em-dashes (use commas, colons, or punctuation), no pill-shaped buttons (radius: buttons 10px, inputs 10px, cards 16px).
- One CTA label per intent: all quote-request CTAs read **"Get a Quote"** (header, hero, footer, category pages, quote page). Secondaries: "Browse Materials", "Call Now".
- Testimonials, stats, certifications, products, prices: SAMPLE data, clearly tagged. Real data replaces the content of `lib/site.ts` only.
- Dark mode supported via `data-theme` attribute + `prefers-color-scheme` fallback, manual toggle in header, persisted to localStorage.
- Honor `prefers-reduced-motion`: Motion reveals collapse to static.
- All copy must pass a de-slop check: no fake precision, no AI-cute strings, placeholders marked.
- Verify every task with `npm run test` and `npm run typecheck`; end tasks with `npm run build` succeeding and a commit.

---

### Task 0: Scaffold the Next.js static export project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx` (minimal shell; filled in Task 4)
- Create: `src/app/page.tsx` (minimal placeholder; filled in Task 5)
- Create: `public/favicon.ico` (Next.js auto-uses absent favicon; add `src/app/icon.svg` in Task 12)

**Interfaces:**
- Produces: runnable project where `npm run build` emits `out/`, `npm run test` runs Vitest, `npm run typecheck` runs `tsc --noEmit`.

- [ ] **Step 1** — `package.json`

```json
{
  "name": "banning-procurement-hub",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2** — Install dependencies

Run: `npm install next react react-dom motion @phosphor-icons/react` and `npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss postcss vitest jsdom`

- [ ] **Step 3** — `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
```

- [ ] **Step 4** — `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "out"]
}
```

- [ ] **Step 5** — `postcss.config.mjs`

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 6** — `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Install `@vitejs/plugin-react` with: `npm install -D @vitejs/plugin-react`

- [ ] **Step 7** — `.env.example`

```env
# No secrets. Banning Procurement Hub is a static-export site.
# Business contact and catalogue data live in src/lib/site.ts.
```

- [ ] **Step 8** — `src/app/globals.css` (brand tokens + theme)

```css
@import "tailwindcss";

@theme inline {
  --color-primary: var(--primary);
  --color-primary-700: var(--primary-700);
  --color-primary-500: var(--primary-500);
  --color-accent: var(--accent);
  --color-accent-light: var(--accent-light);
  --color-surface: var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --font-display: var(--font-outfit);
  --font-body: var(--font-manrope);
  --font-mono: var(--font-jetbrains);
}

:root {
  --primary: #0d3d1a;
  --primary-700: #1a6b2f;
  --primary-500: #2e9e4f;
  --accent: #f0b429;
  --accent-light: #fdd87a;
  --surface: #faf8f3;
  --surface-alt: #f2eee3;
  --ink: #111a14;
  --ink-muted: #4a574f;
}

[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --primary: #2e9e4f;
    --primary-700: #1a6b2f;
    --primary-500: #2e9e4f;
    --accent: #f0b429;
    --accent-light: #fdd87a;
    --surface: #0b2412;
    --surface-alt: #12391d;
    --ink: #f2f5ee;
    --ink-muted: #b8c4b8;
  }
}

[data-theme="dark"] {
  --primary: #2e9e4f;
  --primary-700: #1a6b2f;
  --primary-500: #2e9e4f;
  --accent: #f0b429;
  --accent-light: #fdd87a;
  --surface: #0b2412;
  --surface-alt: #12391d;
  --ink: #f2f5ee;
  --ink-muted: #b8c4b8;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--surface);
  color: var(--ink);
  font-family: var(--font-body), system-ui, sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 9** — `src/app/layout.tsx` minimal shell (complete later)

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banning Procurement Hub",
  description: "Ghana's #1 Procurement Hub for Construction. Cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10** — `src/app/page.tsx` minimal placeholder

```tsx
export default function Home() {
  return <main>Banning Procurement Hub</main>;
}
```

- [ ] **Step 11** — Verify scaffold

Run: `npm run build`
Expected: build succeeds, `out/index.html` exists.

- [ ] **Step 12** — Commit

```bash
git add -A
git commit -m "chore: scaffold next.js static export with brand tokens"
```

---

### Task 1: Data layer (`lib/site.ts`) + integrity tests

**Files:**
- Create: `src/lib/site.ts`
- Test: `src/lib/site.test.ts`

**Interfaces:**
- Produces (consumed by every later task):
  - `export type Category = { id: string; name: string; short: string; description: string; image: string }`
  - `export type Product = { slug: string; categoryId: string; name: string; brand: string; unit: string; unitPrice: string; image: string; description: string }`
  - `export type Stat = { value: string; label: string }`
  - `export type Testimonial = { name: string; role: string; company: string; quote: string }`
  - `export type Certification = { name: string; issuer: string; description: string }`
  - `export type Faq = { question: string; answer: string }`
  - `export const siteConfig` with fields: `name`, `tagline`, `phoneDisplay` ("055 885 0667"), `phoneIntl` ("+233558850667"), `whatsappNumber` ("233558850667"), `email`, `address`, `addressShort`, `hours` (`{ summary, detail }`), `mapEmbedUrl`, `deliveryAreas`, `paymentMethods`, `responsePromise`, `guarantee`
  - `export const stats: Stat[]`
  - `export const categories: Category[]` (ids: `cement`, `iron-rods`, `tiles`, `roofing`, `plumbing`, `electricals`)
  - `export const products: Product[]` — at least 3 per category, each `short:true`
  - `export const testimonials: Testimonial[]`, `export const certifications: Certification[]`, `export const faqs: Faq[]`
  - `export const SAMPLE = "Sample"` marker constant; `export function getCategory(id: string): Category | undefined`; `export function getProduct(slug: string): Product | undefined`; `export function productsByCategory(id: string): Product[]`

- [ ] **Step 1: Write the failing test** — `src/lib/site.test.ts`

```ts
import { describe, expect, it } from "vitest";
import {
  categories,
  products,
  stats,
  testimonials,
  certifications,
  faqs,
  getCategory,
  getProduct,
  productsByCategory,
  siteConfig,
} from "./site";

describe("site data", () => {
  it("keeps one business phone across display, tel and whatsapp", () => {
    expect(siteConfig.whatsappNumber).toBe("233558850667");
    expect(siteConfig.phoneIntl).toBe(new URL(`https://wa.me/${siteConfig.whatsappNumber}`).host);
  });

  it("has unique category ids matching the six catalogue categories", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["cement", "iron-rods", "tiles", "roofing", "plumbing", "electricals"]);
  });

  it("has unique product slugs and a valid categoryId per product", () => {
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
    for (const p of products) {
      expect(getCategory(p.categoryId)).toBeDefined();
      expect(productsByCategory(p.categoryId)).toContain(p);
    }
  });

  it("has at least 3 sample products per category", () => {
    for (const c of categories) {
      expect(productsByCategory(c.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("has complete trust-layer data", () => {
    expect(stats.length).toBeGreaterThanOrEqual(4);
    expect(testimonials.length).toBeGreaterThanOrEqual(3);
    expect(certifications.length).toBeGreaterThanOrEqual(3);
    expect(faqs.length).toBe(5);
  });

  it("resolves by id/slug", () => {
    expect(getCategory("cement")?.id).toBe("cement");
    expect(getProduct(products[0].slug)?.slug).toBe(products[0].slug);
    expect(getCategory("nope")).toBeUndefined();
    expect(getProduct("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- src/lib/site.test.ts`
Expected: FAIL, module `./site` not found.

- [ ] **Step 3: Write `src/lib/site.ts`**

Catalogue sample data (prices GH₵, units realistic; every entry is launch-safe placeholder):

```ts
export const SAMPLE = "Sample";

export type Category = {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
};

export type Product = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  description: string;
};

export type Stat = { value: string; label: string };
export type Testimonial = { name: string; role: string; company: string; quote: string };
export type Certification = { name: string; issuer: string; description: string };
export type Faq = { question: string; answer: string };

export const siteConfig = {
  name: "Banning Procurement Hub",
  tagline: "Your one-stop source for quality building materials across Ghana.",
  phoneDisplay: "055 885 0667",
  phoneIntl: "+233558850667",
  whatsappNumber: "233558850667",
  email: "hello@banningprocurementhub.com",
  address: "Office location shared on request. Serving all 16 regions of Ghana.",
  addressShort: "Accra, Ghana",
  hours: {
    summary: "Mon to Sat, 8am to 6pm",
    detail: "Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment.",
  },
  mapEmbedUrl: "https://maps.google.com/maps?q=Accra%2C%20Ghana&t=&z=12&ie=UTF8&iwloc=&output=embed",
  deliveryAreas: ["Greater Accra", "Ashanti", "Central", "Western", "Eastern", "Volta", "Nationwide"],
  paymentMethods: ["Mobile Money", "Bank Transfer", "Cash on Delivery"],
  responsePromise: "Quotes within 24 hours",
  guarantee: "Every material is quality-checked before delivery. Replacements or refunds for genuine defects.",
};

export const stats: Stat[] = [
  { value: "1,200+", label: "Projects supplied" },
  { value: "6", label: "Material categories" },
  { value: "16", label: "Regions delivered" },
  { value: "Same day", label: "Faster deliveries in Accra" },
];

export const categories: Category[] = [
  {
    id: "cement",
    name: "Cement",
    short: "Every bag counted, every delivery verified.",
    description: "Quality cement brands for foundations, blocks and finishing, delivered bag-for-bag.",
    image: "https://picsum.photos/seed/bph-cement/900/700",
  },
  {
    id: "iron-rods",
    name: "Iron Rods",
    short: "Structural steel cut, counted and delivered as specified.",
    description: "Reinforcement bars in the sizes and tonnages your structural plan requires.",
    image: "https://picsum.photos/seed/bph-iron/900/700",
  },
  {
    id: "tiles",
    name: "Tiles",
    short: "Porcelain, ceramic and wall tiles for every room.",
    description: "Floor and wall tiles for homes, offices and commercial finishes.",
    image: "https://picsum.photos/seed/bph-tiles/900/700",
  },
  {
    id: "roofing",
    name: "Roofing Sheets",
    short: "Roofing sheets, nails and accessories in one order.",
    description: "Aluminium and long-span roofing sheets with the accessories to match.",
    image: "https://picsum.photos/seed/bph-roofing/900/700",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    short: "PVC pipes, fittings and full bathroom rough-ins.",
    description: "Pipes, fittings, valves and accessories for complete plumbing installations.",
    image: "https://picsum.photos/seed/bph-plumbing/900/700",
  },
  {
    id: "electricals",
    name: "Electricals",
    short: "Cables, conduits, fittings and smart switches.",
    description: "Cable, conduit, sockets, switches and wiring accessories for safe installations.",
    image: "https://picsum.photos/seed/bph-electricals/900/700",
  },
];

export const products: Product[] = [
  { slug: "ghacem-supacem-42-5", categoryId: "cement", name: "Ghacem Super Cement 42.5R", brand: "GHACEM", unit: "bag (50kg)", unitPrice: "GH₵ 120", image: "https://picsum.photos/seed/bph-p-cement1/900/700", description: "General-purpose portland cement for blocks, foundations and slabs." },
  { slug: "dangote-cement-42-5", categoryId: "cement", name: "Dangote Cement 42.5", brand: "Dangote", unit: "bag (50kg)", unitPrice: "GH₵ 118", image: "https://picsum.photos/seed/bph-p-cement2/900/700", description: "Consistent-setting portland cement, ideal for site work at scale." },
  { slug: "cestos-cement-32-5", categoryId: "cement", name: "CESTOS Cement 32.5", brand: "CESTOS", unit: "bag (50kg)", unitPrice: "GH₵ 110", image: "https://picsum.photos/seed/bph-p-cement3/900/700", description: "Value portland cement for render, screed and non-structural work." },
  { slug: "deformed-bar-12mm", categoryId: "iron-rods", name: "Deformed Bar 12mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 95", image: "https://picsum.photos/seed/bph-p-iron1/900/700", description: "High-yield deformed bar for beams, columns and slabs." },
  { slug: "deformed-bar-16mm", categoryId: "iron-rods", name: "Deformed Bar 16mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 168", image: "https://picsum.photos/seed/bph-p-iron2/900/700", description: "Heavy structural reinforcement for columns and transfer beams." },
  { slug: "binding-wire-roll", categoryId: "iron-rods", name: "Binding Wire", brand: "Standard", unit: "roll (3kg)", unitPrice: "GH₵ 55", image: "https://picsum.photos/seed/bph-p-iron3/900/700", description: "Soft iron binding wire for tying reinforcement cages." },
  { slug: "porcelain-floor-60x60", categoryId: "tiles", name: "Porcelain Floor 60x60", brand: "Twyford", unit: "box (4 pcs)", unitPrice: "GH₵ 210", image: "https://picsum.photos/seed/bph-p-tile1/900/700", description: "Matte porcelain floor tile, low water absorption, heavy traffic." },
  { slug: "ceramic-wall-30x60", categoryId: "tiles", name: "Ceramic Wall 30x60", brand: "Twyford", unit: "box (6 pcs)", unitPrice: "GH₵ 160", image: "https://picsum.photos/seed/bph-p-tile2/900/700", description: "Glazed ceramic wall tile for bathrooms and kitchens." },
  { slug: "porcelain-floor-80x80", categoryId: "tiles", name: "Porcelain Floor 80x80", brand: "Mosaic", unit: "box (3 pcs)", unitPrice: "GH₵ 290", image: "https://picsum.photos/seed/bph-p-tile3/900/700", description: "Large-format polished porcelain for living spaces." },
  { slug: "long-span-roofing-sheet", categoryId: "roofing", name: "Long-Span Roofing Sheet", brand: "Aluworks", unit: "sheet (6m)", unitPrice: "GH₵ 165", image: "https://picsum.photos/seed/bph-p-roof1/900/700", description: "Zincalume long-span sheet with a 10-year warranty." },
  { slug: "roofing-roofmate-r", categoryId: "roofing", name: "Roofing Sheet Roofmate R", brand: "Roofmate", unit: "sheet (6m)", unitPrice: "GH₵ 175", image: "https://picsum.photos/seed/bph-p-roof2/900/700", description: "Popular corrugated profile for residential roofing." },
  { slug: "roofing-nails-2kg", categoryId: "roofing", name: "Roofing Nails", brand: "Standard", unit: "pack (2kg)", unitPrice: "GH₵ 40", image: "https://picsum.photos/seed/bph-p-roof3/900/700", description: "Galvanised roofing nails with washers, roof-ready." },
  { slug: "pvc-pipe-6-inch", categoryId: "plumbing", name: "PVC Pipe 6 inch", brand: "Polytank/Javelin", unit: "piece (6m)", unitPrice: "GH₵ 145", image: "https://picsum.photos/seed/bph-p-plumb1/900/700", description: "High-pressure PVC drainage pipe with sockets." },
  { slug: "pvc-pipe-1-5-inch", categoryId: "plumbing", name: "PVC Pipe 1.5 inch", brand: "Javelin", unit: "piece (6m)", unitPrice: "GH₵ 32", image: "https://picsum.photos/seed/bph-p-plumb2/900/700", description: "Cold-water supply pipe, pressure rated." },
  { slug: "bathroom-faucet-set", categoryId: "plumbing", name: "Bathroom Faucet Set", brand: "Local/PBG", unit: "set", unitPrice: "GH₵ 220", image: "https://picsum.photos/seed/bph-p-plumb3/900/700", description: "Complete basin, shower and sink mixer set." },
  { slug: "electric-cable-2-5mm", categoryId: "electricals", name: "Electric Cable 2.5mm", brand: "CCA/Oman", unit: "roll (90m)", unitPrice: "GH₵ 260", image: "https://picsum.photos/seed/bph-p-elec1/900/700", description: "Solid copper PVC cable for power circuits and sockets." },
  { slug: "surface-mount-socket", categoryId: "electricals", name: "Surface Mount Socket", brand: "Panasonic", unit: "piece", unitPrice: "GH₵ 45", image: "https://picsum.photos/seed/bph-p-elec2/900/700", description: "Double-pole power socket with plain cover." },
  { slug: "led-bulb-15w", categoryId: "electricals", name: "LED Bulb 15W", brand: "Philips", unit: "piece", unitPrice: "GH₵ 28", image: "https://picsum.photos/seed/bph-p-elec3/900/700", description: "Warm-white LED, long life, low energy." },
];

export const testimonials: Testimonial[] = [
  { name: "Kwame A.", role: "Self-build contractor", company: "East Legon project", quote: "Rods came already cut to size and every bag of cement was counted on site. No arguments, no shortchanging." },
  { name: "Ama S.", role: "Site supervisor", company: "Madina, Accra", quote: "Ordered tiles and plumbing for a full block. Delivered in two days and the invoice matched the quote to the cedis." },
  { name: "Daniel O.", role: "Renovation client", company: "Tema", quote: "What capped it for me was the WhatsApp quote and delivery to my gate. Exactly what we agreed." },
];

export const certifications: Certification[] = [
  { name: "Registered business", issuer: "Government of Ghana", description: "Registered procurement and supply company operating under Ghanaian law." },
  { name: "Verified supplier network", issuer: "Ghana", description: "Materials sourced from authorised dealers and verified distributors only." },
  { name: "Fully insured deliveries", issuer: "Banning Procurement Hub", description: "Goods are insured in transit until signed for at your site." },
];

export const faqs: Faq[] = [
  { question: "How do I get a quote?", answer: "Add the materials you need to your quote, tell us your delivery area, and send it on WhatsApp. We confirm pricing and delivery within 24 hours." },
  { question: "What are your delivery areas?", answer: "We deliver across all 16 regions of Ghana, with same-day options in Greater Accra." },
  { question: "How do I pay?", answer: "Mobile money, bank transfer or cash on delivery. Payment terms are confirmed on your final invoice." },
  { question: "Can I order partial quantities?", answer: "Yes. Add any quantity you need; bags, pieces and rolls are sold individually." },
  { question: "What if the material is defective?", answer: "Every delivery is quality-checked first. Genuine defects are replaced or refunded per our guarantee." },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(id: string): Product[] {
  return products.filter((p) => p.categoryId === id);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test -- src/lib/site.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5** — Typecheck

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/site.ts src/lib/site.test.ts
git commit -m "feat: add single-source catalogue and business data layer"
```

---

### Task 2: Quote state, WhatsApp builder and validation (pure logic)

**Files:**
- Create: `src/lib/quote-reducer.ts`
- Create: `src/lib/quote-reducer.test.ts`
- Create: `src/lib/whatsapp.ts`
- Create: `src/lib/whatsapp.test.ts`
- Create: `src/lib/validation.ts`
- Create: `src/lib/validation.test.ts`
- Create: `src/lib/quote-context.tsx` (client provider; renders children; no tests needed beyond reducer)

**Interfaces:**
- Produces:
  - `export type QuoteItem = { productId: string; qty: number }`
  - `export type QuoteState = { items: QuoteItem[] }`
  - `export type QuoteAction = { type: "add"; productId: string } | { type: "remove"; productId: string } | { type: "setQty"; productId: string; qty: number } | { type: "clear" }`
  - `export const initialQuoteState: QuoteState`
  - `export function quoteReducer(state: QuoteState, action: QuoteAction): QuoteState`
  - `export function quoteCount(state: QuoteState): number`
  - `export type QuoteContact = { name: string; phone: string; area: string; note?: string }`
  - `export type QuoteFieldErrors = { name?: string; phone?: string; area?: string }`
  - `export function validateQuoteContact(contact: QuoteContact): QuoteFieldErrors`
  - `export type QuoteLine = { name: string; unit: string; unitPrice: string; qty: number }`
  - `export function buildQuoteMessage(contact: QuoteContact, lines: QuoteLine[]): string`
  - `export function buildWhatsAppUrl(number: string, message: string): string`
  - From `quote-context.tsx`: `export function QuoteProvider({ children }: { children: React.ReactNode })`, `export function useQuote(): { items, count, add, remove, setQty, clear, lines }`

- [ ] **Step 1: Write the failing tests**

`src/lib/quote-reducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initialQuoteState, quoteCount, quoteReducer } from "./quote-reducer";

describe("quoteReducer", () => {
  it("adds an item with qty 1", () => {
    const s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    expect(s.items).toEqual([{ productId: "a", qty: 1 }]);
  });
  it("increments on duplicate add", () => {
    const s = quoteReducer(quoteReducer(initialQuoteState, { type: "add", productId: "a" }), { type: "add", productId: "a" });
    expect(s.items).toEqual([{ productId: "a", qty: 2 }]);
  });
  it("removes an item entirely and clears", () => {
    let s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "remove", productId: "a" });
    expect(s.items).toEqual([]);
    s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "clear" });
    expect(s.items).toEqual([]);
  });
  it("sets an exact qty, flooring negatives to 0 and dropping empty items", () => {
    let s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: 5 });
    expect(s.items[0].qty).toBe(5);
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: -3 });
    expect(s.items).toEqual([]);
  });
  it("quoteCount sums quantities", () => {
    const s = quoteReducer(quoteReducer(initialQuoteState, { type: "add", productId: "a" }), { type: "add", productId: "b" });
    const withQty = quoteReducer(s, { type: "setQty", productId: "b", qty: 4 });
    expect(quoteCount(withQty)).toBe(5);
  });
});
```

`src/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildQuoteMessage, buildWhatsAppUrl } from "./whatsapp";

describe("whatsapp", () => {
  const contact = { name: "Nana", phone: "0551234567", area: "East Legon" };
  const lines = [
    { name: "Ghacem Super Cement 42.5R", unit: "bag (50kg)", unitPrice: "GH₵ 120", qty: 10 },
    { name: "Deformed Bar 12mm", unit: "piece (12m)", unitPrice: "GH₵ 95", qty: 20 },
  ];

  it("builds a readable structured message", () => {
    const msg = buildQuoteMessage(contact, lines);
    expect(msg).toContain("Name: Nana");
    expect(msg).toContain("Phone: 0551234567");
    expect(msg).toContain("Delivery area: East Legon");
    expect(msg).toContain("1. Ghacem Super Cement 42.5R - 10 x bag (50kg) @ GH₵ 120");
    expect(msg).toContain("2. Deformed Bar 12mm - 20 x piece (12m) @ GH₵ 95");
  });

  it("accepts without plain-text breaks or newlines in the URL", () => {
    const url = buildWhatsAppUrl("233558850667", buildQuoteMessage(contact, lines));
    expect(url.startsWith("https://wa.me/233558850667?text=")).toBe(true);
    expect(url.includes("\n")).toBe(false);
    expect(url.includes(" ")).toBe(false);
  });

  it("omits note when absent", () => {
    const msg = buildQuoteMessage({ ...contact, note: "" }, lines);
    expect(msg.includes("Note")).toBe(false);
  });
});
```

`src/lib/validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateQuoteContact } from "./validation";

describe("validateQuoteContact", () => {
  it("accepts a valid contact", () => {
    expect(validateQuoteContact({ name: "Nana", phone: "0551234567", area: "East Legon" })).toEqual({});
  });
  it("flags missing name and area", () => {
    const errors = validateQuoteContact({ name: "", phone: "0551234567", area: "" });
    expect(errors.name).toBeDefined();
    expect(errors.area).toBeDefined();
  });
  it("rejects invalid Ghana phone numbers and accepts +233 / 233 / 0 forms", () => {
    expect(validateQuoteContact({ name: "a", phone: "12345", area: "x" }).phone).toBeDefined();
    expect(validateQuoteContact({ name: "a", phone: "+233551234567", area: "x" }).phone).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "233551234567", area: "x" }).phone).toBeUndefined();
    expect(validateQuoteContact({ name: "a", phone: "055551234567890", area: "x" }).phone).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test -- src/lib/quote-reducer.test.ts src/lib/whatsapp.test.ts src/lib/validation.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the implementations**

`src/lib/quote-reducer.ts`:

```ts
export type QuoteItem = { productId: string; qty: number };
export type QuoteState = { items: QuoteItem[] };
export type QuoteAction =
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "setQty"; productId: string; qty: number }
  | { type: "clear" };

export const initialQuoteState: QuoteState = { items: [] };

export function quoteReducer(state: QuoteState, action: QuoteAction): QuoteState {
  switch (action.type) {
    case "add": {
      const existing = state.items.find((i) => i.productId === action.productId);
      if (existing) {
        return { items: state.items.map((i) => (i.productId === action.productId ? { ...i, qty: i.qty + 1 } : i)) };
      }
      return { items: [...state.items, { productId: action.productId, qty: 1 }] };
    }
    case "remove":
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case "setQty": {
      if (action.qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        items: state.items.map((i) => (i.productId === action.productId ? { ...i, qty: action.qty } : i)),
      };
    }
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

export function quoteCount(state: QuoteState): number {
  return state.items.reduce((sum, item) => sum + item.qty, 0);
}
```

`src/lib/whatsapp.ts`:

```ts
export type QuoteContact = { name: string; phone: string; area: string; note?: string };
export type QuoteLine = { name: string; unit: string; unitPrice: string; qty: number };

export function buildQuoteMessage(contact: QuoteContact, lines: QuoteLine[]): string {
  const parts: string[] = [];
  parts.push("Hello Banning Procurement Hub, I would like a quote.");
  parts.push(`Name: ${contact.name}`);
  parts.push(`Phone: ${contact.phone}`);
  parts.push(`Delivery area: ${contact.area}`);
  lines.forEach((line, index) => {
    parts.push(`${index + 1}. ${line.name} - ${line.qty} x ${line.unit} @ ${line.unitPrice}`);
  });
  if (contact.note && contact.note.trim()) {
    parts.push(`Note: ${contact.note.trim()}`);
  }
  return parts.join("\n");
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
```

`src/lib/validation.ts`:

```ts
export type QuoteContact = { name: string; phone: string; area: string; note?: string };
export type QuoteFieldErrors = { name?: string; phone?: string; area?: string };

const GHANA_MOBILE = /^(?:\+?233|0)?\s?[245][0-9]{2}\s?[0-9]{3}\s?[0-9]{3}$/;

export function validateQuoteContact(contact: QuoteContact): QuoteFieldErrors {
  const errors: QuoteFieldErrors = {};
  if (!contact.name.trim()) errors.name = "Please enter your name.";
  if (contact.name.trim().length > 80) errors.name = "Name is too long.";
  if (!contact.area.trim()) errors.area = "Please enter your delivery area.";
  if (!GHANA_MOBILE.test(contact.phone.trim())) {
    errors.phone = "Enter a valid Ghana mobile number, e.g. 055 885 0667.";
  }
  return errors;
}
```

`src/lib/quote-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode } from "react";
import { initialQuoteState, QuoteItem, quoteCount, quoteReducer } from "./quote-reducer";
import { getProduct } from "./site";
import { QuoteLine } from "./whatsapp";

type QuoteContextValue = {
  items: QuoteItem[];
  count: number;
  lines: QuoteLine[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);
const STORAGE_KEY = "bph-quote";

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quoteReducer, initialQuoteState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: QuoteItem[] };
        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((item) => {
            if (item.qty > 0) dispatch({ type: "add", productId: item.productId });
            if (item.qty > 1) dispatch({ type: "setQty", productId: item.productId, qty: item.qty });
          });
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<QuoteContextValue>(() => {
    const lines: QuoteLine[] = state.items
      .flatMap((item) => {
        const product = getProduct(item.productId);
        return product ? [{ name: product.name, unit: product.unit, unitPrice: product.unitPrice, qty: item.qty }] : [];
      });
    return {
      items: state.items,
      count: quoteCount(state),
      lines,
      add: (productId) => dispatch({ type: "add", productId }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      setQty: (productId, qty) => dispatch({ type: "setQty", productId, qty }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state]);

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test -- src/lib/quote-reducer.test.ts src/lib/whatsapp.test.ts src/lib/validation.test.ts`
Expected: PASS.

- [ ] **Step 5** — Typecheck

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: quote reducer, whatsapp builder and contact validation"
```

---

### Task 3: Formatting helper + theme + reveal utilities

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/format.test.ts`
- Create: `src/components/reveal.tsx`
- Create: `src/components/theme-toggle.tsx`
- Create: `src/hooks/use-theme.ts`

**Interfaces:**
- Produces:
  - `export function formatItemCount(count: number): string` (returns `"1 item"` or `"3 items"`)
  - `export function monetaryTotal(lines: QuoteLine[]): string` (sums numeral portion of `unitPrice` × `qty`, formats `GH₵ 1,250`)
  - `export function Reveal({ as?, className?, delay?, children }): JSX` (Motion wrapper honoring reduced motion)
  - `export function ThemeToggle(): JSX` (button cycling light/dark, persists)
  - `export function useTheme(): { theme: "light" | "dark"; toggle: () => void }`

- [ ] **Step 1: Failing test** — `src/lib/format.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { formatItemCount, monetaryTotal } from "./format";
import { QuoteLine } from "./whatsapp";

describe("format", () => {
  it("pluralises item counts", () => {
    expect(formatItemCount(1)).toBe("1 item");
    expect(formatItemCount(4)).toBe("4 items");
  });

  it("sums monetary lines by parsing the price numeral", () => {
    const lines: QuoteLine[] = [
      { name: "a", unit: "pcs", unitPrice: "GH₵ 120", qty: 2 },
      { name: "b", unit: "pcs", unitPrice: "GH₵ 95.5", qty: 1 },
    ];
    expect(monetaryTotal(lines)).toBe("GH₵ 335.5");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- src/lib/format.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/lib/format.ts`:

```ts
import { QuoteLine } from "./whatsapp";

export function formatItemCount(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

export function monetaryTotal(lines: QuoteLine[]): string {
  const total = lines.reduce((sum, line) => {
    const numeral = parseFloat(line.unitPrice.replace(/[^0-9.]/g, ""));
    return sum + (Number.isFinite(numeral) ? numeral : 0) * line.qty;
  }, 0);
  const formatted = Number.isInteger(total)
    ? total.toLocaleString("en-GH")
    : total.toLocaleString("en-GH", { maximumFractionDigits: 2 });
  return `GH₵ ${formatted}`;
}
```

`src/hooks/use-theme.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "bph-theme";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return systemPrefersDark() ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return { theme, toggle };
}
```

`src/components/theme-toggle.tsx`:

```tsx
"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-muted transition-transform hover:text-ink active:scale-[0.97]"
    >
      {theme === "light" ? <Moon weight="duotone" size={20} /> : <Sun weight="duotone" size={20} />}
    </button>
  );
}
```

`src/components/reveal.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test -- src/lib/format.test.ts`
Expected: PASS. Then `npm run typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/components/reveal.tsx src/components/theme-toggle.tsx src/hooks/use-theme.ts
git commit -m "feat: formatting helpers, theme toggle and motion reveal wrapper"
```

---

### Task 4: Root layout, global chrome (header, footer, floats)

**Files:**
- Create: `src/app/layout.tsx` (final)
- Create: `src/components/header.tsx`
- Create: `src/components/footer.tsx`
- Create: `src/components/mobile-menu.tsx`
- Create: `src/components/whatsapp-float.tsx`
- Create: `src/components/scroll-top.tsx`
- Create: `src/components/brand-logo.tsx`
- Create: `src/components/quotation-mark.tsx` (inline SVG quote glyph for the brand mark; single simple geometric mark, allowed)

**Interfaces:**
- Consumes: `siteConfig`, `categories`, `useQuote`, `ThemeToggle`, `useTheme`.
- Produces: global shell where every page gets header/footer/floats and the quote badge reflects live state.

Design constraints for this task: nav renders on one line at `lg`, header `h-16` (64px), sticky. logo clickable → `/`. Quote badge links to `/quote` showing `count` with `formatItemCount`. Mobile menu = slide-down panel with links + contact CTAs. WhatsApp float = fixed bottom-right green circle with WhatsApp brand glyph (inline SVG), label expands on hover, `target="_blank"`. Scroll-top appears after 400px (use `useScroll` from motion, not scroll listener).

- [ ] **Step 1: `src/components/brand-logo.tsx`**

```tsx
import { QuotationMark } from "./quotation-mark";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-2.5" aria-label="Banning Procurement Hub home">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-accent">
        <QuotationMark className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Banning<span className="text-primary-500"> Procurement</span> Hub
      </span>
    </a>
  );
}
```

`src/components/quotation-mark.tsx`:

```tsx
export function QuotationMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 5C6.7 6.4 4.5 9 4.5 12.4c0 2.7 1.6 4.6 3.7 4.6 1.9 0 3.2-1.4 3.2-3.3 0-1.8-1.2-3-3-3-.2 0-.4 0-.6.1.3-1.7 2-3.5 3.7-4.3L10 5Zm8 0c-3.3 1.4-5.5 4-5.5 7.4 0 2.7 1.6 4.6 3.7 4.6 1.9 0 3.2-1.4 3.2-3.3 0-1.8-1.2-3-3-3-.2 0-.4 0-.6.1.3-1.7 2-3.5 3.7-4.3L18 5Z" />
    </svg>
  );
}
```

- [ ] **Step 2: `src/components/header.tsx` (client)**

Sticky header with `blur`, one-line nav at `lg` (Home, Materials, About, Contact, Quote badge), mobile hamburger opening `MobileMenu`. Includes ThemeToggle. Top utility strip (phone + hours) hidden below `md`.

- [ ] **Step 3: `src/components/mobile-menu.tsx`**

Controls own `open` state; panel lists nav links, phone, "Get a Quote". Closes on link click.

- [ ] **Step 4: `src/components/footer.tsx`**

Three-column grid: brand + tagline + socials (placeholders), Quick Links (Home, Materials per category overview, About, Contact), Contact (clickable phone, email, hours, addressShort). Bottom row: `© {new Date().getFullYear()} Banning Procurement Hub` + Privacy + Terms links + responsePromise.

- [ ] **Step 5: `src/components/whatsapp-float.tsx`**

`"use client"`. Uses `siteConfig.whatsappNumber`. Fixed bottom-right, `aria-label="Chat on WhatsApp"`, `target="_blank"` `rel="noopener noreferrer"`. Green `#25D366`. Expands label "Chat with us" on hover (desktop). Shows intermittently? Keep always visible.

- [ ] **Step 6: `src/components/scroll-top.tsx`**

`"use client"`. Uses `useScroll` from `motion/react` + `useMotionValueEvent` to show a button after `scrollY > 400`. Smooth scrolls to top.

- [ ] **Step 7: Final `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { ScrollTop } from "@/components/scroll-top";
import { QuoteProvider } from "@/lib/quote-context";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Banning Procurement Hub", template: "%s | Banning Procurement Hub" },
  description: "Ghana's #1 Procurement Hub for Construction. Bulk cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
  metadataBase: new URL("https://banningprocurementhub.com"),
};

export const viewport: Viewport = { themeColor: "#0d3d1a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="font-body antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <QuoteProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <WhatsAppFloat />
          <ScrollTop />
        </QuoteProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npm run build`
Expected: build succeeds. Remove the minimal placeholder from `src/app/page.tsx`? Keep it for now; Task 5 replaces it.
Then `npm run dev` and eyeball header/footer/floats in light and dark mode (toggle works, quote badge hides when empty).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: global shell with header, footer, whatsapp float and scroll-top"
```

---

### Task 5: Home page

**Files:**
- Create: `src/app/page.tsx` (full)
- Create: `src/components/sections/home-hero.tsx`
- Create: `src/components/sections/stats-band.tsx`
- Create: `src/components/sections/category-grid.tsx`
- Create: `src/components/sections/how-it-works.tsx`
- Create: `src/components/sections/testimonials.tsx`
- Create: `src/components/sections/certifications.tsx`
- Create: `src/components/sections/faq.tsx`
- Create: `src/components/sections/cta-band.tsx`
- Create: `src/components/sections/trust-strip.tsx`
- Create: `src/components/section-heading.tsx`
- Create: `src/components/category-card.tsx`

**Interfaces:**
- Consumes: `stats`, `categories`, `testimonials`, `certifications`, `faqs`, `siteConfig`, `Reveal`, `CategoryCard`.
- Produces: the landing page and the shared `SectionHeading` + `CategoryCard` used by `/products`.

Layout order (no eyebrow on every section; max 3 total and spaced ≥ 2 sections apart):
1. **Hero** (project layout: split — left copy / right photo, asymmetric 55/45). Eyebrow allowed here. Headline ≤ 2 lines: "Materials for your next build, delivered on time." Subtext ≤ 20 words. CTAs: "Get a Quote" (accent) + "Browse Materials" (outline). Right side = real photo (picsum seeded hero) rounded-2xl with green-tinted shadow; small floating stat chip (mono "Same-day" delivery card). `min-h-[100dvh]` NOT `h-screen`, `pt-20` cap, no trust strip inside.
2. **Stats band** — deep green (`bg-primary`) band, 4 stats in mono gold numbers, `divide-x` at md+. aria-label="Company stats".
3. **Category grid** — `SectionHeading` ("Shop by material" — no eyebrow), 6 cards asymmetric grid (`lg:grid-cols-3`, two tall feature cells). Each card: image, name, short, arrow link to `/products/{id}`, hover lift. Empty-proof (sample data is present).
4. **How It Works** — 4 steps (Discover, Quote, Confirm, Deliver), `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, numbered mono digits, no cards (borders + divided). CTA under: "Get a Quote".
5. **Trust strip** — paymentMethods + deliveryAreas as two compact rows, hairline borders, no cards, below hero-like band not duplicated in hero.
6. **Testimonials** — 3 cards, quote glyph accent, name + role + company (per design-taste attribution rule).
7. **Certifications** — list rows with check icon, issuer, description; hairline dividers.
8. **FAQ** — accordion, 5 items, `<details>`-free custom client accordion (buttons + `aria-expanded`), "Last updated" date.
9. **CTA band** — deep green, headline "Getting a quote takes two minutes", responsePromise, "Get a Quote" accent CTA + phone link.

- [ ] **Step 1: `src/components/section-heading.tsx`** (server component)

```tsx
type Props = { title: string; kicker?: string; description?: string; align?: "left" | "center" };
export function SectionHeading({ title, kicker, description, align = "left" }: Props) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {kicker ? <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary-500">{kicker}</p> : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-relaxed text-ink-muted">{description}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/category-card.tsx`** (server): link card with `next/image` (fill), name overlay/below, arrow. `aria-label="{name} materials"`.

- [ ] **Step 3: `home-hero.tsx`** (client, uses Reveal): split layout, `lg:grid-cols-[1.05fr_1fr]`, hero image with `priority`, floating chip, CTAs via `Link`. Copy exactly: title, subtext (≤ 20 words), no tagline beneath CTAs.

- [ ] **Step 4: remaining section components** — each maps its data through `Reveal`; FAQ accordion is a client component with its own local state and `prefers-reduced-motion` safe transitions.

- [ ] **Step 5: Wire `src/app/page.tsx`** in order, wrapping sections in `<section className="py-20 md:py-24">` with a shared `max-w-[1400px] mx-auto px-4 md:px-6` container. Compose Order: Hero → StatsBand → CategoryGrid → HowItWorks → TrustStrip → Testimonials → Certifications → FAQ → CtaBand.

- [ ] **Step 6: Verify**

Run: `npm run build`; `npm run dev`; check hero fits viewport, one-line CTAs, contrast on all buttons (gold on green text: `#111A14` on `#F0B429`), no em-dashes in any copy, mobile `< 768px` single column with no horizontal scroll.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: home page with hero, stats, categories, how-it-works, trust, testimonials, certifications, faq and cta"
```

---

### Task 6: Products overview page

**Files:**
- Create: `src/app/products/page.tsx`
- Create: `src/components/product-search.tsx` (client)
- Modify: `src/app/layout.tsx` metadata template already covers titles.

**Interfaces:**
- Consumes: `categories`, `products`, `CategoryCard`, `SectionHeading`.
- Produces: `/products` listing all six categories with a live filter/search, and client-side navigation to category pages.

- [ ] **Step 1: Page structure**

`/products`: `SectionHeading` ("Browse materials", description covering the six categories, eyebrow allowed as this is the catalogue hub), `ProductSearch`, then a 2-col featured layout of `CategoryCard`s (two large + four standard via `lg:grid-cols-2` for the pair then `lg:grid-cols-3` for the rest). Under each category card a preview line of top products: `productsByCategory(id).slice(0, 3)` names in mono small text.

- [ ] **Step 2: `product-search.tsx`**

Client component: text input filtering products by name/brand/category; results replace the grid when a query is present; empty state "No materials match your search." (composed, not bare text). Label above input (no placeholder-as-label).

- [ ] **Step 3: Verify**

`npm run build`, dev-check desktop/mobile, search works, contrast on input/focus ring.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: /products overview with live search and category previews"
```

---

### Task 7: Category pages + product cards (add-to-quote)

**Files:**
- Create: `src/app/products/[category]/page.tsx`
- Create: `src/components/product-card.tsx` (client: needs `useQuote`)
- Create: `src/components/breadcrumbs.tsx`

**Interfaces:**
- Consumes: `getCategory`, `productsByCategory`, `useQuote`, `siteConfig`, `Reveal`.
- Produces: six static URLs `/products/{category}/` via `generateStaticParams`, each rendering its product grid; `ProductCard` adds items to the quote with tactile feedback.

- [ ] **Step 1: `generateStaticParams`**

```tsx
import { categories } from "@/lib/site";
export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = getCategory(category);
  return {
    title: cat ? `${cat.name} Materials` : "Materials",
    description: cat ? `Buy ${cat.name.toLowerCase()} in Ghana. ${cat.description}` : undefined,
  };
}
```

- [ ] **Step 2: `breadcrumbs.tsx`** — `Home / Materials / {Category}` with `aria-label="Breadcrumbs"`, separated by `/`, current page `aria-current="page"`.

- [ ] **Step 3: `product-card.tsx`**

`"use client"`. Card: image, brand mono tag, name, `description`, price + unit line (`font-mono`), and an "Add to Quote" button (outline green). After add: button briefly shows a check + "Added". Include a `qty` stepper only inside `/quote` (not here). Breadcrumb + heading row at top, then `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` product grid.

- [ ] **Step 4: Verify**

`npm run build` (6 new routes emitted), dev-check adding items increments the header badge, empty/broken images fallback (alt text present).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: category pages with product cards and add-to-quote"
```

---

### Task 8: Quote page (quote builder + WhatsApp handoff)

**Files:**
- Create: `src/app/quote/page.tsx`
- Create: `src/components/quote-builder.tsx` (client)

**Interfaces:**
- Consumes: `useQuote`, `buildQuoteMessage`, `buildWhatsAppUrl`, `validateQuoteContact`, `monetaryTotal`, `formatItemCount`, `getProduct`, `siteConfig`.
- Produces: `/quote` — the conversion core. Empty state, line items with steppers, totals, contact form, WhatsApp handoff, post-send confirmation state.

- [ ] **Step 1: Behavior spec for `quote-builder.tsx`**

State: `contact` (name, phone, area, note), `errors` (from `validateQuoteContact`), `sent` boolean.

- If `count === 0`: composed empty state — illustration-free, centered: "Your quote is empty", "Browse the catalogue and add materials, or message us directly", CTA "Browse Materials" + WhatsApp float is global anyway.
- Else: two-column `lg:grid-cols-[1.2fr_1fr]`:
  - **Left:** each `line` row: name (from `getProduct`), unit, `monetary` per-line, qty stepper (`Minus`/number/`Plus`), "Remove" (Trash icon). Footer row: `monetaryTotal`.
  - **Right:** "Your details" form. Fields: Full name, Phone (Ghana mobile), Delivery area, Note (optional textarea). Labels above inputs, helper text for phone ("Use 0XX or +233"). Errors below fields. Submit button "Send Quote on WhatsApp" (accent).
- Submit: validate; if errors, focus first errored field and show inline errors. If valid: `window.location.href = buildWhatsAppUrl(siteConfig.whatsappNumber, buildQuoteMessage(contact, lines))`, set `sent = true`.
- `sent` confirmation: success panel — "Quote ready to send", copy-paste of the message in a `pre` with a "Copy message" button (uses `navigator.clipboard`, shows "Copied" state), "Re-open WhatsApp" link, and "Start a new quote" (calls `clear`).

- [ ] **Step 2: Implement the page wrapper**

Header block (`SectionHeading` "Request a Quote" + `responsePromise` chip), then `<QuoteBuilder/>`. Add `robots: "index"` via metadata.

- [ ] **Step 3: Tests for stepper edge cases covered already by reducer tests (Task 2); run full suite**

Run: `npm run test` then `npm run typecheck` then `npm run build`.

- [ ] **Step 4: Manual verification**

dev-check: empty state; add items → badge; steppers; validation errors appear and clear; valid submit opens WhatsApp with correctly built message (check encoded text in URL); copy button works; light + dark mode.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: /quote with itemized builder, validation and whatsapp handoff"
```

---

### Task 9: About page

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/components/sections/about-story.tsx`

**Interfaces:**
- Consumes: `siteConfig`, `certifications`, `stats`, `Reveal`.

- [ ] **Step 1: Page build**

Sections: PageHeader (title "About Banning Procurement Hub"), Story (two-column: narrative prose ≤ 65ch + supporting photo, zigzag at most once — this is the only split on the page), Mission + guarantee (two quote-style cards on deep green), Stats band reuse, Certifications reuse list, Team CTA ("Talk to us directly" → phone + WhatsApp).

Copy guidance (no AI-slop): write a plain, factual story of a Ghanaian construction procurement business: sourcing verified materials, counting deliveries, serving contractors. ~120 words. No fake founding year or fake names. Mark nothing as invented stats beyond the spec's 1,200+ (already SAMPLE-tagged).

- [ ] **Step 2: Verify** — build + dev-check + copy audit (grammar, no em-dashes, no fake precision).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: about page with story, mission, certifications and trust"
```

---

### Task 10: Contact page

**Files:**
- Create: `src/app/contact/page.tsx`
- Create: `src/components/contact-card.tsx`

**Interfaces:**
- Consumes: `siteConfig`, `buildWhatsAppUrl`, `buildQuoteMessage` (direct message variant), `useQuote` (empty lines → generic message).

- [ ] **Step 1: Page build**

PageHeader. Two-column: left = contact cards (tap-to-call, WhatsApp "Chat now", email mailto, hours summary+detail, address, deliveryAreas; each card one purpose), right = Google Maps embed (`iframe`, `title`, `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"`, rounded-2xl border). Under: a compact WhatsApp message form (name + phone + area + message → pre-filled wa.me). Include LocalBusiness JSON-LD (see Task 12 for the shared component; render it here too).

- [ ] **Step 2: Verify** — build, click phone/email/WhatsApp, iframe loads, no broken methods.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: contact page with map, contact cards and whatsapp message"
```

---

### Task 11: Legal pages + 404

**Files:**
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/not-found.tsx`

**Interfaces:**
- Produces: compliant legal pages (launch gate), custom 404 matching brand.

- [ ] **Step 1: Privacy policy**

Plain-language, honest, since the site uses no cookies, no tracking, no analytics yet, and no personal data storage (quotes go to WhatsApp). Cover: what we collect (only what you type in a quote/message), how it's used (respond to quote, delivery), no sale of data, WhatsApp/third-party note, contact email. Include "Last updated" date = today.

- [ ] **Step 2: Terms**

Cover: service description (materials procurement and delivery), sample pricing note ("prices shown are indicative samples until confirmed in writing"), quotes valid for 48 hours unless stated, payments (MoMo/bank/Cash on Delivery), delivery terms, guarantee/replacement, liability limits, governing law (Republic of Ghana). Last updated date.

- [ ] **Step 3: Custom 404**

Branded: big mono "404", heading "This page hit a foundation issue", body "The page you are looking for does not exist or has moved.", CTA "Back to Home" and "Browse Materials". No dead links, no broken image.

- [ ] **Step 4: Verify** — build, every legal link resolves, 404 reachable, no placeholder text.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: privacy, terms and custom 404"
```

---

### Task 12: SEO, favicon, manifest and JSON-LD

**Files:**
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/manifest.ts`
- Create: `src/app/icon.svg`
- Create: `src/components/organization-schema.tsx`
- Create: `public/llms.txt`
- Modify: page-level `generateMetadata` already set per task; ensure `metadataBase`, OG. Add OG image generation (static `public/og.png` placeholder replaced later) — add `openGraph` defaults in `layout.tsx`.

**Interfaces:**
- Produces: `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `icon.svg` favicon, JSON-LD Organization + LocalBusiness schema on home and contact.

- [ ] **Step 1: `src/app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { categories } from "@/lib/site";

const BASE = "https://banningprocurementhub.com";
const staticRoutes = ["", "/products", "/quote", "/about", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = staticRoutes.map((r) => ({ url: `${BASE}${r === "" ? "/" : `${r}/`}`, lastModified: new Date() }));
  const cats = categories.map((c) => ({ url: `${BASE}/products/${c.id}/`, lastModified: new Date() }));
  return [...pages, ...cats];
}
```

- [ ] **Step 2: `src/app/robots.ts`**

Allow all, reference sitemap: `{ rules: { userAgent: "*", allow: "/" }, sitemap: \`${BASE}/sitemap.xml\` }`.

- [ ] **Step 3: `src/app/manifest.ts`** — name, short_name "BPH", theme/background colors `#0d3d1a` / `#FAF8F3`, `display: "standalone"`, `icons` referencing a 192/512 PNG (final icon placeholder; favicon SVG is the live one).

- [ ] **Step 4: `src/app/icon.svg`** — brand mark (green rounded square + gold quotation glyph + "B"), used automatically as favicon by Next.

- [ ] **Step 5: `src/components/organization-schema.tsx`**

```tsx
export function OrganizationSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Banning Procurement Hub",
    description: "Construction and real-estate procurement: cement, iron rods, tiles, roofing, plumbing and electricals.",
    telephone: "+233558850667",
    email: "",
    address: { "@type": "PostalAddress", addressLocality: "Accra", addressCountry: "GH" },
    areaServed: "Ghana",
    openingHours: "Mo-Sa 08:00-18:00",
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
```

Render on home and contact inside their page components. (Email left empty intentionally pending client confirmation.)

- [ ] **Step 6: `public/llms.txt`** — concise site summary + sections list + contact (phone/WhatsApp/email) in plain text.

- [ ] **Step 7: OG defaults in `layout.tsx`** — `openGraph: { type: "website", locale: "en_GH", siteName }, twitter: { card: "summary_large_image" }`, image `/og.png`. Create `public/og.png` as a brand-styled static PNG (1200×630, deep green + gold, wordmark) via a local generation step (e.g. script or manual asset; a single branded PNG file placed in `public/`).

- [ ] **Step 8: Verify** — build, confirm `out/sitemap.xml`, `out/robots.txt`, `out/manifest.webmanifest`, `out/icon.svg` exist; JSON-LD present in home + contact HTML.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: seo, favicon, manifest, json-ld and llms.txt"
```

---

### Task 13: README + final pre-launch QA

**Files:**
- Create: `README.md`
- Modify: `PROJECT-PLAYBOOK.md` (tick completed items)
- Modify: `public/og.png`, favicon final review

**Interfaces:**
- Produces: dev documentation and a verified production build.

- [ ] **Step 1: `README.md`**

Project name, one-line purpose, stack, quickstart (`npm install`, `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`), how to replace sample data (edit `src/lib/site.ts`), where business facts are pending (address, email, socials, real photos, GA ID, domain to confirm `metadataBase`/sitemap URLs), deployment (static `out/` to Netlify/Vercel/any CDN), design system summary (tokens, fonts, shapes).

- [ ] **Step 2: QA walk (playbook tick)**

Run `npm run build` clean. Serve: `npx serve out`. Walk every route (home, products, 6 categories, quote, about, contact, privacy, terms, unknown → 404). Verify: no broken links (logo, header, footer, CTAs, breadcrumbs), mobile 375px has no horizontal scroll, all buttons have hover + active (tactile), success/error/empty states present (visit quote empty state, validate form with empty fields, add items, submit → WhatsApp), favicon present, copyright year current (`new Date().getFullYear()`), no placeholders visible, phone + email clickable, contrast audit passed, dark mode on all pages, skip-link works.

- [ ] **Step 3: Lighthouse**

Run Lighthouse against the local production build (Chrome DevTools or `npx lighthouse` on `npx serve out`). Targets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 90. Fix CLS < 0.1 (ensure image dimensions/aspect ratios set), contrast, taps in INP budget.

- [ ] **Step 4: Update `PROJECT-PLAYBOOK.md`** — tick every item now genuinely complete; leave client-blocked items unchecked with note (domain, GA, real data/photos, email confirmation, socials).

- [ ] **Step 5: Final commit + tag**

```bash
git add -A
git commit -m "chore: README, pre-launch QA and playbook update"
git tag v1.0.0
```

---

## Self-Review Notes

- **Spec coverage:** every design-spec section maps to a task — §3 data/context → T1, quote state → T2/T8, architecture/shell → T0/T4, IA pages → T5–T10, legal/404 → T11, SEO/launch → T12, testing/QA → T13. Global chrome + floats → T4. Trust layer → T5/T9. Scope exclusions upheld (no admin, no payments, no DB).
- **Type consistency:** `QuoteLine` defined once (T2) used by `format.ts` (T3) and `quote-context` (T2). `siteConfig.phoneIntl` used for `tel:` everywhere. `productsByCategory/getCategory/getProduct` signatures stable from T1. `monetaryTotal(lines: QuoteLine[])` defined and used only in T3/T8.
- **Placeholders:** og.png generation and icon PNG are the only asset placeholders, explicitly flagged for client replacement; all sample content is SAMPLE-tagged per spec.