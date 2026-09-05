"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { categories, products, productsByCategory, getCategory } from "@/lib/site";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";

const featuredCategories = categories.slice(0, 2);
const standardCategories = categories.slice(2);

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
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        <>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {featuredCategories.map((category, index) => (
              <Reveal key={category.id} delay={index * 0.08}>
                <CategoryPreview category={category} />
              </Reveal>
            ))}
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {standardCategories.map((category, index) => (
              <Reveal key={category.id} delay={index * 0.08}>
                <CategoryPreview category={category} />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryPreview({ category }: { category: (typeof categories)[number] }) {
  const topProducts = productsByCategory(category.id).slice(0, 3);
  return (
    <div>
      <CategoryCard category={category} count={productsByCategory(category.id).length} />
      {topProducts.length > 0 ? (
        <p className="mt-3 font-mono text-xs leading-relaxed tracking-wide text-ink-muted">
          <span className="uppercase tracking-wider text-accent-dark">Top picks:</span>{" "}
          {topProducts.map((product, index) => (
            <span key={product.slug}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              {product.name}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
