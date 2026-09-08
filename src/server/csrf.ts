import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { forbidden } from "./http-error";

function originMatches(expected: URL, origin: string): boolean {
  try {
    const incoming = new URL(origin);
    return (
      incoming.protocol === expected.protocol &&
      incoming.hostname === expected.hostname &&
      incoming.port === expected.port
    );
  } catch {
    return false;
  }
}

/**
 * CSRF guard for state-changing routes. SameSite=Lax cookies already block
 * cross-site POSTs in modern browsers; this defends the remaining surface.
 * A missing Origin on a non-safe method is rejected; safe methods pass.
 */
export function verifySameOrigin(request: NextRequest): void {
  const method = request.method.toUpperCase();
  const safe = ["GET", "HEAD", "OPTIONS"].includes(method);
  const origin = request.headers.get("origin");
  if (origin === null) {
    if (!safe) {
      throw forbidden("csrf", "This action requires a same-origin request.");
    }
    return;
  }
  if (!originMatches(new URL(getEnv().APP_ORIGIN), origin)) {
    throw forbidden("csrf", "This action requires a same-origin request.");
  }
}