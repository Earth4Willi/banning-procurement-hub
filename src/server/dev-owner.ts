import { getEnv } from "./env";
import type { OwnerPrincipal } from "./session";

/**
 * Development-only owner bypass for the admin dashboard. Production ignores
 * it unconditionally: an attacker cannot set NODE_ENV=production + a flag on
 * the hosted platform, and this branch is a no-op there regardless.
 */
export function devOwnerPrincipal(): OwnerPrincipal | null {
  const env = getEnv();
  if (env.NODE_ENV === "production") return null;
  if (env.DEV_OWNER_BYPASS !== "1" && env.DEV_OWNER_BYPASS !== "true") return null;
  return { id: "owner", role: "owner", email: env.OWNER_EMAIL };
}