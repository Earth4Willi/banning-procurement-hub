"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, ReactNode } from "react";
import { initialQuoteState, QuoteItem, quoteCount, quoteReducer } from "./quote-reducer";
import { getProduct } from "./site";
import { QuoteLine } from "./whatsapp";
import type { CatalogProduct } from "./catalog-types";

type QuoteContextValue = {
  items: QuoteItem[];
  count: number;
  lines: QuoteLine[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);
const STORAGE_KEY = "bph-quote";

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quoteReducer, initialQuoteState);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);

  // DB-first product lookup: admin-created (DB-only) products survive quote
  // hydration because /api/catalog is the same DB-backed source the site uses.
  // Static site.ts data remains the fallback when the catalog is unreachable.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog", { credentials: "same-origin" })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        const products = (data as { products?: CatalogProduct[] } | null)?.products;
        if (!cancelled && Array.isArray(products) && products.length > 0) {
          setCatalogProducts(products);
        }
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: QuoteItem[] };
        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((item) => {
            if (item.qty > 0) dispatch({ type: "add", productId: item.productId });
            if (item.qty > 1) dispatch({ type: "setQty", productId: item.productId, qty: item.qty });
          });
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / storage disabled — cart keeps working in memory */
    }
  }, [state]);

  const value = useMemo<QuoteContextValue>(() => {
    const lines: QuoteLine[] = state.items
      .flatMap((item) => {
        const product =
          catalogProducts.find((p) => p.slug === item.productId) ?? getProduct(item.productId);
        return product
          ? [{
              name: product.name,
              unit: product.unit,
              unitPrice: product.pricingMode === "quote" ? "" : product.unitPrice,
              qty: item.qty,
            }]
          : [];
      });
    return {
      items: state.items,
      count: quoteCount(state),
      lines,
      add: (productId) => dispatch({ type: "add", productId }),
      remove: (productId) => dispatch({ type: "remove", productId }),
      setQty: (productId, qty) => dispatch({ type: "setQty", productId, qty }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state, catalogProducts]);

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
}
