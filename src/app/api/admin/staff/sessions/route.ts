import { NextRequest, NextResponse } from "next/server";
import { verifySameOrigin } from "@/server/csrf";
import { requireStaff } from "@/server/require-staff";
import { listStaffSessions, revokeAllStaffSessions } from "@/server/staff-session";
import { listStaff } from "@/server/staff-store";
import { catalogItemIdSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exposes the active sessions of every staff member (owner) or the caller (staff). */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, []);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }

  if (principal.role === "owner") {
    const members = await listStaff();
    const sessions = await Promise.all(
      members.map(async (member) => ({ staffId: member.id, email: member.email, name: member.name, sessions: await listStaffSessions(member.id) })),
    );
    return NextResponse.json({ dbAvailable: true, sessions });
  }
  const sessions = await listStaffSessions(principal.id);
  return NextResponse.json({ dbAvailable: true, sessions: [{ staffId: principal.id, email: principal.email, name: principal.name, sessions }] });
});

/** Revokes all sessions for a staff member (owner) or the caller's own sessions. */
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, []);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  const body = await parseBody(request, catalogItemIdSchema);
  if (principal.role === "owner") {
    const revoked = await revokeAllStaffSessions(body.id);
    return NextResponse.json({ ok: true, revoked });
  }
  // Staff may end their own other sessions, not anyone else's.
  if (principal.id !== body.id) return NextResponse.json({ ok: false, revoked: 0 });
  const revoked = await revokeAllStaffSessions(principal.id);
  return NextResponse.json({ ok: true, revoked });
});