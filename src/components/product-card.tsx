"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Product, StockStatus } from "@/lib/site";
import { siteConfig } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";

type Props = {
  product: Product;
};

const STOCK_LABEL: Record<StockStatus, string> = {
  in: "In stock",
  limited: "Limited",
  out: "Out of stock",
};

const STOCK_BADGE_CLASSES: Record<StockStatus, string> = {
  in: "bg-primary text-white",
  limited: "bg-accent text-[#0d3d1a]",
  out: "bg-ink/85 text-white",
};

export function ProductCard({ product }: Props) {
  const { add } = useQuote();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<number | null>(null);
  const outOfStock = product.stock === "out";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = () => {
    add(product.slug);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-alt transition-transform duration-300 hover:-translate-y-1 sm:rounded-[16px]">
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
        <img
          src={product.image}
          alt={product.name}
          width={900}
          height={700}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "opacity-70 grayscale" : ""}`}
        />
        <span
          className={`absolute left-3 top-3 rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${STOCK_BADGE_CLASSES[product.stock]}`}
        >
          {STOCK_LABEL[product.stock]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-dark sm:text-[11px]">
          {product.brand}
        </p>
        <h3 className="mt-1 font-display text-sm font-semibold text-ink sm:text-base">{product.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-ink-muted sm:line-clamp-2">
          {product.description}
        </p>
        <p className="mt-auto flex items-baseline gap-2 pt-3 font-mono text-[15px] font-bold tracking-tight text-accent-dark">
          {product.unitPrice}
          <span className="text-[11px] font-normal tracking-normal text-ink-muted">{product.unit}</span>
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {siteConfig.responsePromise}
        </p>
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-disabled={outOfStock}
          className={`mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98] sm:px-3 sm:py-2 ${
            outOfStock
              ? "cursor-not-allowed bg-ink/10 text-ink-muted"
              : "bg-accent text-[#0d3d1a] hover:bg-accent-light"
          }`}
        >
          <span aria-live="polite">
            {added ? (
              <>
                <Check weight="duotone" size={14} className="inline" aria-hidden="true" />
                Added
              </>
            ) : outOfStock ? (
              "Unavailable"
            ) : (
              "Add to Quote"
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
