import { describe, expect, it, vi } from "vitest";
import { storagePublicUrl, validateImageFile } from "./storage";

describe("validateImageFile", () => {
  it("accepts an allowed type within size", () => {
    const result = validateImageFile({ name: "a.jpg", type: "image/jpeg", size: 1_000 }, new Set(["image/jpeg"]), 3_000_000);
    expect(result).toEqual({ ok: true });
  });

  it("rejects a disallowed type", () => {
    const file = { name: "a.txt", type: "text/plain", size: 10 };
    const result = validateImageFile(file, new Set(["image/jpeg", "image/png"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("JPEG");
  });

  it("rejects an oversized file", () => {
    const file = { name: "a.jpg", type: "image/jpeg", size: 4_000_000 };
    const result = validateImageFile(file, new Set(["image/jpeg"]), 3_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("3 MB");
  });
});

describe("storagePublicUrl", () => {
  it("builds the public object URL", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co/");
    expect(storagePublicUrl("catalog-images", "products/cement.jpg")).toBe(
      "https://project.supabase.co/storage/v1/object/public/catalog-images/products/cement.jpg",
    );
  });

  it("returns empty when env missing", () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(storagePublicUrl("catalog-images", "x.jpg")).toBe("");
  });
});