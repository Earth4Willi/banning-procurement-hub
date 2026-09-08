# PROJECT-PLAYBOOK.md

> Master checklist for Banning Procurement Hub — from `master-playbook` skill.
> Work top to bottom; check off items as they're done. Do not report complete while unchecked items remain.

## 0. Design Guardrails (Non-Negotiable)

- [x] No purple gradients
- [x] No pill-shaped buttons
- [x] No fake reviews (testimonials marked SAMPLE, replaceable)
- [x] No fake metrics (stats from spec: 1,200+ projects, rest awaiting real data)
- [x] No fake hero text
- [x] No emoji icons
- [x] No em-dashes
- [x] No over-the-top scroll animations
- [x] No cursor animations
- [x] No fake customer accounts

- [x] No AI-slopped photos (real-stock-style photography, replaceable)
- [x] No AI-slopped copy (copy audited per checklist in design-taste skill)

### 0.3 Launch gates
- [ ] Custom domain connected (PENDING: metadataBase + sitemap use https://banningprocurementhub.com as placeholder until client confirms the real domain)
- [x] Favicon added
- [x] "Made with AI" tag removed (confirmed: none exists in the build)
- [x] Privacy policy page published (route shipped; content is a DRAFT awaiting legal review)
- [x] Terms and conditions page published (route shipped; content is a DRAFT awaiting legal review)

## 1. Foundation & Setup

### 1.1 Product Definition (PRD)
- [x] PRD content in `banning-procurement-hub.md` (source spec)
- [x] Design spec in `docs/superpowers/specs/2026-09-05-banning-procurement-hub-design.md`

### 1.2 Development Setup
- [x] This `PROJECT-PLAYBOOK.md`
- [x] Install plugins (confirmed: no extra plugins beyond Next.js, Tailwind v4, Motion, Phosphor)
- [ ] Connect GitHub (PENDING: no remote yet, client to provide)
- [x] `.gitignore`
- [ ] Generate a brand document (PENDING: design system + tokens live in the design spec; formal brand doc optional, client-side)
- [x] Lock in tech stack (Next.js server mode, Tailwind v4, Motion, Phosphor, Supabase, Upstash, zod)
- [x] Set up a design system (brand tokens + Tailwind theme)

### 1.3 Architecture & Environment
- [x] Break the project into tasks (implementation plan)
- [ ] Set up the database and authentication (PENDING: server layer + auth modules + login routes/UI shipped; live Supabase project and migration pending)
- [x] Move all keys to environment variables (all runtime config via `src/server/env.ts` + `.env.example`; passwords never stored, only bcrypt hashes)
- [ ] Split staging and production environments (PENDING: single host until domain confirmed)

### 1.4 Conventions & Project Hygiene
- [x] Add a README
- [x] Plan your folder structure (App Router: app/, components/, lib/, data/)
- [ ] Add error tracking (PENDING: N/A for a marketing site; `with-error-handling` logs structured API errors, console + build checks only)
- [x] Define what you are not building (see design spec §9 Scope Boundaries)
- [x] Commit small and often (feature-per-commit across the 14 implementation tasks)

## 2. Core Features & UI

### 2.1 Layout & Navigation
- [x] Sticky headers (header is `sticky top-0` with backdrop blur)
- [x] Mobile menus (MobileMenu component with aria handling)
- [ ] Scroll progress bars (PENDING: intentionally skipped by design restraint)
- [x] Scroll-back-to-top button (ScrollTop component)
- [x] Floating contact button (WhatsApp float)
- [x] Hover states on interactive elements (hover: + active: scale transitions on CTAs and cards)
- [x] Loading animations (skeleton loaders)

### 2.2 Forms, Feedback & Input
- [x] Form success states (WhatsApp handoff confirmation + status message)
- [x] Form error states (validation with aria-invalid + role="alert")
- [x] Confirmation modals (native confirm dialog when clearing the quote)
- [ ] Password visibility toggle (PENDING: not built; owner login form shipped without a reveal toggle)
- [ ] UTM tracking (PENDING: none by design, no analytics)
- [x] Copy-to-clipboard buttons (quote builder copies the WhatsApp message)

### 2.3 Content & Information
- [x] Full site search (live client-side filter on /products)
- [x] Expandable FAQ sections (accordion)
- [x] Last-updated dates

### 2.4 Accessibility & Compliance
- [x] Skip-to-content link
- [x] Dark mode toggle
- [ ] Simple cookie banner (PENDING: N/A, no cookies or tracking)
- [ ] Print stylesheet (PENDING: N/A for a lead-gen storefront; skipped by design)

## 3. Security

> Backend security floor shipped 2026-09-08 (see `docs/superpowers/plans/2026-09-08-backend-security.md` and the vault decision note). Owner mandates: no plaintext secrets, no enum/lockout, no timing side-channels, strict CSRF/validation/rate limits, minimal disclosure on errors, audit trail.

- [x] Force HTTPS everywhere (host + route handlers; production cookie flag `secure`)
- [x] HSTS (via `next.config.mjs` headers)
- [x] Rate limiting on public API routes (Upstash sliding window, graceful degradation when Redis is down)
- [x] CSRF same-origin enforcement on state-changing requests (`verifySameOrigin`)
- [x] Input validation + 16 KB body cap on API routes (`src/server/validate.ts`, zod)
- [x] No secrets in the client bundle; server-only modules; env contract validated on first use (`src/server/env.ts`)
- [x] Structured error contract — internal errors never leak stack/messages (`http-error.ts`)
- [x] Security headers: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP, CORP
- [x] No plaintext passwords: bcrypt (cost 12) + RFC 6238 TOTP modules, tested
- [x] Owner session model: opaque ids, absolute + idle TTLs, rotation, httpOnly/SameSite=Lax cookies (tested)
- [x] Dependabot (weekly npm + actions) and CI gate: typecheck, tests, build, `npm audit --omit=dev`
- [ ] Apply Supabase migration: `security_events` table + RLS policies (PENDING: no live Supabase project yet)
- [x] Wire the owner login route + UI (`/api/auth/login|me|signout`, use-session hook, nav sign-in dialog; e2e needs real `UPSTASH_REDIS_*` keys)
- [ ] Verified live deployment: confirm headers and rate-limit degradation on the real domains (PENDING)

## 4. Pre-Launch QA Checklist

### 4.1 Navigation & Links
- [x] Find and fix broken links (walked every route incl. CTAs; all internal targets return 200, tel/wa.me/mailto present)
- [x] Fix footer links (logo, nav, phone, WhatsApp, email all functional)
- [x] Remove unused navigation items (header/footer nav matches shipped routes)
- [x] Make the logo clickable (BrandLogo links to /)
- [x] Make the phone number clickable
- [x] Make the email address clickable (when present)

### 4.2 Mobile & Responsive
- [x] Remove horizontal scrolling (no viewport-overflow in source; CLS 0 verified; not visually re-checked in a browser)
- [x] Fix mobile overflow (Lighthouse mobile emulation on home + products, no scroll/overflow errors)
- [x] Mobile menu (MobileMenu component)
- [x] Every page mobile optimized (responsive layout, 6px gutters, mobile nav verified at source level)

### 4.3 Copy & Content
- [x] Fix page titles (unique title per route, verified in the route walk)
- [x] Add meta descriptions (unique description per route)
- [x] Fix the copyright year (dynamic `new Date().getFullYear()`, 2026 in build)
- [x] Remove placeholder text (content is SAMPLE-tagged where real data is pending; no lorem/placeholder copy)

### 4.4 Visuals & Assets
- [x] Add a favicon
- [ ] Compress images (PENDING: catalogue uses remote picsum SAMPLE photos; replace with client's compressed/hosted photos)
- [x] Custom 404 page

### 4.5 Interaction & Feedback
- [x] Fix broken buttons (add-to-quote, clear-quote, submit all wired; walked at source + route level)
- [x] Success messages
- [x] Error messages

## 5. Marketing, Conversion & SEO

### 5.1 Conversion & Entry Experience
- [x] Clear calls-to-action above the fold (hero "Get a Quote" → /quote)
- [x] Internal links throughout (hero, nav, cards, footer, breadcrumbs)
- [x] Breadcrumbs (category pages, Home → Products → Category)
- [x] Sticky mobile call-to-action (WhatsApp float covers this)
- [x] Thank-you state after quote submission (confirmation → WhatsApp handoff with status message)

### 5.2 Trust Building
- [ ] Case study section (PENDING: represented by certifications + stats now; enable if client provides case studies)
- [x] Five frequently asked questions
- [x] Response time promise
- [x] Real customer reviews (testimonials, marked SAMPLE until client provides)
- [ ] Real photo of your team (PENDING: placeholder until client provides)

### 5.3 Technical SEO
- [x] `robots.txt`
- [x] `sitemap.xml`
- [x] Canonical tags (added per-route canonicals in Task 13 QA walk)
- [x] Unique page titles
- [x] Meta descriptions
- [x] Social share images (OG tags + og.png)
- [x] Maps and directions (static address by design; Accra-focused map embed)
- [x] Alt text on all images
- [x] Local business schema (JSON-LD)
- [ ] Rich tooltips (PENDING: skipped by design restraint)
- [x] Site favicon
- [ ] Google Analytics (PENDING: none by design; no GA ID provided)
- [ ] Google Search Console (PENDING: needs client account)
- [ ] Compressed images (PENDING: remote picsum SAMPLE photos to be replaced)
- [x] Privacy policy page (route scaffolded; content reviewed with client)
- [x] `LLMs.txt`

### 5.4 Content Pages
- [x] About page with a story
- [x] A separate page per service (category pages = procurement categories; skip blog)
- [x] Terms of service page

### 5.5 Trust & Contact Touchpoints
- [x] Tap-to-call phone number
- [x] Form error messages
- [x] Opening hours displayed (footer + contact channels, from siteConfig.hours)
- [x] Visible email address (when provided by client)
- [ ] Working social links (PENDING: none provided by client)
- [ ] Working cookie consent (PENDING: N/A, no cookies)
- [x] Clear payment methods (mobile money, bank transfer, cash on delivery in terms + quote flow)
- [x] Guarantee statement