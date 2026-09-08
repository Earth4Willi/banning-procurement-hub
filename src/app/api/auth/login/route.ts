import { NextRequest, NextResponse } from "next/server";
import { loginWithPassword } from "@/server/auth";
import { verifySameOrigin } from "@/server/csrf";
import { createRedis } from "@/server/redis";
import { createSession, RedisSessionStore, sessionCookieConfig } from "@/server/session";
import { loginSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, loginSchema);
  const principal = await loginWithPassword({
    request,
    email: body.email,
    password: body.password,
    totpCode: body.totpCode,
  });
  const sessionId = await createSession(new RedisSessionStore(createRedis()), principal);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(sessionCookieConfig(sessionId));
  return response;
});