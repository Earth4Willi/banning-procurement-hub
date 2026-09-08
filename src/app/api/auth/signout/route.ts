import { NextRequest, NextResponse } from "next/server";
import { verifySameOrigin } from "@/server/csrf";
import { createRedis } from "@/server/redis";
import { RedisSessionStore, revokeSession, SESSION_COOKIE, sessionCookieConfig } from "@/server/session";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await revokeSession(new RedisSessionStore(createRedis()), sessionId);
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({ ...sessionCookieConfig(""), value: "", maxAge: 0 });
  return response;
});