import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isQuoteStoreAvailable, listQuotes } from "@/server/quote-store";
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
  const quotes = await listQuotes(100);
  return NextResponse.json({ quotes, dbAvailable: isQuoteStoreAvailable() });
});