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
- [ ] Custom domain connected (N/A until client provides)
- [x] Favicon added
- [ ] "Made with AI" tag removed (none will be added)
- [ ] Privacy policy page published
- [ ] Terms and conditions page published

## 1. Foundation & Setup

### 1.1 Product Definition (PRD)
- [x] PRD content in `banning-procurement-hub.md` (source spec)
- [x] Design spec in `docs/superpowers/specs/2026-09-05-banning-procurement-hub-design.md`

### 1.2 Development Setup
- [x] This `PROJECT-PLAYBOOK.md`
- [ ] Install plugins
- [ ] Connect GitHub (N/A until client provides remote)
- [x] `.gitignore`
- [ ] Generate a brand document
- [x] Lock in tech stack (Next.js static export, Tailwind v4, Motion, Phosphor)
- [x] Set up a design system (brand tokens + Tailwind theme)

### 1.3 Architecture & Environment
- [x] Break the project into tasks (implementation plan)
- [ ] Set up the database and authentication (N/A — no backend)
- [x] Move all keys to environment variables (N/A — no keys; single phone constant in `site.ts`)
- [ ] Split staging and production environments (N/A — static export; preview via PR)

### 1.4 Conventions & Project Hygiene
- [ ] Add a README
- [x] Plan your folder structure (App Router: app/, components/, lib/, data/)
- [ ] Add error tracking (N/A for static site; console + build checks)
- [x] Define what you are not building (see design spec §9 Scope Boundaries)
- [ ] Commit small and often

## 2. Core Features & UI

### 2.1 Layout & Navigation
- [ ] Sticky headers
- [ ] Mobile menus
- [ ] Scroll progress bars (skip — restraint; mark N/A by design choice)
- [ ] Scroll-back-to-top button
- [x] Floating contact button (WhatsApp float)
- [ ] Hover states on interactive elements
- [x] Loading animations (skeleton loaders)

### 2.2 Forms, Feedback & Input
- [x] Form success states (WhatsApp handoff confirmation)
- [x] Form error states (validation)
- [ ] Confirmation modals
- [ ] Password visibility toggle (N/A — no auth)
- [ ] UTM tracking
- [ ] Copy-to-clipboard buttons

### 2.3 Content & Information
- [ ] Full site search (client-side filter on /products)
- [x] Expandable FAQ sections (accordion)
- [x] Last-updated dates

### 2.4 Accessibility & Compliance
- [x] Skip-to-content link
- [x] Dark mode toggle
- [ ] Simple cookie banner (N/A — no cookies/tracking)
- [ ] Print stylesheet (N/A for lead-gen storefront; skip)

## 3. Security

- [x] Force HTTPS everywhere (static host default; no HTTP server)
- [x] HSTS (handled by hosting platform at CDN edge; N/A at app layer)
- [x] No sessions/cookies to secure (no auth, no backend)
- [x] Global checkboxes 3.2–3.6: N/A — no database, no auth, no payments, no server, no secrets, no uploads. Only static content + WhatsApp deep links. Validate & sanitize all form input client-side before building the message.

## 4. Pre-Launch QA Checklist

### 4.1 Navigation & Links
- [ ] Find and fix broken links
- [ ] Fix footer links
- [ ] Remove unused navigation items
- [ ] Make the logo clickable
- [x] Make the phone number clickable
- [x] Make the email address clickable (when present)

### 4.2 Mobile & Responsive
- [ ] Remove horizontal scrolling
- [ ] Fix mobile overflow
- [ ] Mobile menu
- [ ] Every page mobile optimized

### 4.3 Copy & Content
- [ ] Fix page titles
- [ ] Add meta descriptions
- [ ] Fix the copyright year
- [ ] Remove placeholder text

### 4.4 Visuals & Assets
- [x] Add a favicon
- [ ] Compress images
- [x] Custom 404 page

### 4.5 Interaction & Feedback
- [ ] Fix broken buttons
- [x] Success messages
- [x] Error messages

## 5. Marketing, Conversion & SEO

### 5.1 Conversion & Entry Experience
- [ ] Clear calls-to-action above the fold
- [ ] Internal links throughout
- [ ] Breadcrumbs
- [ ] Sticky mobile call-to-action (WhatsApp float covers this; group as header CTA)
- [ ] Thank-you state after quote submission (confirmation screen → WhatsApp)

### 5.2 Trust Building
- [ ] Case study section (represented by certifications + stats; enable if client provides)
- [x] Five frequently asked questions
- [x] Response time promise
- [x] Real customer reviews (testimonials, marked SAMPLE until client provides)
- [ ] Real photo of your team (placeholder until client provides)

### 5.3 Technical SEO
- [ ] `robots.txt`
- [ ] `sitemap.xml`
- [ ] Canonical tags
- [ ] Unique page titles
- [ ] Meta descriptions
- [ ] Social share images (OG tags)
- [x] Maps and directions (Google Maps embed)
- [x] Alt text on all images
- [x] Local business schema (JSON-LD)
- [ ] Rich tooltips
- [x] Site favicon
- [ ] Google Analytics (defer — N/A until client provides GA ID)
- [ ] Google Search Console (defer — needs client account)
- [ ] Compressed images
- [x] Privacy policy page (route scaffolded; content reviewed with client)
- [ ] `LLMs.txt`

### 5.4 Content Pages
- [ ] About page with a story
- [ ] A separate page per service (category pages = procurement categories; skip blog)
- [ ] Terms of service page

### 5.5 Trust & Contact Touchpoints
- [x] Tap-to-call phone number
- [x] Form error messages
- [ ] Opening hours displayed
- [x] Visible email address (when provided by client)
- [ ] Working social links (N/A until client provides)
- [ ] Working cookie consent (N/A — no cookies)
- [x] Clear payment methods (placeholder until client confirms)
- [x] Guarantee statement