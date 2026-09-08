import { NextRequest, NextResponse } from "next/server";
import { beginOwnerLogin } from "@/server/auth";
import { verifySameOrigin } from "@/server/csrf";
import { RedisPendingLoginStore } from "@/server/pending-login";
import { createRedis } from "@/server/redis";
import { loginCredentialsSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  verifySameOrigin(request);
  const body = await parseBody(request, loginCredentialsSchema);
  const { pendingId } = await beginOwnerLogin({
    request,
    store: new RedisPendingLoginStore(createRedis()),
    email: body.email,
    password: body.password,
  });
  return NextResponse.json({ step: "code", pendingId });
});