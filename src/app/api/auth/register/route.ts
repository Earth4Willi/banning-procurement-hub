import { NextRequest, NextResponse } from "next/server";
import { registerCustomer } from "@/server/customer-auth";
import { verifySameOrigin } from "@/server/csrf";
import { createRedis } from "@/server/redis";
import { createSession, RedisSessionStore, sessionCookieConfig } from "@/server/session";
import { parseBody, registerSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, registerSchema);
  const user = await registerCustomer({
    request,
    name: body.name,
    email: body.email,
    phone: body.phone,
    password: body.password,
    area: body.area,
    address: body.address,
  });
  const sessionId = await createSession(new RedisSessionStore(createRedis()), {
    id: user.id,
    role: "customer",
    email: user.email,
    name: user.name,
    phone: user.phone,
  });
  const response = NextResponse.json({ ok: true, user }, { status: 201 });
  response.cookies.set(sessionCookieConfig(sessionId));
  return response;
});