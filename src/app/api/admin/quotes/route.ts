import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { ensureQuoteToken, isQuoteStoreAvailable, listQuotes, persistQuote, updateQuote } from "@/server/quote-store";
import { verifySameOrigin } from "@/server/csrf";
import { requireOwner } from "@/server/require-owner";
import { manualQuoteSchema, parseBody, quoteUpdateSchema } from "@/server/validate";
import { withErrorHandling } from "@/server/with-error-handling";
import { computeTotals } from "@/lib/quote-document";

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
  const phone = searchParams.get("phone") ?? undefined;
  const quotes = await listQuotes(100, phone);
  return NextResponse.json({ quotes, dbAvailable: isQuoteStoreAvailable() });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  const body = await parseBody(request, manualQuoteSchema);
  const reference = randomBytes(6).toString("hex");
  const persisted = await persistQuote({ reference, source: "whatsapp", ...body, items: [] });
  if (!persisted) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — quote not stored." } },
      { status: 503 },
    );
  }
  await audit("quote_manual_added", { reference, area: body.area });
  return NextResponse.json({ ok: true, reference }, { status: 201 });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const principal = await requireOwner(request);
  if (!principal) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Owner sign-in required." } },
      { status: 403 },
    );
  }
  verifySameOrigin(request);
  const body = await parseBody(request, quoteUpdateSchema);
  const fields = Object.keys(body).filter((key) => key !== "id");
  if (fields.length === 0) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Provide at least one field to update." } },
      { status: 400 },
    );
  }
  const patch: Parameters<typeof updateQuote>[1] = {
    name: body.name,
    phone: body.phone,
    email: body.email,
    area: body.area,
    note: body.note,
    items: body.items,
  };

  let priced = false;
  if (body.items?.some((item) => typeof item.unitPrice === "number")) {
    const totals = computeTotals(body.items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })));
    const token = await ensureQuoteToken(body.id);
    patch.totalAmount = totals.total;
    patch.validUntil = body.validUntil;
    if (token) patch.docToken = token;
    priced = true;
  } else if (body.validUntil !== undefined) {
    patch.validUntil = body.validUntil;
  }

  const ok = await updateQuote(body.id, patch);
  if (!ok) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Live database not configured — quote not updated." } },
      { status: 503 },
    );
  }
  await audit("quote_edited", { id: body.id, reference: body.name });
  if (priced) await audit("quote_priced", { id: body.id });
  return NextResponse.json({ ok: true });
});