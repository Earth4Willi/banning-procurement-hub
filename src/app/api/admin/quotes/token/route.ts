import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureQuoteToken, getQuote } from "@/server/quote-store";
import { requireOwner } from "@/server/require-owner";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Provide an id query parameter." } },
      { status: 400 },
    );
  }
  const quote = await getQuote(id);
  if (!quote) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Quote not found." } },
      { status: 404 },
    );
  }
  const token = quote.doc_token ?? (await ensureQuoteToken(id));
  if (!token) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — could not mint token." } },
      { status: 503 },
    );
  }
  return NextResponse.json({ token });
});
