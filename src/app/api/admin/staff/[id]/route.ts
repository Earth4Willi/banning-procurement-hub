import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { hashPassword } from "@/server/passwords";
import { requireOwner } from "@/server/require-owner";
import { revokeAllStaffSessions } from "@/server/staff-session";
import { deleteStaff, updateStaff, type StaffPatch } from "@/server/staff-store";
import { catalogItemIdSchema, parseBody, staffUpdateSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const owner = await requireOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);

  const body = await parseBody(request, staffUpdateSchema);
  const patch: StaffPatch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.scopes !== undefined) patch.scopes = body.scopes;
  if (body.active !== undefined) patch.active = body.active;
  if (body.password !== undefined) patch.passwordHash = await hashPassword(body.password, 12);
  if (body.totpSecret !== undefined) patch.totpSecret = body.totpSecret === "" ? null : body.totpSecret;

  const ok = await updateStaff(body.id, patch);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Staff member could not be updated." } },
      { status: 502 },
    );
  }

  // Deactivation / password reset / TOTP change should kill live sessions so
  // the new rules apply immediately.
  if (body.active === false || body.password !== undefined || body.totpSecret !== undefined) {
    await revokeAllStaffSessions(body.id);
  }

  await audit("staff_updated", { id: body.id, ...patch });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const owner = await requireOwner(request);
  if (!owner) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);

  const body = await parseBody(request, catalogItemIdSchema);
  await revokeAllStaffSessions(body.id);
  const ok = await deleteStaff(body.id);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Staff member could not be removed." } },
      { status: 502 },
    );
  }
  await audit("staff_deleted", { id: body.id });
  return NextResponse.json({ ok: true });
});