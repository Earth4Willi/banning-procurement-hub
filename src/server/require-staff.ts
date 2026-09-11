import type { NextRequest } from "next/server";
import { devOwnerPrincipal } from "./dev-owner";
import { createRedis } from "./redis";
import {
  readSession,
  RedisSessionStore,
  SESSION_COOKIE,
  type OwnerPrincipal,
  type StaffPrincipal,
} from "./session";
import { findStaffById } from "./staff-store";
import { hasScope, type StaffScope } from "./staff-scopes";

export type AdminPrincipal = OwnerPrincipal | StaffPrincipal;

/**
 * Resolves an admin principal (owner or active staff) from the request cookie.
 * Applies the same customer-facing protections as require-owner and, for staff,
 * additionally:
 *  - checks the staff row still exists and is active (deactivation takes
 *    effect immediately, not at session expiry);
 *  - enforces scope when a required scope is supplied — the owner bypasses
 *    scope checks as the implicit superuser.
 */
export async function requireStaff(
  request: NextRequest,
  requiredScopes: StaffScope[] = [],
): Promise<AdminPrincipal | null> {
  const dev = devOwnerPrincipal(request);
  if (dev) return dev;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const principal = await readSession(new RedisSessionStore(createRedis()), sessionId);
  if (!principal) return null;

  if (principal.role === "owner") return principal;

  if (principal.role === "staff") {
    const staff = await findStaffById(principal.id);
    if (!staff || !staff.active) return null;
    if (requiredScopes.length > 0 && !requiredScopes.every((scope) => hasScope(staff.scopes, scope))) {
      return null;
    }
    return principal;
  }

  return null;
}