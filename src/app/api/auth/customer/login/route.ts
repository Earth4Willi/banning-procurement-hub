import { NextRequest, NextResponse } from "next/server";
import { loginCustomer } from "@/server/customer-auth";
import { verifySameOrigin } from "@/server/csrf";
import { createRedis } from "@/server/redis";
import { createSession, RedisSessionStore, sessionCookieConfig } from "@/server/session";
import { customerLoginSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, customerLoginSchema);
  const principal = await loginCustomer({
    request,
    email: body.email,
    password: body.password,
  });
  const sessionId = await createSession(new RedisSessionStore(createRedis()), principal);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieConfig(sessionId));
  return response;
});