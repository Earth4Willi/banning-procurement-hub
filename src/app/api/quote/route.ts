import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { parseBody, quoteSubmitSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exemplar public route proving the security floor. No persistence yet:
 * quote data still flows through the WhatsApp handoff on the client.
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
  await audit("quote_submitted", {
    reference,
    itemCount: body.items.length,
    area: body.area,
  });

  return NextResponse.json({ ok: true, reference }, { status: 202, headers: rateHeaders });
});