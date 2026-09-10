import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { findQuoteByToken, isQuoteStoreAvailable } from "@/server/quote-store";
import { audit } from "@/server/audit";
import { getSettings } from "@/server/settings-store";
import { computeTotals, formatValidUntil, money } from "@/lib/quote-document";
import type { BankDetails } from "@/lib/settings-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isQuoteStoreAvailable()) {
    return NextResponse.json(
      { error: { code: "storage_unavailable", message: "Database not configured." } },
      { status: 503 },
    );
  }

  const { token } = await params;
  const quote = await findQuoteByToken(token);
  if (!quote) notFound();

  let bankDetails: BankDetails = { bankName: "", accountName: "", accountNumber: "" };
  if (quote.payment_method === "bank") {
    try {
      const payments = await getSettings("payments");
      bankDetails = payments.bank;
    } catch {
      /* best-effort */
    }
  }

  void audit("doc_viewed", { token, reference: quote.reference });

  const showBank =
    quote.payment_method === "bank" &&
    (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber);
  const paidLabel =
    quote.status === "won" ? "Accepted" : quote.status === "lost" ? "Declined" : quote.status === "reviewed" ? "Reviewed" : "Pending";
  const hasPricing = quote.items.some((item) => typeof item.unitPrice === "number");
  const totals =
    quote.total_amount != null
      ? {
          subtotal: round2(quote.total_amount / 1.15),
          vat: round2(quote.total_amount - quote.total_amount / 1.15),
          total: quote.total_amount,
        }
      : hasPricing
        ? computeTotals(quote.items)
        : null;

  const rows = quote.items
    .map((item) => {
      const unitPrice = item.unitPrice;
      const priced = typeof unitPrice === "number";
      return `<tr>
        <td>${esc(item.label)}</td>
        <td align="right">${esc(item.quantity)}</td>
        ${hasPricing ? `<td align="right">${priced ? money(unitPrice) : "—"}</td>` : ""}
        ${hasPricing ? `<td align="right">${priced ? money(round2(unitPrice * item.quantity)) : "—"}</td>` : ""}
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(quote.paid_at ? "Receipt" : "Quotation")} ${esc(quote.reference)} — Banning Procurement Hub</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #fff; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d3d1a; padding-bottom: 16px; margin-bottom: 24px; }
  .brand-title { font-size: 22px; font-weight: 700; color: #0d3d1a; }
  .brand-sub { font-size: 13px; color: #64748b; margin-top: 4px; }
  .doc-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
  .pill { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: #f1f5f9; color: #334155; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; font-size: 14px; margin-bottom: 24px; color: #475569; }
  .meta b { color: #1e293b; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead th { text-align: left; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding: 8px; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  th.right, td.right { text-align: right; }
  .totals { margin-top: 16px; margin-left: auto; width: min(320px, 100%); font-size: 14px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
  .totals .grand { border-top: 2px solid #0d3d1a; margin-top: 4px; padding-top: 8px; font-weight: 700; color: #0d3d1a; font-size: 16px; }
  .bank { margin-top: 24px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 12px; padding: 16px; font-size: 14px; }
  .bank h3 { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 6px; }
  .foot { margin-top: 24px; font-size: 13px; color: #64748b; }
  @media print { body { background: none; } }
</style>
</head>
<body>
<div class="wrap">
  <header class="header">
    <div>
      <div class="brand-title">Banning Procurement Hub</div>
      <div class="brand-sub">Office location shared on request · Serving all 16 regions of Ghana</div>
      <div class="brand-sub">banning173@gmail.com · 055 885 0667</div>
    </div>
    <span class="pill">${paidLabel}</span>
  </header>

  <h1 class="doc-title">${esc(quote.paid_at ? "Receipt" : "Quotation")} ${esc(quote.reference)}</h1>

  <div class="meta">
    <div><b>Customer:</b> ${esc(quote.name)}</div>
    <div><b>Phone:</b> ${esc(quote.phone)}</div>
    ${quote.email ? `<div><b>Email:</b> ${esc(quote.email)}</div>` : ""}
    <div><b>Area:</b> ${esc(quote.area)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="right">Qty</th>
        ${hasPricing ? '<th class="right">Unit Price</th><th class="right">Line Total</th>' : ""}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${totals ? `<div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
    <div class="row"><span>VAT (15%)</span><span>${money(totals.vat)}</span></div>
    <div class="row grand"><span>Total</span><span>${money(totals.total)}</span></div>
  </div>` : ""}

  ${showBank ? `<div class="bank">
    <h3>Bank Transfer</h3>
    <p>Bank: ${esc(bankDetails.bankName)} · Account name: ${esc(bankDetails.accountName)} · Account number: ${esc(bankDetails.accountNumber)}</p>
  </div>` : ""}

  <p class="foot">
    ${quote.created_at ? `Issued ${new Date(quote.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : "Issue date unavailable"}
    ${quote.valid_until ? ` · Valid until ${formatValidUntil(quote.valid_until)}` : ""}
    ${quote.paid_at ? ` · Paid on ${new Date(quote.paid_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}${quote.payment_method ? ` via ${esc(quote.payment_method.replace("_", " "))}` : ""}` : ""}
  </p>
  <p class="foot">This document was issued by Banning Procurement Hub. For questions, reply to the email or call 055 885 0667.</p>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}