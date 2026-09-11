import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { acceptQuoteWithInventory, getQuote, reverseQuoteOrder, setQuoteStatus, type QuoteStatus } from "@/server/quote-store";
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
  const status = body.status as QuoteStatus;

  if (status === "won") {
    const result = await acceptQuoteWithInventory(body.id, principal.email ?? "owner");
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: "stock_unavailable", message: result.error, details: result.shortLines } },
        { status: 400 },
      );
    }
    await audit("quote_status_updated", { id: body.id, status: "won" });
    return NextResponse.json({ ok: true });
  }

  // Reaching here means a non-"won" status is requested. If the quote is
  // currently "won", reverse the inventory deduction before flipping so stock
  // stays consistent with the quote's state.
  const current = await getQuote(body.id);
  if (!current) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Quote not found." } },
      { status: 404 },
    );
  }
  if (current.status === "won") {
    const reversed = await reverseQuoteOrder(body.id, principal.email ?? "owner", status);
    if (!reversed.ok) {
      return NextResponse.json(
        { error: { code: "update_failed", message: reversed.error } },
        { status: 502 },
      );
    }
    await audit("quote_status_updated", { id: body.id, status, inventoryReversed: true });
    return NextResponse.json({ ok: true });
  }

  const updated = await setQuoteStatus(body.id, status);
  if (!updated) {
    return NextResponse.json(
      { error: { code: "update_failed", message: "Quote status could not be updated." } },
      { status: 502 },
    );
  }
  await audit("quote_status_updated", { id: body.id, status });

  return NextResponse.json({ ok: true });
});