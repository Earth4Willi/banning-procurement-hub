import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { emailConfigured, quoteStatusForCustomer, sendEmail } from "@/server/notify";
import { acceptQuoteWithInventory, ensureQuoteToken, getQuote, reverseQuoteOrder, setQuoteStatus, type QuoteStatus } from "@/server/quote-store";
import { requireStaff } from "@/server/require-staff";
import { parseBody, adminQuoteStatusSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function notifyCustomerStatus(quoteId: string): Promise<void> {
  try {
    const quote = await getQuote(quoteId);
    if (!quote?.email || !emailConfigured()) return;
    const token = await ensureQuoteToken(quoteId);
    if (!token) return;
    void sendEmail(
      quoteStatusForCustomer(quote.email, {
        reference: quote.reference,
        name: quote.name,
        area: quote.area,
        itemCount: quote.items.length,
        status: quote.status,
        docUrl: `${process.env.APP_ORIGIN ?? "https://banningprocurementhub.com"}/quote/${token}`,
      }),
    );
  } catch (error) {
    console.warn("[quotes/status] status notification skipped:", error);
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, ["messages"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
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
    await notifyCustomerStatus(body.id);
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
    await notifyCustomerStatus(body.id);
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
  await notifyCustomerStatus(body.id);

  return NextResponse.json({ ok: true });
});