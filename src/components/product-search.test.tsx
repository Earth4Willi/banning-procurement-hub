import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProductSearch } from "./product-search";
import { QuoteProvider } from "@/lib/quote-context";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function fakeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installFetch(catalog: { categories?: unknown[]; products?: unknown[] }) {
  const fn = vi.fn(async (_input: RequestInfo | URL) => {
    const url = String(_input);
    if (url === "/api/catalog") return fakeResponse(200, { ...catalog, dbAvailable: true });
    return fakeResponse(500, { error: { message: `Unmocked: ${url}` } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

let container: HTMLDivElement;
let root: Root;

function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<QuoteProvider>{node}</QuoteProvider>);
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function setSearch(value: string) {
  const input = container.querySelector('input[id="product-search"]') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => root?.unmount());
  container?.remove();
});

describe("ProductSearch", () => {
  it("falls back to the static catalog until /api/catalog resolves, then searches the DB catalog", async () => {
    const fetchMock = installFetch({
      categories: [{ id: "timber", name: "Timber", short: "Planed timber.", description: "", image: "/x", visible: true }],
      products: [
        {
          slug: "mango-board",
          categoryId: "timber",
          name: "Mango Board 2x4",
          brand: "Wurst",
          unit: "length",
          unitPrice: "GH₵ 45",
          image: "/products/mango.svg",
          description: "",
          stock: "in",
          pricingMode: "fixed",
          kind: "unit",
          visible: true,
        },
      ],
    });
    mount(<ProductSearch />);

    setSearch("mango");
    expect(container.textContent).toContain("No materials match your search.");

    await flush();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(container.textContent).toContain("Mango Board 2x4");
    expect(container.textContent).toContain("1 material found");
  });

  it("keeps the static fallback when the API returns no products", async () => {
    installFetch({ categories: [], products: [] });
    mount(<ProductSearch />);

    setSearch("ghacem");
    await flush();

    expect(container.textContent).toContain("Ghacem");
  });

  it("shows an empty state when no product matches", async () => {
    installFetch({ categories: [], products: [] });
    mount(<ProductSearch />);

    setSearch("zzzz-nonexistent");
    await flush();

    expect(container.textContent).toContain("No materials match your search.");
  });
});
