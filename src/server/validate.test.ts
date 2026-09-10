import { describe, expect, it } from "vitest";
import {
  accountProfileSchema,
  adminQuoteStatusSchema,
  catalogItemIdSchema,
  categorySchema,
  changePasswordSchema,
  contactSubmitSchema,
  customerLoginSchema,
  customerUpdateSchema,
  loginCredentialsSchema,
  manualQuoteSchema,
  messageUpdateSchema,
  parseBody,
  productSchema,
  quotePaidSchema,
  quoteSubmitSchema,
  quoteUpdateSchema,
  registerSchema,
  settingsUpdateSchema,
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
    expect(quoteUpdateSchema.parse({ id: "q", items: [] })).toEqual({ id: "q", items: [] });
  });

  it("accepts unitPrice in items", () => {
    const parsed = quoteUpdateSchema.parse({
      id: "q",
      items: [{ slug: "cement", label: "Cement", quantity: 5, unitPrice: 120 }],
    });
    expect(parsed.items![0].unitPrice).toBe(120);
  });

  it("rejects negative unitPrice", () => {
    expect(() =>
      quoteUpdateSchema.parse({
        id: "q",
        items: [{ slug: "cement", label: "Cement", quantity: 5, unitPrice: -1 }],
      }),
    ).toThrow();
  });

  it("rejects extra keys in items", () => {
    expect(() =>
      quoteUpdateSchema.parse({
        id: "q",
        items: [{ slug: "cement", label: "Cement", quantity: 5, badKey: true }],
      }),
    ).toThrow();
  });

  it("accepts validUntil as a date string", () => {
    expect(quoteUpdateSchema.parse({ id: "q", validUntil: "2026-12-31" })).toEqual({
      id: "q",
      validUntil: "2026-12-31",
    });
  });

  it("coerces empty validUntil to undefined", () => {
    expect(quoteUpdateSchema.parse({ id: "q", validUntil: "" }).validUntil).toBeUndefined();
  });
});

describe("quotePaidSchema", () => {
  it("accepts a valid id and method", () => {
    expect(quotePaidSchema.parse({ id: "q1", method: "cash" })).toEqual({ id: "q1", method: "cash" });
  });

  it("accepts all payment methods", () => {
    expect(quotePaidSchema.parse({ id: "q1", method: "mobile_money" })).toEqual({ id: "q1", method: "mobile_money" });
    expect(quotePaidSchema.parse({ id: "q1", method: "bank" })).toEqual({ id: "q1", method: "bank" });
    expect(quotePaidSchema.parse({ id: "q1", method: "other" })).toEqual({ id: "q1", method: "other" });
  });

  it("rejects unknown payment methods", () => {
    expect(() => quotePaidSchema.parse({ id: "q1", method: "crypto" })).toThrow();
  });

  it("rejects extra keys", () => {
    expect(() => quotePaidSchema.parse({ id: "q1", method: "cash", extra: true })).toThrow();
  });
});

describe("registerSchema", () => {
  it("passes a valid registration and normalizes email and phone", () => {
    const parsed = registerSchema.parse({
      name: "Ama",
      email: " AMA@example.COM ",
      phone: "0558850667",
      password: "Hunter2pass",
    });
    expect(parsed.email).toBe("ama@example.com");
    expect(parsed.phone).toBe("+233558850667");
    expect(parsed.name).toBe("Ama");
  });

  it("accepts optional area and address", () => {
    const parsed = registerSchema.parse({
      name: "Ama",
      email: "ama@example.com",
      phone: "0558850667",
      password: "Hunter2pass",
      area: "Accra",
      address: "123 Street",
    });
    expect(parsed.area).toBe("Accra");
    expect(parsed.address).toBe("123 Street");
    const minimal = registerSchema.parse({
      name: "Kojo",
      email: "kojo@example.com",
      phone: "0241234567",
      password: "Hunter2pass",
    });
    expect(minimal.area).toBeUndefined();
    expect(minimal.address).toBeUndefined();
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(() =>
      registerSchema.parse({ name: "Ama", email: "ama@example.com", phone: "0558850667", password: "hunter2pass" }),
    ).toThrow();
  });

  it("rejects passwords without a digit", () => {
    expect(() =>
      registerSchema.parse({ name: "Ama", email: "ama@example.com", phone: "0558850667", password: "Hunterpass" }),
    ).toThrow();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(() =>
      registerSchema.parse({ name: "Ama", email: "ama@example.com", phone: "0558850667", password: "Hp2!" }),
    ).toThrow();
  });

  it("rejects an address over 500 characters", () => {
    expect(() =>
      registerSchema.parse({
        name: "Ama",
        email: "ama@example.com",
        phone: "0558850667",
        password: "Hunter2pass",
        address: "x".repeat(501),
      }),
    ).toThrow();
  });
});

describe("customerLoginSchema", () => {
  it("matches the login credentials shape", () => {
    expect(customerLoginSchema).toBe(loginCredentialsSchema);
    const parsed = customerLoginSchema.parse({ email: " AMA@example.COM ", password: "secret" });
    expect(parsed.email).toBe("ama@example.com");
  });

  it("rejects a missing password", () => {
    expect(() => customerLoginSchema.parse({ email: "ama@example.com" })).toThrow();
  });
});

