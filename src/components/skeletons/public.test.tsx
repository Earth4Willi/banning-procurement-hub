import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactSkeleton, ProductsGridSkeleton, QuoteTokenSkeleton } from "./public";

describe("public skeletons", () => {
  it("ProductsGridSkeleton renders 8 product-card blocks and a status label", () => {
    const html = renderToStaticMarkup(<ProductsGridSkeleton />);
    expect(html.match(/aspect-\[4\/3\]/g) ?? []).toHaveLength(8);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading products");
  });

  it("QuoteTokenSkeleton and ContactSkeleton include a status label", () => {
    expect(renderToStaticMarkup(<QuoteTokenSkeleton />)).toContain('role="status"');
    expect(renderToStaticMarkup(<ContactSkeleton />)).toContain('role="status"');
  });
});
