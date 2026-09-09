# Phase Wrap-Up: Deploy & Verify (2026-09-09)

## Status: LIVE ✅

The site is deployed and the full owner sign-in flow is verified end-to-end against **https://banning-procurement-hub.vercel.app**.

## What changed on the deployment path

### Upstash Redis (the previously-blocking issue)
- The free **trial** cluster (`crack-mosquito-144856`, via `/start-redis`) was unreachable from BOTH the local machine and Vercel's network (connect timeouts to `98.90.83.211`/`23.23.42.209:443`) — a global trial-pool outage. Production login 500'd on it.
- **Fixed by provisioning an account-tier DB** via the Upstash Developer API:
  - `scripts/upstash-account-provision.mjs` (idempotent): `POST /v2/redis/database` → `bph-prod`, free plan, **eu-west-1** (closest major region to a Ghanaian company). Requires `UPSTASH_API_KEY` + `UPSTASH_API_EMAIL` env vars only — never stored/committed.
  - Returns `endpoint` as a full host (`magical-herring-146096.upstash.io`); script now constructs the REST URL correctly and falls back to `GET /redis/database/{id}` for credentials if the create response lacks them.
  - Verified PING → PONG and a SET/GET round-trip; creds upserted into `.env.local`.

### Vercel
- Dead trial env vars removed from production; new `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` added (encrypted, production-only).
- Redeployed → aliased to `banning-procurement-hub.vercel.app`.
- **Git integration connected** (`vercel git connect`) → pushes to `main` now auto-deploy. Verified: push `554a803` produced a new production deployment automatically.

### Live production e2e (all assertions green)
| Check | Result |
|---|---|
| `GET /` | **200** |
| `POST /api/auth/login/` wrong password | **401** `invalid_credentials` |
| `POST /api/auth/login/` correct password | **200** `{step:"code", pendingId}` |
| TOTP code (RFC 6238, secret-key) | computed |
| `POST /api/auth/login/verify/` | **204** + `Set-Cookie: bph_session=…` (Secure; HttpOnly; SameSite=lax) |
| `GET /api/auth/me/` with session | **200** `{email, role:"owner"}` |
| `POST /api/auth/signout/` | **204** |
| `GET /api/auth/me/` after sign-out | **401** |
| Brute-force burst (6 rapid wrong passwords) | `401,401,401,429,429,429` → **Redis-backed rate limiting enforcing** |

### CI
- GitHub Actions green on every push (Node 24 + Vitest forks pool). Run `34300217697` for this phase succeeded; tests total **82**.

## Not done this phase
- **Web3Forms key** (`NEXT_PUBLIC_WEB3FORMS_KEY`): awaiting inbox verification at web3forms.com (email `banning173@gmail.com`). It is `NEXT_PUBLIC_` → inlined at build time → must be added to Vercel env and rebuilt before form submissions POST.
- **Supabase migration** (later phase, by design): `SUPABASE_*` envs are optional today; `security_events` audit inserts are best-effort no-ops without them.
- Domain swap from the placeholder (`banningprocurementhub.com`) and analytics ID remain pending client confirmation.

## Owner credentials (handoff)
- Owner email: `banning173@gmail.com`
- Sign-in password: `3DRAS9LLtN36`
- TOTP secret (add to authenticator app): `KBXWCW2RT76NEHMFJJ5UHE4MFJ5YJQV2`
- `AUTH_SECRET` and the bcrypt hash are in Vercel env + `.env.local`.

## Quick reference
- Live: https://banning-procurement-hub.vercel.app
- Repo: https://github.com/Earth4Willi/banning-procurement-hub (auto-deploy on `main` push)
- Fix entries: `scripts/upstash-account-provision.mjs`, README deployment section