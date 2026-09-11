import type { NextRequest } from "next/server";
import { devOwnerPrincipal } from "./dev-owner";
import { createRedis } from "./redis";
import {
  readSession,
  RedisSessionStore,
  SESSION_COOKIE,
  type OwnerPrincipal,
} from "./session";

/**
 * Resolves the owner principal from the request cookie, or null. Admin routes
 * short-circuit on the missing cookie before touching Redis so unauthenticated
 * probe traffic stays cheap. A development-only bypass flag returns the owner
 * without a session; production never honors it.
 */
export async function requireOwner(request: NextRequest): Promise<OwnerPrincipal | null> {
  const dev = devOwnerPrincipal(request);
  if (dev) return dev;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const principal = await readSession(new RedisSessionStore(createRedis()), sessionId);
  return principal && principal.role === "owner" ? principal : null;
}