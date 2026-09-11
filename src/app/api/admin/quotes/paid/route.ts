import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { emailConfigured, quoteStatusForCustomer, sendEmail } from "@/server/notify";
import { ensureQuoteToken, getQuote, setQuotePaid } from "@/server/quote-store";
import { verifySameOrigin } from "@/server/csrf";
import { requireStaff } from "@/server/require-staff";
import { parseBody, quotePaidSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireStaff(request, ["messages"]);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Admin sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  const body = await parseBody(request, quotePaidSchema);
  const result = await setQuotePaid(body.id, body.method);
  if (!result.ok) {
    if (result.error === "state") {
      return NextResponse.json(
        { error: { code: "invalid_state", message: "Only reviewed or won quotes can be marked paid." } },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — quote not updated." } },
      { status: 503 },
    );
  }
  await audit("quote_receipted", { id: body.id, method: body.method });

  const quote = await getQuote(body.id);
  if (quote?.email && emailConfigured()) {
    const token = quote.doc_token ?? (await ensureQuoteToken(body.id));
    if (token) {
      void sendEmail(
        quoteStatusForCustomer(quote.email, {
          reference: quote.reference,
          name: quote.name,
          area: quote.area,
          itemCount: quote.items.length,
          status: "won",
          docUrl: `${process.env.APP_ORIGIN ?? "https://banningprocurementhub.com"}/quote/${token}`,
        }),
      );
    }
  }

  return NextResponse.json({ ok: true });
});
