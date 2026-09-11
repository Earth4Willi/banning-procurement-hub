# API route error distinction: DB not configured vs server error

**Status:** ✅ Fixed
**Date:** 2026-09-11
**Committed in:** `a362601`

## Issue
API routes for messages and customers returned the same generic error whether the database wasn't configured or an actual write failed — masking real configuration problems as generic failures.

## Fix
- `isMessageStoreAvailable()` checks whether the database is configured
- On failure, routes return "Live database not configured — message/customer not updated/deleted." when no DB is set up, otherwise "…check the server logs for details."

## Files
- `src/app/api/admin/messages/route.ts`
- `src/app/api/admin/customers/route.ts`