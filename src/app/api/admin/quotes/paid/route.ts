import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { setQuotePaid } from "@/server/quote-store";
import { verifySameOrigin } from "@/server/csrf";
import { requireOwner } from "@/server/require-owner";
import { parseBody, quotePaidSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  const body = await parseBody(request, quotePaidSchema);
  const ok = await setQuotePaid(body.id, body.method);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — quote not updated." } },
      { status: 503 },
    );
  }
  await audit("quote_receipted", { id: body.id, method: body.method });
  return NextResponse.json({ ok: true });
});
