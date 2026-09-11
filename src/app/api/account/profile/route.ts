import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { unauthorized } from "@/server/http-error";
import { createRedis } from "@/server/redis";
import { requireCustomer } from "@/server/require-customer";
import {
  RedisSessionStore,
  rotateSession,
  SESSION_COOKIE,
  sessionCookieConfig,
} from "@/server/session";
import { findUserById, updateCustomerProfile } from "@/server/user-store";
import { accountProfileSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireCustomer(request);
  if (!principal) throw unauthorized();
  const profile = await findUserById(principal.id);
  return NextResponse.json({
    role: "customer",
    email: principal.email,
    name: principal.name,
    phone: principal.phone,
    area: profile?.area ?? "",
    address: profile?.address ?? "",
  });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireCustomer(request);
  if (!principal) throw unauthorized();
  verifySameOrigin(request);
  const patch = await parseBody(request, accountProfileSchema);

  const ok = await updateCustomerProfile(principal.id, patch);
  if (!ok) throw unauthorized();

  const updated = await findUserById(principal.id);
  if (!updated) throw unauthorized();

  const response = NextResponse.json({ ok: true, user: updated });
  const emailChanged = patch.email !== undefined && patch.email !== principal.email;
  const phoneChanged = patch.phone !== undefined && patch.phone !== principal.phone;
  if (emailChanged || phoneChanged) {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const newId = await rotateSession(new RedisSessionStore(createRedis()), sessionId, {
      id: updated.id,
      role: "customer",
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
    });
    response.cookies.set(sessionCookieConfig(newId));
  }
  await audit("profile_updated", { userId: principal.id, email: updated.email });
  return response;
});