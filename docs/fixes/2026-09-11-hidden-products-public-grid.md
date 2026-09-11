# Hidden products (out of stock) not shown on public grid

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
Public product grids were showing out-of-stock products alongside in-stock ones, which is misleading for shoppers.

## Fix
Filtering happens at the presentation layer, not storage:
- Public grids: `products/page.tsx` and `products/[category]/page.tsx` filter with `p.stockStatus !== "out"`
- Admin `materials-view.tsx` keeps all products visible with a stock badge pill (`bg-emerald` = in, `bg-amber` = limited, `bg-red` = out)

## Files
- `src/app/(public)/products/page.tsx`
- `src/app/(public)/products/[category]/page.tsx`
- `src/components/admin/materials-view.tsx`