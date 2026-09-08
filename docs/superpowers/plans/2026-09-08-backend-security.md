# Backend Security Floor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development and superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the security floor for the BPH backend before any feature ships. The owner's 10 must-have controls plus 8 hardening additions, implemented as thin, testable modules on Next.js route handlers + Supabase + Upstash Redis, living in the same repo.

**Architecture:** Security modules live in `src/server/` and are only ever imported by route handlers (Node runtime). `src/server/env.ts` fails fast on missing secrets. A single exemplar route `POST /api/quote` proves the floor end to end (rate limit → strict validate → CSRF/origin → error mapping → audit). Product/quote data stays in `src/lib/site.ts` until the data phase; no persistence yet.

## Tech Stack

- Next.js 16 App Router, **server mode** (drops `output: "export"`). Pages stay SSG where possible.
- Supabase (`@supabase/supabase-js`) for Postgres + RLS.
- Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`) for rate limiting + sessions.
- `zod` for boundary validation. `bcryptjs` for password hashing (pure JS, serverless-safe; argon2 native is fragile on serverless).
- TOTP (2FA) implemented with `node:crypto` (RFC 6238), no extra dependency.
- Vitest for unit tests.

## Global Constraints

- Server modules are Node-runtime only; nothing under `src/server/` may be imported by client components or the middleware edge.
- No hardcoded secrets anywhere. `NEXT_PUBLIC_*` only for non-secrets that ship to the client.
- Security headers ship via `next.config.mjs` `headers()` (deterministic, edge-free). Helmet is N/A: there is no Express/Node HTTP server this phase.
- All user input passes a strict zod schema; unknown fields are rejected (blocks field tampering).
- Every fallible external call degrades gracefully: if Redis is unreachable, rate limiting logs a warning and lets the request through (Hot_Cake precedent) rather than bricking the site.
- Errors to clients are structured `{ error: { code, message } }` with no stack traces or internal detail.
- No em-dashes in new wordsmithing. Existing house style, tokens and test conventions apply.

---

### Task 1: Env contract and fail-fast parsing

**Files:** `src/server/env.ts`, `.env.example`, `src/server/env.test.ts`

- [ ] **Step 1: Env schema (zod)**

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  SESSION_ABS_TTL_SECONDS: z.coerce.number().int().positive().default(86400 * 7),
  SESSION_IDLE_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  OWNER_EMAIL: z.string().email(),
});
```

- [ ] **Step 2:** Parse `process.env` at module load. Export the parsed object as `env`. If parsing fails, throw with a clear `z.issue` summary and exit 1.
- [ ] **Step 3:** Update `.env.example` with the full list (values blank), keeping the existing Web3Forms key.
- [ ] **Step 4 (test):** missing SUPABASE_URL fails; invalid AUTH_SECRET (short) fails; defaults fill `SESSION_*`; `NODE_ENV=test` works. Mock `process.env` per test.

### Task 2: Error model

**Files:** `src/server/http-error.ts`, `src/server/http-error.test.ts`

- [ ] **Step 1:** `class HttpError extends Error` with `status`, `code`, optional `details`. Helpers: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `tooManyRequests`, `conflict`.
- [ ] **Step 2:** `toErrorResponse(e)` maps `HttpError` → `{ error: { code, message, details? } }`; anything else → generic 500 `{ error: { code: "internal", message: "Something went wrong." } }`. Never leaks `e.message` or stack for non-HttpError.
- [ ] **Step 3 (test):** HttpError maps to its status/code; unknown error maps to generic 500 with no message/stack leak.

### Task 3: Rate limiting

**Files:** `src/server/rate-limit.ts`, `src/server/rate-limit.test.ts`

