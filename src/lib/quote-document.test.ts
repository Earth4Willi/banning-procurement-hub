import { describe, expect, it } from "vitest";
import { buildQuoteSummary, computeTotals, money } from "./quote-document";

describe("computeTotals", () => {
  it("computes subtotal, 15% VAT and total with 2dp half-up rounding", () => {
    const result = computeTotals([
      { quantity: 10, unitPrice: 13 },
      { quantity: 1, unitPrice: 95.55 },
    ]);
    expect(result.subtotal).toBe(225.55);
    expect(result.vat).toBe(33.83);
    expect(result.total).toBe(259.38);
  });
  it("handles a missing unit price as zero", () => {
    expect(computeTotals([{ quantity: 3, unitPrice: 0 }]).total).toBe(0);
  });
});

describe("buildQuoteSummary", () => {
  const priced = {
    reference: "Q-1234",
    items: [
      { label: "Ghacem Supacem 42.5R", quantity: 10, unitPrice: 120 },
      { label: "Hollow Block 6 inch", quantity: 50, unitPrice: 13 },
    ],
    validUntil: "2026-09-30",
    totals: computeTotals([
      { quantity: 10, unitPrice: 120 },
      { quantity: 50, unitPrice: 13 },
    ]),
  };
  it("renders a priced quotation summary", () => {
    const text = buildQuoteSummary(priced);
    expect(text).toContain("Q-1234");
    expect(text).toContain("Ghacem Supacem 42.5R");
    expect(text).toContain("10 × Ghacem Supacem 42.5R @ GH₵ 120.00");
    expect(text).toContain("Subtotal: GH₵ 1,850.00");
    expect(text).toContain("VAT (15%): GH₵ 277.50");
    expect(text).toContain("Total: GH₵ 2,127.50");
    expect(text).toContain("Valid until 30 Sep 2026");
  });
  it("renders an unpriced request fallback", () => {
    const text = buildQuoteSummary({ reference: "Q-1", items: [{ label: "Cement", quantity: 5 }], validUntil: null, totals: null });
    expect(text).toContain("Q-1");
    expect(text).toContain("5 × Cement");
    expect(text).not.toContain("Subtotal");
  });
});

describe("money", () => {
  it("formats GH₵ with thousands separators", () => {
    expect(money(2127.5)).toBe("GH₵ 2,127.50");
  });
});
