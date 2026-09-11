import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { HttpError, unauthorized } from "./http-error";
import { verifyPassword } from "./passwords";
import { newPendingId, type PendingLogin, type PendingLoginStore } from "./pending-login";
import { clientIp, enforceRateLimit } from "./rate-limit";
import type { OwnerPrincipal } from "./session";
import { verifyTotp } from "./totp";

export const GENERIC = "Invalid email or password.";
export const CODE_ERROR = "Invalid or expired code.";

export const PENDING_LOGIN_TTL_SECONDS = 120;

/**
 * Owner-only login, phase 1 of 2. Verifies email + password, never touching
 * the TOTP secret: every failure mode returns the identical generic message
 * (no user enumeration), bcrypt always runs so timing stays uniform, and
 * per-IP + per-email budgets throttle brute force. On success it issues a
 * short-lived, one-shot pending login for the code step.
 */
export async function beginOwnerLogin(opts: {
  request: NextRequest;
  store: PendingLoginStore;
  email: string;
  password: string;
}): Promise<{ pendingId: string; ip: string }> {
  const env = getEnv();
  const ip = clientIp(opts.request);
  await enforceRateLimit(opts.request, {
    prefix: "rl:login:ip",
    identifier: ip,
    limit: 20,
    windowSeconds: 900,
    failClosed: true,
  });
  await enforceRateLimit(opts.request, {
    prefix: "rl:login:email",
    identifier: opts.email,
    limit: 5,
    windowSeconds: 900,
    failClosed: true,
  });

  const normalizedEmail = opts.email.trim().toLowerCase();
  const emailMatches = normalizedEmail === env.OWNER_EMAIL;
  // Always run bcrypt so unknown-email and wrong-password take ~equal time.
  const passwordOk = await verifyPassword(opts.password, env.OWNER_PASSWORD_HASH);

  if (!emailMatches || !passwordOk) {
    throw unauthorized("invalid_credentials", GENERIC);
  }

  const pendingId = newPendingId();
  const record: PendingLogin = { email: normalizedEmail, ip, createdAt: Date.now() };
  await opts.store.create(pendingId, record, PENDING_LOGIN_TTL_SECONDS);
  return { pendingId, ip };
}

/**
 * Owner-only login, phase 2 of 2. Accepts a pending login plus the TOTP code.
 * The pending record is one-shot (consumed via Redis `getdel`) and ip-bound,
 * so the code cannot be replayed or used from another client.
 */
export async function completeOwnerLogin(opts: {
  request: NextRequest;
  store: PendingLoginStore;
  pendingId: string;
  totpCode: string;
}): Promise<OwnerPrincipal> {
  const env = getEnv();
  const ip = clientIp(opts.request);
  await enforceRateLimit(opts.request, {
    prefix: "rl:login:totp",
    identifier: ip,
    limit: 5,
    windowSeconds: 300,
    failClosed: true,
  });

  const pending = await opts.store.consume(opts.pendingId);
  if (!pending || pending.email !== env.OWNER_EMAIL || pending.ip !== ip) {
    throw new HttpError(400, "invalid_code", CODE_ERROR);
  }
  const totpOk = verifyTotp(env.OWNER_TOTP_SECRET, opts.totpCode);
  if (!totpOk) {
    throw new HttpError(400, "invalid_code", CODE_ERROR);
  }
  return { id: "owner", role: "owner", email: env.OWNER_EMAIL };
}