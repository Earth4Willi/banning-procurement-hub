import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/server/passwords";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { badRequest } from "@/server/http-error";
import { requireOwner } from "@/server/require-owner";
import { createStaff, listStaff } from "@/server/staff-store";
import { parseBody, staffCreateSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(request: NextRequest) {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  return null;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const staff = await listStaff();
  return NextResponse.json({ staff });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, staffCreateSchema);
  const passwordHash = await hashPassword(body.password, 12);
  const member = await createStaff({
    email: body.email,
    name: body.name,
    passwordHash,
    scopes: body.scopes,
    totpSecret: body.totpSecret ?? null,
  });
  if (!member) {
    return NextResponse.json(
      { error: { code: "duplicate", message: "A staff account with that email already exists." } },
      { status: 409 },
    );
  }
  await audit("staff_created", { id: member.id, email: member.email, scopes: member.scopes });
  return NextResponse.json({ ok: true, staff: member }, { status: 201 });
});