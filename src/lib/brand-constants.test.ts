import { describe, expect, it } from "vitest";
import { AFRICAN_CONSTRUCTION_BRAND_GROUPS, ALL_BRAND_OPTIONS, OTHER_BRAND } from "./brand-constants";

describe("AFRICAN_CONSTRUCTION_BRAND_GROUPS", () => {
  it("is non-empty and every group is labelled", () => {
    expect(AFRICAN_CONSTRUCTION_BRAND_GROUPS.length).toBeGreaterThan(0);
    for (const group of AFRICAN_CONSTRUCTION_BRAND_GROUPS) {
      expect(group.label).toBeTruthy();
      expect(group.brands.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate brand names", () => {
    const all = AFRICAN_CONSTRUCTION_BRAND_GROUPS.flatMap((group) => group.brands);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("ALL_BRAND_OPTIONS", () => {
  it("contains every grouped brand plus the Other sentinel last", () => {
    const grouped = AFRICAN_CONSTRUCTION_BRAND_GROUPS.flatMap((group) => group.brands);
    for (const brand of grouped) expect(ALL_BRAND_OPTIONS).toContain(brand);
    expect(ALL_BRAND_OPTIONS[ALL_BRAND_OPTIONS.length - 1]).toBe(OTHER_BRAND);
  });
});