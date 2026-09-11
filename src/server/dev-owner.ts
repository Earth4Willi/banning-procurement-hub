import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { clientIp } from "./rate-limit";
import type { OwnerPrincipal } from "./session";

/**
 * Development-only owner bypass for the admin dashboard. Production ignores
 * it unconditionally: an attacker cannot set NODE_ENV=production + a flag on
 * the hosted platform, and this branch is a no-op there regardless.
 * In development the bypass only fires for loopback requests over HTTP.
 */
export function devOwnerPrincipal(request: NextRequest): OwnerPrincipal | null {
  const env = getEnv();
  if (env.NODE_ENV === "production") return null;
  if (env.DEV_OWNER_BYPASS !== "1" && env.DEV_OWNER_BYPASS !== "true") return null;
  const ip = clientIp(request);
  if (!/^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/i.test(ip)) return null;
  if (!env.APP_ORIGIN.startsWith("http://")) return null;
  return { id: "owner", role: "owner", email: env.OWNER_EMAIL };
}