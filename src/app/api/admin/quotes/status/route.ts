import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { setQuoteStatus, type QuoteStatus } from "@/server/quote-store";
import { requireOwner } from "@/server/require-owner";
import { parseBody, adminQuoteStatusSchema } from "@/server/validate";
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

  const body = await parseBody(request, adminQuoteStatusSchema);
  const updated = await setQuoteStatus(body.id, body.status as QuoteStatus);
  if (!updated) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Quote status could not be updated." } },
      { status: 502 },
    );
  }
  await audit("quote_status_updated", { id: body.id, status: body.status });

  return NextResponse.json({ ok: true });
});