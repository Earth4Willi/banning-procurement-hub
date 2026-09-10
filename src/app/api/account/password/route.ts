import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { HttpError, unauthorized } from "@/server/http-error";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { createRedis } from "@/server/redis";
import { requireCustomer } from "@/server/require-customer";
import { RedisSessionStore, rotateSession, SESSION_COOKIE, sessionCookieConfig } from "@/server/session";
import { findUserByIdWithPassword, updateCustomerPasswordHash } from "@/server/user-store";
import { changePasswordSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireCustomer(request);
  if (!principal) throw unauthorized();
  const body = await parseBody(request, changePasswordSchema);

  const user = await findUserByIdWithPassword(principal.id);
  if (!user) {
    // Unknown guard: keep timing uniform even when the account vanished.
    await verifyPassword(body.currentPassword, "$2a$12$" + "x".repeat(53));
    throw unauthorized("invalid_credentials", "Current password is incorrect.");
  }
  const currentOk = await verifyPassword(body.currentPassword, user.password_hash);
  if (!currentOk) {
    throw unauthorized("invalid_credentials", "Current password is incorrect.");
  }

  const newHash = await hashPassword(body.newPassword);
  const updated = await updateCustomerPasswordHash(user.id, newHash);
  if (!updated) {
    throw new HttpError(500, "internal", "Something went wrong.");
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const newId = await rotateSession(new RedisSessionStore(createRedis()), sessionId, principal);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieConfig(newId));
  await audit("password_changed", { userId: user.id });
  return response;
});