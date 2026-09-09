import { describe, expect, it } from "vitest";
import {
  adminQuoteStatusSchema,
  catalogItemIdSchema,
  categorySchema,
  contactSubmitSchema,
  customerUpdateSchema,
  manualQuoteSchema,
  messageUpdateSchema,
  parseBody,
  productSchema,
  quoteSubmitSchema,
  quoteUpdateSchema,
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

  it("coerces an empty message to undefined and allows omission", () => {
    const empty = contactSubmitSchema.parse({
      name: "Kojo",
      phone: "0241234567",
      area: "Tema",
      message: "",
    });
    expect(empty.message).toBeUndefined();
    const omitted = contactSubmitSchema.parse({ name: "Kojo", phone: "0241234567", area: "Tema" });
    expect(omitted.message).toBeUndefined();
  });
});

describe("manualQuoteSchema", () => {
  it("passes a valid manual quote and normalizes phone", () => {
    const parsed = manualQuoteSchema.parse({
      name: "Ama",
      phone: "0558850667",
      area: "Accra",
      note: "WhatsApp chat follow-up",
    });
    expect(parsed.phone).toBe("+233558850667");
  });

  it("accepts optional email and note", () => {
    expect(manualQuoteSchema.parse({ name: "Ama", phone: "0241234567", area: "Accra" })).toEqual({
      name: "Ama",
      phone: "+233241234567",
      area: "Accra",
    });
  });

  it("rejects missing required fields", () => {
    expect(() => manualQuoteSchema.parse({ name: "", phone: "0241234567", area: "Accra" })).toThrow();
    expect(() => manualQuoteSchema.parse({ name: "Ama", phone: "abc", area: "Accra" })).toThrow();
    expect(() => manualQuoteSchema.parse({ name: "Ama", phone: "0241234567", area: "" })).toThrow();
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

describe("catalog schemas", () => {
  it("productSchema passes a full product and defaults omission", () => {
    const parsed = productSchema.parse({
      slug: "Ghacem-Supacem",
      categoryId: "cement",
      name: "Ghacem Supacem",
      unitPrice: "GH¢ 98.00",
    });
    expect(parsed.slug).toBe("ghacem-supacem");
    expect(parsed.stock).toBe("in");
    expect(parsed.pricingMode).toBe("quote");
    expect(parsed.brand).toBeUndefined();
  });

  it("productSchema rejects extra keys and bad slugs", () => {
    expect(() => productSchema.parse({ slug: "x", categoryId: "c", name: "n", oops: 1 })).toThrow();
    expect(() => productSchema.parse({ slug: "Bad Slug!", categoryId: "c", name: "n" })).toThrow();
  });

  it("categorySchema passes and defaults", () => {
    const parsed = categorySchema.parse({ id: "roofing", name: "Roofing" });
    expect(parsed.sortOrder).toBe(0);
    expect(parsed.visible).toBe(true);
    expect(parsed.description).toBeUndefined();
  });

  it("catalogItemIdSchema accepts ids and rejects emtpy", () => {
    expect(catalogItemIdSchema.parse({ id: "cement" })).toEqual({ id: "cement" });
    expect(() => catalogItemIdSchema.parse({ id: "" })).toThrow();
  });
});

describe("messageUpdateSchema", () => {
  it("allows partial updates", () => {
    expect(messageUpdateSchema.parse({ id: "m1", read: true })).toEqual({ id: "m1", read: true });
    expect(messageUpdateSchema.parse({ id: "m1", message: "" }).message).toBeUndefined();
  });

  it("rejects unknown fields", () => {
    expect(() => messageUpdateSchema.parse({ id: "m1", read: true, junk: 1 })).toThrow();
  });
});

describe("customerUpdateSchema", () => {
  it("normalizes phone and coerces empty notes", () => {
    const parsed = customerUpdateSchema.parse({ phone: "0558850667", notes: "", status: "repeat" });
    expect(parsed.phone).toBe("+233558850667");
    expect(parsed.notes).toBeUndefined();
    expect(parsed.status).toBe("repeat");
  });

  it("rejects bad statuses", () => {
    expect(() => customerUpdateSchema.parse({ phone: "0558850667", status: "vip" })).toThrow();
  });
});

describe("quoteUpdateSchema", () => {
  it("accepts optional fields and rejects extras", () => {
    expect(quoteUpdateSchema.parse({ id: "q", status: "won" })).toEqual({ id: "q", status: "won" });
    expect(() => quoteUpdateSchema.parse({ id: "q", items: [] })).toThrow();
  });
});