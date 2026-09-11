# Image URL live preview + local file upload

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
Admins pasted image URLs and couldn't tell whether the link actually resolved until after saving the product — dead links stayed broken silently.

## Fix
- `ImageUrlPreview` component in `materials-view.tsx` loads the pasted URL as an `<img>` immediately, showing loading / success / error states with an inline hint ("Couldn't load that image — check the URL or upload the file instead.")
- Local file upload reads the file via `FileReader` and displays it inline
- Both product and category forms get the preview below the URL input

## Files
- `src/components/admin/materials-view.tsx`