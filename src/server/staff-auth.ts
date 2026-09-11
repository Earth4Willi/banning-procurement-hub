import type { NextRequest } from "next/server";
import { HttpError, unauthorized } from "./http-error";
import { newPendingId, type PendingLogin, type PendingLoginStore } from "./pending-login";
import { verifyPassword } from "./passwords";
import { clientIp, enforceRateLimit } from "./rate-limit";
import type { StaffPrincipal } from "./session";
import { findStaffByEmailWithPassword, findStaffByIdWithTotpSecret } from "./staff-store";
import { verifyTotp } from "./totp";

export const STAFF_GENERIC = "Invalid email or password.";
export const STAFF_CODE_ERROR = "Invalid or expired code.";

// Sentinel bcrypt hash so unknown-email lookups burn the same bcrypt time as
// a real credential check (uniform timing, no user enumeration via latency).
const SENTINEL_HASH = "$2b$12$.Z5omdWORHD2CKVw5fh3h.5qoEqwjHQjKmKDwPbNESz9lw5IR0r.K";

/**
 * Staff login, phase 1 of 2. Verifies email + password. Unlike the owner whose
 * TOTP secret lives in env, a staff member's secret is optional: staff without
 * two-factor authentication skip the code step entirely and get a session
 * token immediately. Same no-enumeration, uniform-bcrypt practice as the owner
 * path (every failure returns the identical generic message).
 */
export async function beginStaffLogin(opts: {
  request: NextRequest;
  store: PendingLoginStore;
  email: string;
  password: string;
}): Promise<{ step: "code"; pendingId: string } | { step: "session"; staffId: string; email: string; name: string; scopes: string[] }> {
  const ip = clientIp(opts.request);
  const normalizedEmail = opts.email.trim().toLowerCase();
  await enforceRateLimit(opts.request, {
    prefix: "rl:staff-login:ip",
    identifier: ip,
    limit: 20,
    windowSeconds: 900,
    failClosed: true,
  });
  await enforceRateLimit(opts.request, {
    prefix: "rl:staff-login:email",
    identifier: normalizedEmail,
    limit: 5,
    windowSeconds: 900,
    failClosed: true,
  });

  const staff = await findStaffByEmailWithPassword(normalizedEmail);
  if (!staff) {
    // Burn a bcrypt round on a sentinel so unknown-email timing stays uniform.
    await verifyPassword(opts.password, SENTINEL_HASH);
    throw unauthorized("invalid_credentials", STAFF_GENERIC);
  }
  if (!staff.active) {
    throw unauthorized("invalid_credentials", STAFF_GENERIC);
  }
  const passwordOk = await verifyPassword(opts.password, staff.passwordHash);
  if (!passwordOk) {
    throw unauthorized("invalid_credentials", STAFF_GENERIC);
  }

  // No TOTP configured → single-step login: hand back a principal the route can
  // turn into a session directly.
  if (!staff.totpSecret) {
    return { step: "session", staffId: staff.id, email: staff.email, name: staff.name, scopes: staff.scopes };
  }

  const pendingId = newPendingId();
  const record: PendingLogin = {
    kind: "staff",
    staffId: staff.id,
    email: staff.email,
    ip,
    createdAt: Date.now(),
  };
  const PENDING_LOGIN_TTL_SECONDS = 120;
  await opts.store.create(pendingId, record, PENDING_LOGIN_TTL_SECONDS);
  return { step: "code", pendingId };
}

/**
 * Staff login, phase 2 of 2 (staff with TOTP). Consumes the one-shot pending
 * login and verifies the code against the staff member's own secret.
 */
export async function completeStaffLogin(opts: {
  request: NextRequest;
  store: PendingLoginStore;
  pendingId: string;
  totpCode: string;
}): Promise<StaffPrincipal> {
  const ip = clientIp(opts.request);
  await enforceRateLimit(opts.request, {
    prefix: "rl:staff-login:totp",
    identifier: ip,
    limit: 5,
    windowSeconds: 300,
    failClosed: true,
  });

  const pending = await opts.store.consume(opts.pendingId);
  if (!pending || pending.kind !== "staff" || pending.ip !== ip || !pending.staffId) {
    throw new HttpError(400, "invalid_code", STAFF_CODE_ERROR);
  }
  const staff = await findStaffByIdWithTotpSecret(pending.staffId);
  if (!staff || !staff.active || !staff.totpSecret) {
    throw new HttpError(400, "invalid_code", STAFF_CODE_ERROR);
  }
  const totpOk = verifyTotp(staff.totpSecret, opts.totpCode);
  if (!totpOk) {
    throw new HttpError(400, "invalid_code", STAFF_CODE_ERROR);
  }
  return {
    id: staff.id,
    role: "staff",
    email: staff.email,
    name: staff.name,
    scopes: staff.scopes,
  };
}