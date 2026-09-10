import type { NextRequest } from "next/server";
import { createRedis } from "./redis";
import {
  readSession,
  RedisSessionStore,
  SESSION_COOKIE,
  type CustomerPrincipal,
} from "./session";

/**
 * Resolves the customer principal from the request cookie, or null. Account
 * routes short-circuit on the missing cookie before touching Redis so
 * unauthenticated probe traffic stays cheap.
 */
export async function requireCustomer(request: NextRequest): Promise<CustomerPrincipal | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const principal = await readSession(new RedisSessionStore(createRedis()), sessionId);
  return principal && principal.role === "customer" ? principal : null;
}