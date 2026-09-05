import { describe, expect, it } from "vitest";
import { formatItemCount, monetaryTotal } from "./format";
import { QuoteLine } from "./whatsapp";

describe("format", () => {
  it("pluralises item counts", () => {
    expect(formatItemCount(1)).toBe("1 item");
    expect(formatItemCount(4)).toBe("4 items");
  });

  it("sums monetary lines by parsing the price numeral", () => {
    const lines: QuoteLine[] = [
      { name: "a", unit: "pcs", unitPrice: "GH₵ 120", qty: 2 },
      { name: "b", unit: "pcs", unitPrice: "GH₵ 95.5", qty: 1 },
    ];
    expect(monetaryTotal(lines)).toBe("GH₵ 335.5");
  });
});
