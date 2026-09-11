import { NextRequest, NextResponse } from "next/server";
import { completeOwnerLogin } from "@/server/auth";
import { verifySameOrigin } from "@/server/csrf";
import { RedisPendingLoginStore } from "@/server/pending-login";
import { createRedis } from "@/server/redis";
import { createSession, RedisSessionStore, sessionCookieConfig } from "@/server/session";
import { completeStaffLogin } from "@/server/staff-auth";
import { createStaffSession } from "@/server/staff-session";
import { parseBody, verifyLoginSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, verifyLoginSchema);
  const store = new RedisPendingLoginStore(createRedis());

  // The pending kind (owner vs staff) decides which completer runs; peek before
  // consuming so the wrong completer never claims (and thereby burns) a pending
  // login issued for the other role.
  const pending = await store.peek(body.pendingId);

  if (pending?.kind === "staff") {
    const principal = await completeStaffLogin({
      request,
      store,
      pendingId: body.pendingId,
      totpCode: body.totpCode,
    });
    const sessionId = await createStaffSession(principal);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(sessionCookieConfig(sessionId));
    return response;
  }

  const principal = await completeOwnerLogin({
    request,
    store,
    pendingId: body.pendingId,
    totpCode: body.totpCode,
  });
  const sessionId = await createSession(new RedisSessionStore(createRedis()), principal);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(sessionCookieConfig(sessionId));
  return response;
});