import { NextRequest, NextResponse } from "next/server";
import { audit, getSupabaseClient } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { conflict, HttpError } from "@/server/http-error";
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
  if (!principal) throw new HttpError(401, "unauthorized", "Authentication required.");
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
  if (!principal) throw new HttpError(401, "unauthorized", "Authentication required.");
  verifySameOrigin(request);
  const patch = await parseBody(request, accountProfileSchema);

  const client = getSupabaseClient();
  if (client) {
    if (patch.email !== undefined && patch.email !== principal.email) {
      const { data } = await client
        .from("users")
        .select("id")
        .eq("email", patch.email)
        .neq("id", principal.id)
        .maybeSingle();
      if (data) throw conflict("email");
    }
    if (patch.phone !== undefined && patch.phone !== principal.phone) {
      const { data } = await client
        .from("users")
        .select("id")
        .eq("phone", patch.phone)
        .neq("id", principal.id)
        .maybeSingle();
      if (data) throw conflict("phone");
    }
  }

  const ok = await updateCustomerProfile(principal.id, patch);
  if (!ok) {
    console.error("[profile] updateCustomerProfile failed for", principal.id);
    throw new HttpError(503, "storage_unavailable", "Profile update failed — database unavailable.");
  }

  const updated = await findUserById(principal.id);
  if (!updated) {
    console.error("[profile] findUserById failed after update for", principal.id);
    throw new HttpError(503, "storage_unavailable", "Profile update failed — database unavailable.");
  }

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