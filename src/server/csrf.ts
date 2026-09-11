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
 *
 * Expected origins = the configured APP_ORIGIN *plus* the request's own Host
 * header. Host-based acceptance lets temporary/preview URLs (e.g. a Vercel
 * alias that predates a custom domain) operate without weakening the check:
 * the Origin must still equal the host the browser is actually on, so a
 * cross-site attacker's page can never pass.
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
  const expected: URL[] = [new URL(getEnv().APP_ORIGIN)];
  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    try {
      expected.push(new URL(`${proto}://${host}`));
    } catch {
      // malformed Host header — ignore; APP_ORIGIN still applies
    }
  }
  const matches = expected.some((candidate) => originMatches(candidate, origin));
  if (!matches) {
    throw forbidden("csrf", "This action requires a same-origin request.");
  }
}