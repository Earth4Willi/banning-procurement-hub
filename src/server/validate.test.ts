import { describe, expect, it } from "vitest";
import {
  adminQuoteStatusSchema,
  contactSubmitSchema,
  parseBody,
  quoteSubmitSchema,
} from "./validate";

describe("parseBody", () => {
  it("rejects malformed JSON", async () => {
    const request = new Request("http://localhost:3000/api/x", {
      method: "POST",
      body: "{not json",
    });
    await expect(parseBody(request, quoteSubmitSchema)).rejects.toMatchObject({
      status: 400,
      code: "invalid_json",
    });
  });

  it("rejects bodies over the size limit", async () => {
    const request = new Request("http://localhost:3000/api/x", {
      method: "POST",
      body: JSON.stringify({ big: "x".repeat(20 * 1024) }),
    });
    await expect(parseBody(request, quoteSubmitSchema)).rejects.toMatchObject({
      status: 400,
      code: "payload_too_large",
    });
  });

  it("rejects unknown fields (blocking field tampering)", async () => {
    const request = new Request("http://localhost:3000/api/x", {
      method: "POST",
      body: JSON.stringify({
        name: "Ama",
        phone: "0558850667",
        area: "Accra",
        items: [{ slug: "cement", label: "Cement", quantity: 2 }],
        price: 9999,
      }),
    });
    await expect(parseBody(request, quoteSubmitSchema)).rejects.toMatchObject({
      status: 400,
      code: "validation_failed",
    });
  });
});

describe("quoteSubmitSchema", () => {
  const valid = {
    name: "Ama",
    phone: "0558850667",
    area: "Accra",
    items: [{ slug: "cement", label: "Cement", quantity: 2 }],
  };

  it("passes a valid payload and normalizes email and phone", () => {
    const parsed = quoteSubmitSchema.parse({ ...valid, email: "  AMA@example.COM " });
    expect(parsed.email).toBe("ama@example.com");
    expect(parsed.phone).toBe("+233558850667");
  });

  it("accepts injection-shaped text as a capped string", () => {
    const parsed = quoteSubmitSchema.parse({
      ...valid,
      note: "<script>alert(1)</script>'; DROP TABLE products;--",
    });
    expect(parsed.note).toContain("DROP TABLE");
  });

  it("rejects an out-of-range quantity", () => {
    expect(() =>
      quoteSubmitSchema.parse({ ...valid, items: [{ slug: "s", label: "S", quantity: 0 }] }),
    ).toThrow();
  });

  it("rejects a non-Ghana phone", () => {
    expect(() => quoteSubmitSchema.parse({ ...valid, phone: "+1 202 555 0100" })).toThrow();
  });
});

describe("contactSubmitSchema", () => {
  it("passes a valid contact", () => {
    const parsed = contactSubmitSchema.parse({
      name: "Kojo",
      phone: "0241234567",
      area: "Tema",
      message: "Quote for 100 bags of cement",
    });
    expect(parsed.phone).toBe("+233241234567");
  });
});

describe("adminQuoteStatusSchema", () => {
  it("accepts a valid id and status", () => {
    expect(adminQuoteStatusSchema.parse({ id: "abc-123", status: "new" })).toEqual({
      id: "abc-123",
      status: "new",
    });
  });

  it("rejects an unknown status", () => {
    expect(() => adminQuoteStatusSchema.parse({ id: "abc", status: "archived" })).toThrow();
  });

  it("rejects extra keys (strict)", () => {
    expect(() => adminQuoteStatusSchema.parse({ id: "abc", status: "new", extra: true })).toThrow();
  });
});