import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/server/http-error";
import { listQuotesByUser } from "@/server/quote-store";
import { requireCustomer } from "@/server/require-customer";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireCustomer(request);
  if (!principal) throw unauthorized();
  const quotes = await listQuotesByUser(principal.id);
  const orders = quotes.map((quote) => ({
    reference: quote.reference,
    status: quote.status,
    created_at: quote.created_at,
    items: quote.items,
    totals: {
      amount: quote.total_amount,
      currency: "GHS",
    },
    payment_method: quote.payment_method,
    doc_link: quote.doc_token ? `/api/quote/${quote.doc_token}/document` : null,
  }));
  return NextResponse.json({ orders });
});