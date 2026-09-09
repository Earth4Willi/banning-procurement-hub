# Admin Panel Rearchitecture — Design Spec

Date: 2026-09-09 · Project: Banning Procurement Hub (Next 16, Supabase, Vercel)

## Goal

Turn `/admin` into a sidebar-based panel with five destinations: **Analytics**, **Messages**, **Customers**, **Materials (editable)**, and **Sign out**. Public catalog becomes DB-backed so admin edits go live on the site. Customers are derived from quotes and messages. Contact-form messages are captured into the database.

## Approved scope decisions

- Customers = auto-derived from quotes + messages (deduped by normalized phone), with editable notes/status and per-customer quote history. No manual directory.
- Messages = one nav item with two sub-tabs: quote requests (status workflow + inline edit of request details) and contact-form messages (read/unread, editable).
- Analytics = KPIs derived from business data only (no visitor tracking): requests this week, status funnel, top requested materials, top delivery areas, source split (web vs WhatsApp vs contact), recent activity, CSV export.
- Materials = products + categories CRUD (name/brand/unit/price-or-quote/stock/hide-show/image upload; category name/desc/image/sort). Marquee, testimonials moderation, and site settings (phone/email/hours) are deferred to a later round.
- Sidebar tabs use `?view=` URL param (shareable, refreshable, back-button friendly): `analytics | messages | customers | materials`. Sub-tabs use `?view=messages&tab=quotes` etc.
- Public catalog pages become ISR (`revalidate = 60`) so edits reflect within ~60s.
- Migrations applied by the user via the Supabase SQL Editor (postgres password is broken; existing pattern).

## Architecture

### Data model — `supabase/migrations/0002_cms.sql`

New tables (mirror existing static `src/lib/site.ts` shapes exactly so fallback is seamless):

| Table | Columns |
|---|---|
| `categories` | `id text PK`, `name text`, `short text`, `description text`, `image_url text`, `sort_order int`, `visible boolean` |
| `products` | `id uuid PK`, `slug text unique`, `category_id text FK→categories`, `name text`, `brand text`, `unit text`, `unit_price text` (display string, e.g. "GH₵ 120"), `image_url text`, `description text`, `stock text`, `pricing_mode text`, `kind text`, `visible boolean`, `sort_order int`, `created_at`, `updated_at` |
| `messages` | `id uuid PK`, `name text`, `phone text`, `email text`, `area text`, `message text`, `read boolean default false`, `created_at` |
| `customers` | `phone text PK` (normalized `+233…`), `name text`, `email text`, `notes text`, `status text` (`new|active|won|lost|blocked`), `created_at`, `updated_at` |

Alterations:
- `ALTER TABLE quotes ADD COLUMN source text NOT NULL DEFAULT 'web';` — manual WhatsApp adds set `'whatsapp'`, contact form sets `'contact'` (messages table), web sets `'web'`.

Seeds: current static categories + products inserted `ON CONFLICT DO NOTHING`. Image buckets (`profile-images`, `catalog-images`) are created at runtime by the upload helper, not by SQL.

### Server layer

- `src/server/storage.ts` — generalized upload helper: `ensureBucket(bucket)`, `uploadToStorage(bucket, path, file)` with guard/validate/URL logic moved out of `profile-image.ts`. `profile-image.ts` refactors onto it. Image validation (type/size, dims optional via helper) shared.
- `src/server/catalog-store.ts` — `fetchCategories()`, `fetchProducts()`; DB-first, static `site.ts` fallback when unconfigured/unavailable. Same shapes as today.
- `src/server/message-store.ts` — `persistMessage`, `listMessages`, `setMessageRead`.
- `src/server/customer-store.ts` — `upsertCustomer(phone, {name,email})` on every new quote/message; `listCustomers()` (aggregates: request count, last contact, best quote status, sources); `updateCustomer(phone, {notes,status})`.
- `src/server/analytics.ts` — pure, testable: totals, thisWeekNew, statusFunnel, topItems (sum quantities from `quotes.items`), topAreas, sourceSplit, recentActivity (quotes + messages + events merged, newest N).
- `src/server/quote-store.ts` — `persistQuote` gains `source`; `updateQuote(id, fields)` for the Messages-edit capability.

