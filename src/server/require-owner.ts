import type { NextRequest } from "next/server";
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
 * probe traffic stays cheap.
 */
export async function requireOwner(request: NextRequest): Promise<OwnerPrincipal | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return readSession(new RedisSessionStore(createRedis()), sessionId);
}