- [ ] **Step 1:** `clientIp(request)` returns the first `x-forwarded-for` entry or `x-real-ip` or `request.ip` fallback `"unknown"`.
- [ ] **Step 2:** `rateLimit({ prefix, identifier, limit, windowSeconds })` wraps `@upstash/ratelimit` sliding window against `@upstash/redis`. Lazily constructs the Redis client so an unreachable store surfaces as a caught error → warn once and **allow** (graceful degradation).
- [ ] **Step 3:** `checkRateLimit(request, { key, limit, windowSeconds })` returns `{ ok: true, headers }` on pass or throws `HttpError(429)` with `Retry-After` on fail.
- [ ] **Step 4 (test):** degradation path with a redis client that throws returns allow; pass/fail inspect carried `X-RateLimit-*` headers via the injected store.

### Task 4: Boundary validation

**Files:** `src/server/validate.ts`, `src/server/validate.test.ts`

- [ ] **Step 1:** `strict(schema)` forces `zod` `.strict()`; `parseBody(request, schema)` reads text, caps at `BODY_LIMIT_BYTES` (16 KB), JSON-parses with an explicit catch, then validates.
- [ ] **Step 2:** Schemas: `phoneSchema` (Ghana `+233`/`0xx` pattern, reuse `src/lib/validation.ts` intent), `quoteSubmitSchema`, `contactSubmitSchema`, `loginSchema`. Max lengths on every text field; normalize email (trim + lowercase) and phone.
- [ ] **Step 3 (test):** oversize body → 413; malformed JSON → 400; unknown field → 400 "unknown field"; injection payloads (`<script>`, SQL fragments) are accepted as plain strings but length-capped; valid payload passes and email is normalized.

### Task 5: CSRF and origin checks

**Files:** `src/server/csrf.ts`, `src/server/csrf.test.ts`

- [ ] **Step 1:** SameSite=Lax cookie means top-level GET navigations are safe; guard only state-changing routes. `verifySameOrigin(request)`: if `Origin` is present it must equal `env.APP_ORIGIN` (or be same host when behind proxy); missing Origin on a non-GET is rejected as `csrf`.
- [ ] **Step 2 (test):** matching origin passes; mismatched origin → 403; missing origin on POST → 403; GET untouched.

### Task 6: Sessions

**Files:** `src/server/session.ts`, `src/server/session.test.ts`

- [ ] **Step 1:** Opaque session id via `crypto.randomBytes(32).toString("base64url")`. `createSession({ sessionId, principal })` writes `{ principal, lastSeen }` to Redis with key `session:<id>` and `EX = SESSION_ABS_TTL_SECONDS`.
- [ ] **Step 2:** `readSession(sessionId)` loads, checks absolute expiry (`EX` handles it), checks idle TTL (`lastSeen` age), and on success slides `lastSeen` to now with a **new** EX (rolling idle, absolute cap enforced by Redis TTL). Returns `null` when missing/expired/idle.
- [ ] **Step 3:** `rotateSession(oldId)` creates a new id with the same principal, deletes the old, returns the new (called on login and privilege change). `revokeSession(sessionId)` deletes (called on password change/logout).
- [ ] **Step 4:** `SESSION_COOKIE` name `bph_session`, httpOnly, SameSite=Lax, Secure in production, Max-Age from absolute TTL. Cookie read/write helpers take a `NextResponse`/`cookies()` handle.
- [ ] **Step 5 (test):** create/read returns principal; idle expiry when lastSeen stale; absolute expiry by TTL; rotate deletes old and preserves principal; revoke makes read null. Redis store faked with an in-memory map.

### Task 7: Password hashing and TOTP

**Files:** `src/server/passwords.ts`, `src/server/totp.ts`, tests

- [ ] **Step 1:** `hashPassword` (bcrypt, cost 12), `verifyPassword` (constant-time via bcryptjs compare). `randomSecret()` helper.
- [ ] **Step 2:** `totp.ts`: RFC 6238. `generateSecret()`, `totpCodeAt(secret, timeStep)`, `verifyTotp(secret, code)` with a ±1-step window and constant-time compare. Base32 encode/decode implemented over `node:crypto`.
- [ ] **Step 3:** Tests: bcrypt hash verifies true and rejects wrong password; TOTP matches the RFC 6238 test vector (`GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`, `code 94287082` at T=59) and rejects a wrong code.

