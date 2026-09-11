# Marquee: hover-pause and smooth infinite scroll

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
CSS-only marquee was janky on scroll — no smooth infinite loop, no hover-pause.

## Fix
Replaced with GSAP in `src/components/header.tsx`:
- GSAP timeline translates the inner wrapper infinitely for a seamless loop
- `onMouseEnter` / `onMouseLeave` toggle `playState` to pause on hover
- Wrapper is `overflow-hidden`; inner content duplicated for seamlessness

## Files
- `src/components/header.tsx`