describe("accountProfileSchema", () => {
  it("accepts an empty payload with all fields optional", () => {
    expect(accountProfileSchema.parse({})).toEqual({});
  });

  it("normalizes phone and email when present", () => {
    const parsed = accountProfileSchema.parse({
      name: "Ama",
      email: " AMA@example.COM ",
      phone: "0558850667",
      area: "Accra",
      address: "",
    });
    expect(parsed.email).toBe("ama@example.com");
    expect(parsed.phone).toBe("+233558850667");
    expect(parsed.name).toBe("Ama");
    expect(parsed.area).toBe("Accra");
    expect(parsed.address).toBeUndefined();
  });

  it("rejects an invalid phone", () => {
    expect(() => accountProfileSchema.parse({ phone: "not-a-phone" })).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("passes current and strong new password", () => {
    expect(changePasswordSchema.parse({ currentPassword: "hunter2", newPassword: "Newpass123" })).toEqual({
      currentPassword: "hunter2",
      newPassword: "Newpass123",
    });
  });

  it("rejects a weak new password", () => {
    expect(() => changePasswordSchema.parse({ currentPassword: "hunter2", newPassword: "weakpass" })).toThrow();
  });
});

describe("settingsUpdateSchema", () => {
  it("accepts a full site payload", () => {
    const parsed = settingsUpdateSchema.parse({
      key: "site",
      value: {
        name: "Banning Procurement Hub",
        tagline: "Your one-stop source for quality building materials across Ghana.",
        phoneDisplay: "055 885 0667",
        phoneIntl: "+233558850667",
        whatsappNumber: "233558850667",
        email: "banning173@gmail.com",
        address: "Office location shared on request. Serving all 16 regions of Ghana.",
        addressShort: "Accra, Ghana",
        hours: { summary: "Mon to Sat, 8am to 6pm", detail: "Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment." },
        mapEmbedUrl: "https://maps.google.com/maps?q=Accra",
        responsePromise: "Quotes within 24 hours",
        guarantee: "Every material is quality-checked before delivery. Replacements or refunds for genuine defects.",
      },
    });
    expect(parsed.key).toBe("site");
  });

  it("rejects a site payload with a bad email", () => {
    expect(() =>
      settingsUpdateSchema.parse({
        key: "site",
        value: {
          name: "Banning",
          tagline: "",
          phoneDisplay: "",
          phoneIntl: "",
          whatsappNumber: "",
          email: "nope",
          address: "",
          addressShort: "",
          hours: { summary: "", detail: "" },
          mapEmbedUrl: "",
          responsePromise: "",
          guarantee: "",
        },
      }),
    ).toThrow();
  });

  it("accepts a marquee payload with up to 12 short messages", () => {
    expect(settingsUpdateSchema.parse({ key: "marquee", value: { messages: ["Quotes within 24 hours", "Delivered across Ghana"] } })).toEqual({
      key: "marquee",
      value: { messages: ["Quotes within 24 hours", "Delivered across Ghana"] },
    });
  });

  it("rejects a marquee payload with too many or too long messages", () => {
    expect(() => settingsUpdateSchema.parse({ key: "marquee", value: { messages: [] } })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "marquee", value: { messages: Array.from({ length: 13 }, (_, i) => `m${i}`) } })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "marquee", value: { messages: ["x".repeat(161)] } })).toThrow();
  });

  it("accepts a payments payload", () => {
    expect(
      settingsUpdateSchema.parse({
        key: "payments",
        value: { methods: ["mobile_money", "cash"], bank: { bankName: "GCB", accountName: "BPH", accountNumber: "100200300" } },
      }),
    ).toMatchObject({ key: "payments" });
  });

  it("rejects a payments payload with an unknown method or no methods", () => {
    expect(() => settingsUpdateSchema.parse({ key: "payments", value: { methods: ["crypto"], bank: { bankName: "", accountName: "", accountNumber: "" } } })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "payments", value: { methods: [], bank: { bankName: "", accountName: "", accountNumber: "" } } })).toThrow();
  });

  it("rejects an account number over 60 characters", () => {
    expect(() =>
      settingsUpdateSchema.parse({
        key: "payments",
        value: { methods: ["cash"], bank: { bankName: "", accountName: "", accountNumber: "x".repeat(61) } },
      }),
    ).toThrow();
  });

  it("accepts a delivery payload with up to 40 areas", () => {
    const parsed = settingsUpdateSchema.parse({ key: "delivery", value: { areas: ["Greater Accra", "Ashanti"] } });
    expect(parsed).toEqual({ key: "delivery", value: { areas: ["Greater Accra", "Ashanti"] } });
  });

  it("rejects a delivery payload with too many or too long areas", () => {
    expect(() => settingsUpdateSchema.parse({ key: "delivery", value: { areas: [] } })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "delivery", value: { areas: Array.from({ length: 41 }, (_, i) => `a${i}`) } })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "delivery", value: { areas: ["x".repeat(121)] } })).toThrow();
  });

  it("rejects an unknown key or a mismatched key/value", () => {
    expect(() => settingsUpdateSchema.parse({ key: "banners", value: {} })).toThrow();
    expect(() => settingsUpdateSchema.parse({ key: "marquee", value: { methods: ["cash"] } })).toThrow();
  });
});