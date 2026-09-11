# Brand select dropdown with Other fallback

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
Brand was a free-text input, making it easy to typo the same brand differently, duplicating product-brand rows.

## Fix
Replaced with a grouped dropdown in `materials-view.tsx`:
- `brand-constants.ts` exports `AFRICAN_CONSTRUCTION_BRAND_GROUPS` (optgroup labels) and `ALL_BRAND_OPTIONS`
- "Other (specify below)" option sets `brandIsCustom` state, revealing a text input for unlisted brands
- Tests in `brand-constants.test.ts` verify all brands are strings and groups are non-empty

## Files
- `src/lib/brand-constants.ts`
- `src/lib/brand-constants.test.ts`
- `src/components/admin/materials-view.tsx`