import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { CategoryGrid, buildCategoryCounts } from "./category-grid";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/server/catalog-store", () => ({
  fetchCategories: vi.fn(),
  fetchProducts: vi.fn(),
}));

import { fetchCategories, fetchProducts } from "@/server/catalog-store";

const mockedFetchCategories = vi.mocked(fetchCategories);
const mockedFetchProducts = vi.mocked(fetchProducts);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

let container: HTMLDivElement;
let root: Root;

async function mountGrid() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const element = await CategoryGrid();
  await act(async () => {
    root.render(element);
  });
}

afterEach(() => {
  vi.clearAllMocks();
  act(() => root?.unmount());
  container?.remove();
});

const CATEGORY: CatalogCategory = {
  id: "cement",
  name: "Cement",
  short: "Bagged and bulk cement.",
  description: "",
  image: "/categories/cement.svg",
  visible: true,
};

const HIDDEN_CATEGORY: CatalogCategory = {
  ...CATEGORY,
  id: "secret",
  name: "Secret Range",
  short: "Hidden.",
  description: "",
  image: "/categories/secret.svg",
  visible: false,
};

const PRODUCT = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  slug: "ghacem-supacem",
  categoryId: "cement",
  name: "Ghacem Supacem",
  brand: "Ghacem",
  unit: "bag (50kg)",
  unitPrice: "GH₵ 150",
  image: "/products/supacem.svg",
  description: "",
  stock: "in",
  pricingMode: "fixed",
  kind: "unit",
  visible: true,
  ...over,
});

describe("CategoryGrid", () => {
  it("renders visible categories with counts from visible products only", async () => {
    mockedFetchCategories.mockResolvedValue([CATEGORY, HIDDEN_CATEGORY]);
    mockedFetchProducts.mockResolvedValue([
      PRODUCT(),
      PRODUCT({ slug: "b", visible: false }),
      PRODUCT({ slug: "c" }),
    ]);

    await mountGrid();

    const text = container.textContent ?? "";
    expect(text).toContain("Cement");
    expect(text).toContain("Bagged and bulk cement.");
    expect(text).toContain("2 products");
    expect(text).not.toContain("Secret Range");
  });

  it("shows the empty state when no visible categories exist", async () => {
    mockedFetchCategories.mockResolvedValue([HIDDEN_CATEGORY]);
    mockedFetchProducts.mockResolvedValue([PRODUCT()]);

    await mountGrid();

    expect(container.textContent).toContain("Real categories are coming soon.");
  });

  it("links each card to its category page", async () => {
    mockedFetchCategories.mockResolvedValue([CATEGORY]);
    mockedFetchProducts.mockResolvedValue([]);

    await mountGrid();

    const link = container.querySelector('a[href="/products/cement"]');
    expect(link).not.toBeNull();
  });
});

describe("buildCategoryCounts", () => {
  it("excludes hidden products from a visible category's count", () => {
    const counts = buildCategoryCounts([
      PRODUCT(),
      PRODUCT({ slug: "b", visible: false }),
      PRODUCT({ slug: "c" }),
    ]);
    expect(counts.get("cement")).toBe(2);
  });

  it("keys counts per categoryId; category visibility is filtered upstream", () => {
    const counts = buildCategoryCounts([PRODUCT({ slug: "c", categoryId: "secret" })]);
    expect(counts.get("secret")).toBe(1);
  });
});
