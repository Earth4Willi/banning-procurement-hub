import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { verifySameOrigin } from "@/server/csrf";
import { upsertCustomer } from "@/server/customer-store";
import { persistMessage } from "@/server/message-store";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { submitViaWeb3Forms, web3FormsConfigured } from "@/lib/forms";
import { contactSubmitSchema, parseBody } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public contact message. Persisted to the `messages` table when the live
 * project is configured, mirrored to the customer record by phone, and
 * delivered to the inbox by Web3Forms as a best-effort email.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const rateHeaders = await enforceRateLimit(request, {
    prefix: "rl:contact",
    identifier: clientIp(request),
    limit: 10,
    windowSeconds: 60,
  });
  verifySameOrigin(request);

  const body = await parseBody(request, contactSubmitSchema);
  const message = body.message ?? "(no message)";
  const persisted = await persistMessage({
    name: body.name,
    phone: body.phone,
    email: body.email,
    area: body.area,
    message,
  });
  if (persisted) {
    await upsertCustomer(body.phone, { name: body.name, email: body.email });
  }
  await audit("contact_message", {
    name: body.name,
    phone: body.phone,
    persisted,
  });

  let emailed = false;
  if (web3FormsConfigured()) {
    const result = await submitViaWeb3Forms({
      name: body.name,
      phone: body.phone,
      email: body.email,
      area: body.area,
      message,
      subject: "Contact message — Banning Procurement Hub",
    });
    emailed = result.ok;
  }

  return NextResponse.json({ ok: true, emailed }, { status: 202, headers: rateHeaders });
});