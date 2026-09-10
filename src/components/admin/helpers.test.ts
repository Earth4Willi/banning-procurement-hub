import { describe, expect, it } from "vitest";
import { ctaToWhatsApp, formatItems } from "./helpers";

describe("ctaToWhatsApp", () => {
  it("turns a leading-zero local number into an international wa.me link", () => {
    expect(ctaToWhatsApp("055 885 0667", "Hello")).toBe("https://wa.me/233558850667?text=Hello");
  });
  it("keeps an already-international number (digits only)", () => {
    expect(ctaToWhatsApp("+233558850667", "Hello")).toBe("https://wa.me/233558850667?text=Hello");
  });
  it("strips separators and non-digit characters", () => {
    expect(ctaToWhatsApp("055-885-0667", "Hi")).toBe("https://wa.me/233558850667?text=Hi");
  });
  it("URL-encodes the message text", () => {
    expect(ctaToWhatsApp("0558850667", "Hello BPH\nNew quote")).toBe(
      "https://wa.me/233558850667?text=Hello%20BPH%0ANew%20quote",
    );
  });
});

describe("formatItems", () => {
  it("lists unpriced items without a price", () => {
    expect(formatItems([{ slug: "cement", label: "Cement", quantity: 5 }])).toBe("Cement ×5");
  });
  it("appends the unit price when present", () => {
    expect(
      formatItems([
        { slug: "cement", label: "Cement", quantity: 5, unitPrice: 120 },
        { slug: "blocks", label: "Blocks", quantity: 10, unitPrice: 13 },
      ]),
    ).toBe("Cement ×5 @ GH₵ 120.00 · Blocks ×10 @ GH₵ 13.00");
  });
});