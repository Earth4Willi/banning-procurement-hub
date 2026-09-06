"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { products, getCategory } from "@/lib/site";
import { ProductCard } from "@/components/product-card";

export function ProductSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return products.filter((product) => {
      const category = getCategory(product.categoryId);
      return (
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        (category?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query]);

  const searching = query.trim().length > 0;

  return (
    <div>
      <div className="max-w-xl">
        <label htmlFor="product-search" className="text-sm font-medium text-ink">
          Search materials
        </label>
        <div className="relative mt-2">
          <MagnifyingGlass
            weight="duotone"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, brand or category"
            className="w-full rounded-[10px] border border-primary/20 bg-surface px-11 py-3 text-base text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-accent/60"
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {searching
            ? results
              ? `${results.length} material${results.length === 1 ? "" : "s"} found`
              : "No materials match your search."
            : "Showing all categories"}
        </p>
      </div>

      {searching ? (
        <div className="mt-12">
          {results && results.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-ink-muted">No materials match your search.</p>
          )}
        </div>
      ) : (
        <p className="mt-10 text-sm text-ink-muted">Or scroll to browse by category below.</p>
      )}
    </div>
  );
}
