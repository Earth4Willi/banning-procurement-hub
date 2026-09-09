import { describe, expect, it, vi } from "vitest";
import { fetchCategories, fetchProducts } from "./catalog-store";

vi.mock("./audit", () => ({ getSupabaseClient: () => null }));

describe("fetchCategories", () => {
  it("falls back to static site data when the DB is unavailable", async () => {
    const result = await fetchCategories();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result.map((category) => category.id)).toContain("cement");
  });
});

describe("fetchProducts", () => {
  it("falls back to static site data when the DB is unavailable", async () => {
    const result = await fetchProducts();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
    expect(result.map((product) => product.slug)).toContain("ghacem-supacem-42-5");
  });
});