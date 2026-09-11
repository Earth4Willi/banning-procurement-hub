import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { listCustomers, updateCustomer } from "@/server/customer-store";
import { verifySameOrigin } from "@/server/csrf";
import { isMessageStoreAvailable } from "@/server/message-store";
import { requireOwner } from "@/server/require-owner";
import { customerUpdateSchema, parseBody } from "@/server/validate";
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
  const customers = await listCustomers();
  return NextResponse.json({ customers, dbAvailable: await isMessageStoreAvailable() });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const blocked = await guard(request);
  if (blocked) return blocked;
  const body = await parseBody(request, customerUpdateSchema);
  const ok = await updateCustomer(body.phone, {
    notes: body.notes,
    status: body.status,
  });
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — customer not updated." } },
      { status: 503 },
    );
  }
  await audit("customer_updated", { phone: body.phone, status: body.status });
  return NextResponse.json({ ok: true });
});