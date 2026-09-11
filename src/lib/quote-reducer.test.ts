import { describe, expect, it } from "vitest";
import { initialQuoteState, quoteCount, quoteReducer } from "./quote-reducer";

describe("quoteReducer", () => {
  it("adds an item with qty 1", () => {
    const s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    expect(s.items).toEqual([{ productId: "a", qty: 1 }]);
  });
  it("increments on duplicate add", () => {
    const s = quoteReducer(quoteReducer(initialQuoteState, { type: "add", productId: "a" }), { type: "add", productId: "a" });
    expect(s.items).toEqual([{ productId: "a", qty: 2 }]);
  });
  it("removes an item entirely and clears", () => {
    let s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "remove", productId: "a" });
    expect(s.items).toEqual([]);
    s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "clear" });
    expect(s.items).toEqual([]);
  });
  it("sets an exact qty, flooring negatives to 0 and dropping empty items", () => {
    let s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: 5 });
    expect(s.items[0].qty).toBe(5);
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: -3 });
    expect(s.items).toEqual([]);
  });
  it("floors fractional quantities, clamps to 9999, and drops non-finite values", () => {
    let s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: 2.9 });
    expect(s.items[0].qty).toBe(2);
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: Number.POSITIVE_INFINITY });
    expect(s.items).toEqual([]);
    s = quoteReducer(initialQuoteState, { type: "add", productId: "a" });
    s = quoteReducer(s, { type: "setQty", productId: "a", qty: 100000 });
    expect(s.items[0].qty).toBe(9999);
  });
  it("quoteCount sums quantities", () => {
    const s = quoteReducer(quoteReducer(initialQuoteState, { type: "add", productId: "a" }), { type: "add", productId: "b" });
    const withQty = quoteReducer(s, { type: "setQty", productId: "b", qty: 4 });
    expect(quoteCount(withQty)).toBe(5);
  });
});
