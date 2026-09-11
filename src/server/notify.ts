import { getEnv, type ParsedEnv } from "./env";
import { siteConfig } from "@/lib/site";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Best-effort email delivery through Resend's REST API (free tier: 3,000
 * emails/mo, 100/day — see .env.example). The module follows the repo's
 * "degrade quietly" convention: without RESEND_API_KEY everything short-circuits
 * to `false` and the caller's flow is never blocked or crashed by mail.
 */
export function emailConfigured(): boolean {
  return Boolean(readEnv()?.RESEND_API_KEY);
}

export function emailFrom(): string {
  return readEnv()?.EMAIL_FROM ?? siteConfig.email;
}

function readEnv(): ParsedEnv | null {
  try {
    return getEnv();
  } catch {
    // Required env vars missing (e.g. tests, first local run). Email is
    // best-effort: degrade to disabled rather than crash the caller.
    return null;
  }
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const env = readEnv();
  if (!env?.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      console.warn(`[notify] resend rejected delivery (${res.status}): ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[notify] send failed:", error);
    return false;
  }
}

type QuoteRef = {
  reference: string;
  name: string;
  area: string;
  itemCount: number;
};

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6f2;font-family:Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f2;padding:24px">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(13,61,26,.08)">
          <tr><td style="background:#0d3d1a;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:700">${siteConfig.name}</td></tr>
          <tr><td style="padding:28px">
            <h1 style="margin:0 0 12px;font-size:20px;color:#0d3d1a">${title}</h1>
            ${body}
            <p style="margin:24px 0 0;font-size:12px;color:#6b7280">${siteConfig.responsePromise} · ${siteConfig.phoneDisplay}</p>
          </td></tr>
        </table>
      </td></tr>
    </table></body></html>`;
}

function quoteRows(q: QuoteRef): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0">
    <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px">Reference</td><td style="padding:4px 0;font-size:13px;color:#0d3d1a;font-weight:600">${q.reference}</td></tr>
    <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px">Name</td><td style="padding:4px 0;font-size:13px;color:#0d3d1a">${q.name}</td></tr>
    <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px">Area</td><td style="padding:4px 0;font-size:13px;color:#0d3d1a">${q.area}</td></tr>
    <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px">Items</td><td style="padding:4px 0;font-size:13px;color:#0d3d1a">${q.itemCount}</td></tr>
  </table>`;
}

/** Owner alert when a new quote lands on the site. */
export function newQuoteForOwner(q: QuoteRef): EmailMessage {
  return {
    to: siteConfig.email,
    subject: `New quote ${q.reference} — ${q.name}`,
    html: layout(
      "A new quote request came in",
      `<p style="margin:0 0 4px;font-size:14px;color:#374151">Someone requested a quote through the website.</p>
      ${quoteRows(q)}
      <p style="margin:12px 0 0;font-size:14px;color:#374151">Reply by WhatsApp or phone to confirm pricing and delivery: <a href="https://wa.me/${siteConfig.whatsappNumber}" style="color:#0d3d1a;font-weight:600">${siteConfig.phoneDisplay}</a></p>`,
    ),
  };
}

/** Customer confirmation once a quote is submitted (if they supplied an email). */
export function quoteSubmittedForCustomer(to: string, q: QuoteRef): EmailMessage {
  return {
    to,
    subject: `We received your quote request`,
    html: layout(
      "Thank you — we received your request",
      `<p style="margin:0 0 4px;font-size:14px;color:#374151">Hi ${q.name},</p>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">Your quote request for building materials is with our team.</p>
      ${quoteRows(q)}
      <p style="margin:12px 0 0;font-size:14px;color:#374151">${siteConfig.responsePromise}. Reply to this email with questions, or message us on WhatsApp via <strong>${siteConfig.phoneDisplay}</strong>.</p>`,
    ),
  };
}

const STATUS_LABEL: Record<string, string> = {
  new: "received",
  reviewed: "is being processed",
  won: "has been accepted — we're arranging your delivery",
  lost: "is not available at the moment, but we can quote close alternatives",
};

/** Customer update when a quote's status changes (they need the public doc link). */
export function quoteStatusForCustomer(to: string, q: QuoteRef & { status: string; docUrl: string }): EmailMessage {
  return {
    to,
    subject: `Your quote ${q.reference} — ${q.status === "won" ? "accepted" : q.status}`,
    html: layout(
      `Your quote ${q.reference} ${STATUS_LABEL[q.status] ?? "has been updated"}`,
      `<p style="margin:0 0 4px;font-size:14px;color:#374151">Hi ${q.name},</p>
      <p style="margin:0 0 12px;font-size:14px;color:#374151">A quick update on your quote to ${q.area}:</p>
      ${quoteRows(q)}
      <p style="margin:12px 0 0;font-size:14px;color:#374151">View your electronic quote any time: <a href="${q.docUrl}" style="color:#0d3d1a;font-weight:600">${q.docUrl}</a></p>`,
    ),
  };
}