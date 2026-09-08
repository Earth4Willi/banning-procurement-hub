import { NextRequest, NextResponse } from "next/server";
import { createRedis } from "@/server/redis";
import { readSession, RedisSessionStore, SESSION_COOKIE } from "@/server/session";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  // No cookie short-circuits before touching Redis, so /me stays fast and
  // env-independent for signed-out visitors.
  if (!sessionId) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Not signed in." } }, { status: 401 });
  }
  const principal = await readSession(new RedisSessionStore(createRedis()), sessionId);
  if (!principal) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Not signed in." } }, { status: 401 });
  }
  return NextResponse.json({ email: principal.email, role: principal.role });
});