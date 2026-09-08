import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { unauthorized } from "./http-error";
import { verifyPassword } from "./passwords";
import { clientIp, enforceRateLimit } from "./rate-limit";
import type { OwnerPrincipal } from "./session";
import { verifyTotp } from "./totp";

const GENERIC = "Invalid email, password, or code.";

export function ownerPrincipal(id = "owner"): OwnerPrincipal {
  return { id, role: "owner", email: getEnv().OWNER_EMAIL };
}

/**
 * Owner-only login. Every failure mode returns the identical generic message
 * (no user enumeration), timing is kept uniform by always running bcrypt, and
 * per-IP + per-email budgets throttle brute force before verification.
 */
export async function loginWithPassword(opts: {
  request: NextRequest;
  email: string;
  password: string;
  totpCode: string;
}): Promise<OwnerPrincipal> {
  const env = getEnv();
  const ip = clientIp(opts.request);
  await enforceRateLimit(opts.request, {
    prefix: "rl:login:ip",
    identifier: ip,
    limit: 20,
    windowSeconds: 900,
  });
  await enforceRateLimit(opts.request, {
    prefix: "rl:login:email",
    identifier: opts.email,
    limit: 5,
    windowSeconds: 900,
  });

  const normalizedEmail = opts.email.trim().toLowerCase();
  const emailMatches = normalizedEmail === env.OWNER_EMAIL;
  // Always run bcrypt and TOTP so unknown-email and wrong-password take ~equal time.
  const passwordOk = await verifyPassword(opts.password, env.OWNER_PASSWORD_HASH);
  const totpOk = verifyTotp(env.OWNER_TOTP_SECRET, opts.totpCode);

  if (!emailMatches || !passwordOk || !totpOk) {
    throw unauthorized("invalid_credentials", GENERIC);
  }
  return ownerPrincipal();
}