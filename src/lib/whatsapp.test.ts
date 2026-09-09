import { describe, expect, it } from "vitest";
import { buildQuoteMessage, buildWhatsAppUrl } from "./whatsapp";

describe("whatsapp", () => {
  const contact = { name: "Nana", phone: "0551234567", area: "East Legon" };
  const lines = [
    { name: "Ghacem Super Cement 42.5R", unit: "bag (50kg)", unitPrice: "GH₵ 120", qty: 10 },
    { name: "Deformed Bar 12mm", unit: "piece (12m)", unitPrice: "GH₵ 95", qty: 20 },
  ];

  it("builds a readable structured message", () => {
    const msg = buildQuoteMessage(contact, lines);
    expect(msg).toContain("Name: Nana");
    expect(msg).toContain("Phone: 0551234567");
    expect(msg).toContain("Delivery area: East Legon");
    expect(msg).toContain("1. Ghacem Super Cement 42.5R - 10 x bag (50kg) @ GH₵ 120");
    expect(msg).toContain("2. Deformed Bar 12mm - 20 x piece (12m) @ GH₵ 95");
  });

  it("accepts without plain-text breaks or newlines in the URL", () => {
    const url = buildWhatsAppUrl("233558850667", buildQuoteMessage(contact, lines));
    expect(url.startsWith("https://wa.me/233558850667?text=")).toBe(true);
    expect(url.includes("\n")).toBe(false);
    expect(url.includes(" ")).toBe(false);
  });

  it("includes the reference line right after the greeting when provided", () => {
    const msg = buildQuoteMessage(contact, lines, "a1b2c3d4e5");
    expect(msg.split("\n")[1]).toBe("Ref: a1b2c3d4e5");
    expect(msg.indexOf("a1b2c3d4e5")).toBeLessThan(msg.indexOf("Name:"));
  });

  it("omits the reference line when absent", () => {
    expect(buildQuoteMessage(contact, lines, undefined).includes("Ref:")).toBe(false);
  });

  it("omits note when absent", () => {
    const msg = buildQuoteMessage({ ...contact, note: "" }, lines);
    expect(msg.includes("Note")).toBe(false);
  });
});
