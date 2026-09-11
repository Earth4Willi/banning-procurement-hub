import { describe, expect, it } from "vitest";
import {
  getStockStatus,
  applyQuantityChange,
  computeProductStatus,
  findShortLines,
  type ShortLine,
} from "./inventory";

describe("getStockStatus", () => {
  it("returns out_of_stock when quantity is 0", () => {
    expect(getStockStatus(0)).toBe("out_of_stock");
  });

  it("returns out_of_stock for negative quantity (clamp edge case)", () => {
    expect(getStockStatus(-5)).toBe("out_of_stock");
  });

  it("returns limited when quantity is 1 and threshold is 10", () => {
    expect(getStockStatus(1, 10)).toBe("limited");
  });

  it("returns limited when quantity equals threshold", () => {
    expect(getStockStatus(10, 10)).toBe("limited");
  });

  it("returns in_stock when quantity exceeds threshold", () => {
    expect(getStockStatus(11, 10)).toBe("in_stock");
  });

  it("defaults threshold to 10", () => {
    expect(getStockStatus(10)).toBe("limited");
    expect(getStockStatus(11)).toBe("in_stock");
  });

  it("handles custom threshold", () => {
    expect(getStockStatus(5, 5)).toBe("limited");
    expect(getStockStatus(6, 5)).toBe("in_stock");
  });
});

describe("applyQuantityChange", () => {
  it("adds quantity", () => {
    expect(applyQuantityChange(10, 5)).toEqual({ newQuantity: 15, quantityChanged: 5 });
  });

  it("deducts quantity", () => {
    expect(applyQuantityChange(10, -3)).toEqual({ newQuantity: 7, quantityChanged: -3 });
  });

  it("clamps to 0 on negative result", () => {
    expect(applyQuantityChange(3, -10)).toEqual({ newQuantity: 0, quantityChanged: -3 });
  });

  it("handles zero change", () => {
    expect(applyQuantityChange(5, 0)).toEqual({ newQuantity: 5, quantityChanged: 0 });
  });
});

describe("computeProductStatus", () => {
  it("returns on_request for non-tracked products", () => {
    const result = computeProductStatus({
      trackInventory: false,
      stockQuantity: 0,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("on_request");
    expect(result.tracking).toBe(false);
  });

  it("returns in_stock for tracked products above threshold", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 50,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("in_stock");
    expect(result.tracking).toBe(true);
  });

  it("returns limited for tracked products at or below threshold", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 7,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("limited");
  });

  it("returns out_of_stock for tracked products with 0 quantity", () => {
    const result = computeProductStatus({
      trackInventory: true,
      stockQuantity: 0,
      lowStockThreshold: 10,
    });
    expect(result.status).toBe("out_of_stock");
  });
});

describe("findShortLines", () => {
  const products = [
    { slug: "cement-42-5", name: "Ghacem Supacem", unit: "bag", trackInventory: true, stockQuantity: 10 },
    { slug: "sharp-sand", name: "Sharp Sand", unit: "trip", trackInventory: false, stockQuantity: 0 },
  ];

  it("flags a tracked item whose quantity exceeds available stock", () => {
    const short = findShortLines([{ slug: "cement-42-5", quantity: 20 }], products);
    expect(short).toEqual([
      { name: "Ghacem Supacem", slug: "cement-42-5", requested: 20, available: 10 },
    ]);
  });

  it("does not flag an item within stock", () => {
    expect(findShortLines([{ slug: "cement-42-5", quantity: 10 }], products)).toEqual([]);
  });

  it("never flags non-tracked (on-request) items", () => {
    expect(findShortLines([{ slug: "sharp-sand", quantity: 999 }], products)).toEqual([]);
  });

  it("is best-effort for unknown slugs", () => {
    expect(findShortLines([{ slug: "does-not-exist", quantity: 1 }], products)).toEqual([]);
  });

  it("reports multiple short lines", () => {
    const many = products.map((p) => ({ ...p, stockQuantity: 2 }));
    const short = findShortLines(
      [
        { slug: "cement-42-5", quantity: 5 },
        { slug: "sharp-sand", quantity: 5 },
      ],
      many,
    );
    expect(short).toHaveLength(1);
    expect(short[0].slug).toBe("cement-42-5");
  });

  it("aggregates duplicate slugs before comparing against stock", () => {
    const short = findShortLines(
      [
        { slug: "cement-42-5", quantity: 6 },
        { slug: "cement-42-5", quantity: 6 },
      ],
      products,
    );
    expect(short).toEqual([
      { name: "Ghacem Supacem", slug: "cement-42-5", requested: 12, available: 10 },
    ]);
  });

  it("does not flag duplicate slugs whose combined quantity fits", () => {
    expect(
      findShortLines(
        [
          { slug: "cement-42-5", quantity: 4 },
          { slug: "cement-42-5", quantity: 6 },
        ],
        products,
      ),
    ).toEqual([]);
  });
});