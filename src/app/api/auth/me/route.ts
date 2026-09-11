import { NextRequest, NextResponse } from "next/server";
import { devOwnerPrincipal } from "@/server/dev-owner";
import { avatarPublicUrl } from "@/server/profile-image";
import { createRedis } from "@/server/redis";
import { readSession, RedisSessionStore, SESSION_COOKIE } from "@/server/session";
import { findUserById } from "@/server/user-store";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const avatarUrl = avatarPublicUrl();
  const dev = devOwnerPrincipal(request);
  if (dev) {
    return NextResponse.json({ email: dev.email, role: dev.role, avatarUrl });
  }
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
  if (principal.role === "customer") {
    const profile = await findUserById(principal.id);
    return NextResponse.json({
      role: "customer",
      email: principal.email,
      name: principal.name,
      phone: principal.phone,
      area: profile?.area ?? "",
      address: profile?.address ?? "",
    });
  }
  if (principal.role === "staff") {
    return NextResponse.json({
      role: "staff",
      email: principal.email,
      name: principal.name,
      scopes: principal.scopes,
    });
  }
  return NextResponse.json({ email: principal.email, role: principal.role, avatarUrl });
});