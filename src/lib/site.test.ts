import { describe, expect, it } from "vitest";
import {
  categories,
  products,
  stats,
  testimonials,
  certifications,
  faqs,
  getCategory,
  getProduct,
  productsByCategory,
  siteConfig,
} from "./site";

describe("site data", () => {
  it("keeps one business phone across display, tel and whatsapp", () => {
    expect(siteConfig.phoneDisplay).toBe("055 885 0667");
    expect(siteConfig.phoneIntl).toBe("+233558850667");
    expect(siteConfig.whatsappNumber).toBe("233558850667");
  });

  it("has unique category ids matching the nine catalogue categories", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["cement", "blocks", "iron-rods", "roofing", "plumbing", "electricals", "paint", "tiles", "other"]);
  });

  it("has unique product slugs and a valid categoryId per product", () => {
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
    for (const p of products) {
      expect(getCategory(p.categoryId)).toBeDefined();
      expect(productsByCategory(p.categoryId)).toContain(p);
    }
  });

  it("has at least 3 sample products per category", () => {
    for (const c of categories) {
      expect(productsByCategory(c.id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("has complete trust-layer data", () => {
    expect(stats.length).toBeGreaterThanOrEqual(4);
    expect(testimonials.length).toBeGreaterThanOrEqual(3);
    expect(certifications.length).toBeGreaterThanOrEqual(3);
    expect(faqs.length).toBe(5);
  });

  it("resolves by id/slug", () => {
    expect(getCategory("cement")?.id).toBe("cement");
    expect(getProduct(products[0].slug)?.slug).toBe(products[0].slug);
    expect(getCategory("nope")).toBeUndefined();
    expect(getProduct("nope")).toBeUndefined();
  });

  it("tags every product with a valid stock status covering all three states", () => {
    expect(products.length).toBe(28);
    const statuses = products.map((p) => p.stock);
    for (const p of products) {
      expect(["in", "limited", "out"]).toContain(p.stock);
    }
    for (const s of ["in", "limited", "out"] as const) {
      expect(statuses).toContain(s);
    }
  });

  it("assigns every product a valid pricing mode with both modes represented", () => {
    const modes = products.map((p) => p.pricingMode);
    for (const p of products) {
      expect(["fixed", "quote"]).toContain(p.pricingMode);
    }
    expect(modes).toContain("fixed");
    expect(modes).toContain("quote");
  });
});