### Task 8: Auth (owner admin only)

**Files:** `src/server/auth.ts`, `src/server/auth.test.ts`

- [ ] **Step 1:** `findOwnerByEmail(email)` (Supabase later; in-memory from env for now) returns normalized owner principal.
- [ ] **Step 2:** `loginWithPassword({ email, password, totpCode })`:
  - rate limit per IP and per email (from Task 3);
  - generic failure message `"Invalid email, password, or code."` for unknown user / wrong password / wrong TOTP (prevents enumeration);
  - on success, `createSession` + `rotateSession` and returns the cookie Set-Cookie.
- [ ] **Step 3:** Lockout: ratelimit envelope of 5 failures per 15 min per email wraps the login attempt.
- [ ] **Step 4 (test):** correct credentials → session cookie dispatched; wrong password and unknown email return the identical generic error; 6th failure within the window → 429.

### Task 9: Error wrapping and audit

**Files:** `src/server/with-error-handling.ts`, `src/server/audit.ts`

- [ ] **Step 1:** `withErrorHandling(handler)` wraps a route handler so any thrown `HttpError` or unknown error becomes `toErrorResponse` with the correct status; logs `code, path, method, ip, status` server-side (no message bodies into logs).
- [ ] **Step 2:** `audit(event, metadata)` inserts into Supabase `security_events` (graceful skip + warning when the project/table is absent this phase).

### Task 10: Exemplar route `POST /api/quote`

**Files:** `src/app/api/quote/route.ts`

- [ ] **Step 1:** `export const runtime = "nodejs"; export const dynamic = "force-dynamic";`
- [ ] **Step 2:** Wire in order: `checkRateLimit` (per IP, 10/min) → `verifySameOrigin` → `parseBody(strict quoteSubmitSchema)` → `audit("quote_submitted", ...)` → `NextResponse.json({ ok: true, reference: <id> }, { status: 202 })`. No persistence yet; `reference` is a random id so clients can cite it.

### Task 11: Headers via next.config

**Files:** `next.config.mjs`

- [ ] **Step 1:** Remove `output: "export"`. Keep `images.unoptimized` and `trailingSlash`.
- [ ] **Step 2:** `async headers()` (all routes): CSP (`default-src 'self'`; `script-src 'self' 'unsafe-inline'` for hydration; `img-src 'self' data: https:`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera=(), microphone=(), geolocation=(), payment=()), `X-Frame-Options: DENY` (+ `frame-ancestors 'none'` in CSP), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`. HSTS plus HTTPS redirect are enforced by the hosting platform (noted, not reimplemented).
- [ ] **Step 3:** Update README: server mode, new quickstart (`npm run build && npm run start`), env setup, project structure gains `src/server/`, deployment on a serverless Node host.

### Task 12: CI / dependency cadence

- [ ] **Step 1:** `.github/dependabot.yml` — weekly npm updates, auto label `dependencies`.
- [ ] **Step 2:** `.github/workflows/ci.yml` — on push/PR: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --omit=dev` (fail on high+).

### Task 13: Verify

- [ ] `npm test` (new + existing), `npm run typecheck`, `npm run build`.
- [ ] Tick Security sections in `PROJECT-PLAYBOOK.md` (rate limiting, sanitize, hash, env, CORS/origin, injection (parameterized), HTTPS (platform), headers, dep updates, sessions; CSRF, server-authoritative pricing reserved, RLS/least-priv reserved, generic errors, 2FA, webhook/idempotency reserved, audit log, secret purge in gitignore).

## Out of scope (deferred to the data/feature phase)

- Persistence, catalog API, checkout/payments, customer accounts, OmniRoute, Web3Forms server proxy migration.
- Live Supabase migration for `security_events` and RLS policies (documented, applied once a project exists).