### API surface (all `requireOwner` + `withErrorHandling`, Zod-strict)

| Route | Methods | Notes |
|---|---|---|
| `/api/contact` | POST | public; stores to `messages`, best-effort Web3Forms email; upserts customer |
| `/api/catalog` | GET | public; categories+products (DB or fallback), cached `revalidate=60` |
| `/api/admin/catalog/products` | GET, POST, PATCH, DELETE | CRUD + `sort_order`/`visible` |
| `/api/admin/catalog/categories` | GET, POST, PATCH, DELETE | CRUD + sort/visible |
| `/api/admin/catalog/image` | POST | multipart image upload → `catalog-images` bucket; for products/categories |
| `/api/admin/messages` | GET, PATCH | list; set read / edit fields |
| `/api/admin/customers` | GET, PATCH | list (derived+join); update notes/status |
| `/api/admin/analytics` | GET | KPI payload |
| `/api/admin/quotes` | POST|manual add (Phase A, exists) |
| `/api/admin/quotes/status` | POST | unchanged |

Every mutation writes an audit event to `security_events` (existing pattern): `product_created/updated/deleted`, `category_created/updated/deleted`, `message_read`, `customer_updated`, `quote_edited`.

### Public site switch

- `/products` and `/products/[category]`: switch from static imports to `catalog-store` with `export const revalidate = 60` (drop build-time `generateStaticParams`; stay `force-dynamic`-free, ISR handles it). Filter `visible`.
- Quote builder: new `CatalogProvider` client context fetching `/api/catalog` once; quote-builder and any future consumer read from it (fallback to static values until fetch resolves).

### Admin shell + views (refactor `admin-dashboard.tsx`)

- Shell: deep-green sidebar (`#0d3d1a`), grid overlay (existing `.dashboard-grid-bg`), gold accent active state. Top: profile avatar (Phase A upload) + "Welcome back, {email prefix}" + signed-in email. Nav: Analytics, Messages (badge: new quotes + unread messages), Customers, Materials, Sign out at bottom. Mobile: horizontal pill nav bar (mirrors Phase A header pill) instead of fixed sidebar. View switching via `?view=` (client reads/writes search params).
- **Analytics** (default): KPI cards (requests this week, open/new, won rate, customers, unread messages), status funnel, top materials, top areas, source split, recent activity feed, CSV export (moved here).
- **Messages**: sub-tabs Quotes | Contact. Quotes: existing table + inline edit (name/phone/email/area/note + items) + status select. Contact: message rows with read/unread toggle + edit + mark-all-read.
- **Customers**: searchable list (name, phone, area, request count, last contact, best status, source) → detail panel with editable notes/status and quote history.
- **Materials**: sub-tabs Products | Categories. Products: table (image, name, category, price, stock, visible) + add/edit form (fields per schema, image upload, pricing-mode switch → price field vs "price on request") + hide/show + delete (confirm). Same shape for categories.
- New-badge/activity refresh: poll `/api/admin/analytics` on an interval plus on focus, and after every mutation.

### Error handling / fallback

- All admin APIs: 401/403 when not owner, 400 `validation_failed` on bad input, 503 `storage_unavailable` when DB unconfigured. Client surfaces message text (existing `withErrorHandling` + `parseBody` + zod-strict pattern).
- Public routes never 500 on DB absence — they return static fallback transparently.

### Testing

- New: `validate.test.ts` additions (product/category/message/customer schemas), `catalog-store` fallback behavior, `message-store`, `customer-store`, `analytics` (pure functions), `storage` guard + URL. Existing 105 tests stay green.
- Gates: `npx vitest run` → `npx tsc --noEmit` → `npm run build` → dev spot-checks (analytics payload, message capture, materials CRUD round-trip with image upload, customers list, quote edit, public catalog 60s reflect).

### Deferred (explicitly out of scope this round)

- Marquee texts CRUD, testimonials moderation, site settings (phone/email/address/hours), visitor analytics, per-product SEO/sitemap flags, stock notifications.

### Migration handoff

`0002_cms.sql` is delivered to the user to paste into the Supabase SQL Editor before live verification of DB-backed catalog/admin. Until applied, every DB-backed surface falls back to static data or returns "database unavailable" mesages — the site keeps working.