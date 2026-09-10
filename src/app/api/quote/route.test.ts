import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const fetchProducts = vi.fn();

vi.mock("@/server/catalog-store", () => ({
  fetchProducts: (...args: unknown[]) => fetchProducts(...args),
}));

vi.mock("@/server/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/csrf", () => ({
  verifySameOrigin: vi.fn(),
}));

vi.mock("@/server/rate-limit", () => ({
  clientIp: () => "127.0.0.1",
  enforceRateLimit: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/server/require-customer", () => ({
  requireCustomer: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/quote-store", () => ({
  persistQuote: vi.fn().mockResolvedValue(true),
}));

import { POST } from "./route";

function quoteRequest(items: { slug: string; label: string; quantity: number }[]) {
  return new NextRequest("https://example.com/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.com" },
    body: JSON.stringify({ name: "Ama", phone: "0558850667", area: "Accra", items }),
  });
}

describe("quote route stock validation", () => {
  it("rejects a tracked item that exceeds available stock with stock_unavailable", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "cement-42-5",
        name: "Ghacem Supacem 42.5R",
        unit: "bag",
        pricingMode: "fixed",
        kind: "unit",
        visible: true,
        sortOrder: 1,
        lowStockThreshold: 10,
        stockQuantity: 10,
        trackInventory: true,
        stockStatus: "limited",
      },
    ]);

    const res = await POST(quoteRequest([{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 20 }]));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error.code).toBe("stock_unavailable");
    expect(json.error.message).toMatch(/10 bag/i);
  });

  it("does not flag exact-quantity or unknown slugs", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "cement-42-5",
        name: "Ghacem Supacem 42.5R",
        unit: "bag",
        pricingMode: "fixed",
        kind: "unit",
        visible: true,
        sortOrder: 1,
        lowStockThreshold: 10,
        stockQuantity: 10,
        trackInventory: true,
        stockStatus: "limited",
      },
    ]);

    const res = await POST(
      quoteRequest([
        { slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 10 },
        { slug: "unknown-product", label: "Mystery", quantity: 3 },
      ]),
    );
    const json = await res.json();
    expect(res.status).toBe(202);
    expect(json.ok).toBe(true);
    expect(json.reference).toBeTruthy();
  });

  it("allows non-tracked (Available on Request) items without a stock check", async () => {
    fetchProducts.mockResolvedValue([
      {
        slug: "sharp-sand",
        name: "Sharp Sand",
        unit: "trip",
        pricingMode: "quote",
        kind: "measure",
        visible: true,
        sortOrder: 2,
        lowStockThreshold: 10,
        stockQuantity: 0,
        trackInventory: false,
        stockStatus: "in",
      },
    ]);

    const res = await POST(quoteRequest([{ slug: "sharp-sand", label: "Sharp Sand", quantity: 999 }]));
    const json = await res.json();
    expect(res.status).toBe(202);
    expect(json.ok).toBe(true);
  });
});