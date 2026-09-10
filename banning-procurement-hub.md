
**Overview**

Banning Procurement Hub is a website for a Ghana-based construction and real-estate procurement company (+233 0558850667). It's meant to serve as the company's digital storefront and lead-generation engine: visitors discover the site, browse a materials catalogue (cement, iron rods, tiles, roofing sheets, plumbing, electricals), and convert into customers through a "Request a Quote" flow. The intended journey is Discover → Browse Products → Request Quote → Receive Quote (via email/WhatsApp) → Place Order & Pay → Delivery. The site is designed to build trust (testimonials, stats like "1,200+ Projects Completed," certifications) and make contact frictionless (click-to-call, WhatsApp float button, Google Maps embed), positioning the business as "Ghana's #1 Procurement Hub for Construction."

**Color System**

| Role | Hex |
|---|---|
| Primary Dark | `#0d3d1a` |
| Primary Mid | `#1a6b2f` |
| Primary Light | `#2e9e4f` |
| Gold Accent | `#F0B429` |
| Gold Light | `#FDD87A` |
| Background Cream | `#FAF8F3` |
| White | `#FFFFFF` |
| Text Dark | `#111A14` |

The palette is a deep-to-light green primary range (evoking growth/construction/trust) paired with a warm gold accent for CTAs and highlights, set against a soft cream background rather than stark white. The plan recommends defining these as CSS custom properties (e.g. `--color-primary`, `--color-accent`, `--color-surface`) for easy theming later.
**Admin Model (decision � saved for future reference)**

The client (owner) is the only person managing the admin dashboard for now. Keep the
single-owner model: no sub-admin/super-admin roles. Admin routes stay gated by
`requireOwner` (`src/server/require-owner.ts`); the dashboard is owner-only.

Consequences other sessions should respect:
- No admin_users table, no sub-admin roles, no role hierarchy (design this only if the
  admin model grows).
- Owner credentials live in env (`OWNER_EMAIL` / `OWNER_PASSWORD_HASH` /
  `OWNER_TOTP_SECRET`) with TOTP 2FA. There is currently no in-app owner
  password/2FA rotation screen; recovery = rotate env vars + redeploy.
- The avatar/profile-photo upload feature was removed from the admin sidebar
  (placeholder removed); server endpoint `/api/admin/profile/image` is inert but kept.
- Browser image decode of uploaded profile photos was unreliable ? feature dropped
  rather than debugged further.
