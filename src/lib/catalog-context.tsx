"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { categories as staticCategories, products as staticProducts } from "@/lib/site";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";

type CatalogContextValue = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  loading: boolean;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

function mapSiteCategories(): CatalogCategory[] {
  return staticCategories.map((c) => ({
    id: c.id,
    name: c.name,
    short: c.short,
    description: c.description,
    image: c.image,
    sortOrder: 0,
    visible: true,
  }));
}

function mapSiteProducts(): CatalogProduct[] {
  return staticProducts.map((p) => ({
    slug: p.slug,
    categoryId: p.categoryId,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    unitPrice: p.unitPrice,
    image: p.image,
    description: p.description,
    stock: p.stock,
    pricingMode: p.pricingMode,
    kind: p.kind,
    sortOrder: 0,
    visible: true,
  }));
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>(mapSiteCategories);
  const [products, setProducts] = useState<CatalogProduct[]>(mapSiteProducts);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog", { credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as {
        categories?: CatalogCategory[];
        products?: CatalogProduct[];
      } | null;
      if (data?.categories && data.categories.length > 0) setCategories(data.categories);
      if (data?.products && data.products.length > 0) setProducts(data.products);
    } catch {
      /* keep seeded data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const value = useMemo<CatalogContextValue>(
    () => ({ categories, products, loading }),
    [categories, products, loading],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
