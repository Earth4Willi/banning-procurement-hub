import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET } from "@/app/api/quote/[token]/document/route";

vi.mock("@/server/quote-store", () => ({
  isQuoteStoreAvailable: vi.fn(),
  findQuoteByToken: vi.fn(),
}));

vi.mock("@/server/settings-store", () => ({
  getSettings: vi.fn(),
}));

vi.mock("@/server/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => {}),
  clientIp: () => "127.0.0.1",
}));

import { findQuoteByToken, isQuoteStoreAvailable } from "@/server/quote-store";
import { getSettings } from "@/server/settings-store";

const QUOTE: Record<string, unknown> = {
  id: "qu_1",
  reference: "BPH-2401",
  name: "Ama Osei",
  phone: "0558850667",
  email: "ama@example.com",
  area: "Greater Accra",
  note: null,
  items: [
    { slug: "ghacem", label: "Ghacem Super Cement", quantity: 2, unitPrice: 120 },
    { slug: "sand", label: "Sharp Sand", quantity: 1 },
  ],
  status: "won",
  source: "web",
  created_at: "2026-09-01T10:00:00Z",
  valid_until: "2026-10-01",
  accepted_at: "2026-09-02T10:00:00Z",
  paid_at: "2026-09-03T10:00:00Z",
  payment_method: "bank",
  total_amount: 306,
  doc_token: "tok_abc",
  user_id: "u_1",
};

const params: Promise<{ token: string }> = Promise.resolve({ token: "tok_abc" });

const REQ = (url: string) => new Request(url) as unknown as NextRequest;

describe("GET /api/quote/[token]/document", () => {
  it("returns 503 storage_unavailable when the DB is not configured", async () => {
    vi.mocked(isQuoteStoreAvailable).mockReturnValue(false);
    const res = await GET(REQ("http://localhost/api/quote/tok_abc/document"), { params });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("storage_unavailable");
  });

  it("returns 404 via notFound() for an unknown token", async () => {
    vi.mocked(isQuoteStoreAvailable).mockReturnValue(true);
    vi.mocked(findQuoteByToken).mockResolvedValue(null);
    await expect(GET(REQ("http://localhost/api/quote/nope/document"), { params: Promise.resolve({ token: "nope" }) }))
      .rejects.toThrow();
  });

  it("renders a server-rendered document with items, totals and bank details for a bank quote", async () => {
    vi.mocked(isQuoteStoreAvailable).mockReturnValue(true);
    vi.mocked(findQuoteByToken).mockResolvedValue(QUOTE as never);
    vi.mocked(getSettings).mockResolvedValue({
      methods: ["mobile_money", "bank", "cash"],
      bank: { bankName: "GCB", accountName: "Banning Procurement Hub", accountNumber: "1234567890" },
    } as never);

    const res = await GET(REQ("http://localhost/api/quote/tok_abc/document"), { params });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("BPH-2401");
    expect(html).toContain("Ghacem Super Cement");
    expect(html).toContain("GH₵ 306.00");
    expect(html).toContain("Bank Transfer");
    expect(html).toContain("GCB");
    expect(html).toContain('<meta name="viewport"');
  });

  it("escapes user-supplied values to prevent XSS", async () => {
    vi.mocked(isQuoteStoreAvailable).mockReturnValue(true);
    vi.mocked(findQuoteByToken).mockResolvedValue({
      ...QUOTE,
      name: "<script>alert(1)</script>",
      items: [{ slug: "bad", label: "<img src=x onerror=alert(1)>", quantity: 1, unitPrice: 10 }],
      payment_method: "cash",
    } as never);

    const res = await GET(REQ("http://localhost/api/quote/tok_abc/document"), { params });
    const html = await res.text();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<img src=x");
  });

  it("omits the bank block for non-bank quotes", async () => {
    vi.mocked(isQuoteStoreAvailable).mockReturnValue(true);
    vi.mocked(findQuoteByToken).mockResolvedValue({ ...QUOTE, payment_method: "mobile_money" } as never);

    const res = await GET(REQ("http://localhost/api/quote/tok_abc/document"), { params });
    const html = await res.text();
    expect(html).not.toContain("Bank Transfer");
  });
});
