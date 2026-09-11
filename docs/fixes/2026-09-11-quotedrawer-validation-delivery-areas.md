# QuoteDrawer: live validation + DB-backed delivery areas

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
- QuoteDrawer had no live validation — errors only appeared on save, and entry of a free-text delivery area
- `siteConfig.deliveryAreas` was hardcoded and never read the DB settings that the delivery areas feature actually saves

## Fix
- `validateQuoteContact` runs on every field change (name, phone, email, area) — errors appear immediately under each field with `role="alert"`; save is blocked until all fields pass
- Delivery areas come from `useDeliveryAreas()` hook (fetches `/api/admin/settings/delivery`) instead of hardcoded config
- "Other (type below)" sentinel shows a custom text input for unlisted areas

## Files
- `src/components/admin/quote-drawer.tsx`
- `src/hooks/use-delivery-areas.ts`
- `src/lib/validation.ts`
- `src/components/admin/messages-view.tsx`