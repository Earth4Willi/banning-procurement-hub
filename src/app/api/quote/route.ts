import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { persistQuote } from "@/server/quote-store";
import { requireCustomer } from "@/server/require-customer";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { parseBody, quoteSubmitSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public quote submission. The security floor guards every request; the
 * submission is persisted to Supabase when the live project is configured.
 * Returned status stays 202 with a reference id, which doubles as the
 * database row's unique reference for quotes persisted out-of-band later.
 * Customer sessions attach their account id so order history can follow;
 * a session that can't be resolved degrades to an anonymous quote.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const rateHeaders = await enforceRateLimit(request, {
    prefix: "rl:quote",
    identifier: clientIp(request),
    limit: 10,
    windowSeconds: 60,
  });
  verifySameOrigin(request);

  const body = await parseBody(request, quoteSubmitSchema);
  const reference = randomBytes(6).toString("hex");

  let userId: string | null = null;
  try {
    userId = (await requireCustomer(request))?.id ?? null;
  } catch (error) {
    console.warn("[quote] customer session check skipped:", error);
  }

  const persisted = await persistQuote({
    reference,
    source: "web",
    ...body,
    userId,
  });
  await audit("quote_submitted", {
    reference,
    itemCount: body.items.length,
    area: body.area,
    userId,
    persisted,
  });

  return NextResponse.json({ ok: true, reference }, { status: 202, headers: rateHeaders });
});