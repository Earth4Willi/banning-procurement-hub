import { NextRequest, NextResponse } from "next/server";
import { beginOwnerLogin } from "@/server/auth";
import { verifySameOrigin } from "@/server/csrf";
import { getEnv } from "@/server/env";
import { RedisPendingLoginStore } from "@/server/pending-login";
import { createRedis } from "@/server/redis";
import { sessionCookieConfig } from "@/server/session";
import { beginStaffLogin } from "@/server/staff-auth";
import { createStaffSession } from "@/server/staff-session";
import { loginCredentialsSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, loginCredentialsSchema);
  const normalizedEmail = body.email.trim().toLowerCase();
  const isOwner = normalizedEmail === getEnv().OWNER_EMAIL;

  if (isOwner) {
    const { pendingId } = await beginOwnerLogin({
      request,
      store: new RedisPendingLoginStore(createRedis()),
      email: body.email,
      password: body.password,
    });
    return NextResponse.json({ step: "code", pendingId });
  }

  // Staff email: single-step session when no TOTP is configured, otherwise the
  // same two-phase code flow as the owner.
  const staff = await beginStaffLogin({
    request,
    store: new RedisPendingLoginStore(createRedis()),
    email: body.email,
    password: body.password,
  });
  if (staff.step === "code") {
    return NextResponse.json({ step: "code", pendingId: staff.pendingId });
  }
  const sessionId = await createStaffSession({
    id: staff.staffId,
    role: "staff",
    email: staff.email,
    name: staff.name,
    scopes: staff.scopes,
  });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(sessionCookieConfig(sessionId));
  return response;
});