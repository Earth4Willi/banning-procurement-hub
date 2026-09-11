"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check } from "@phosphor-icons/react";
import type { Product } from "@/lib/site";
import type { StockStatus } from "@/lib/catalog-types";
import { siteConfig } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";
import { track } from "@/lib/analytics";

type Props = {
  product: Product;
};

const STOCK_LABEL: Record<StockStatus, string> = {
  in: "In Stock",
  limited: "Limited Stock",
  out: "Out of Stock",
};

const STOCK_BADGE_CLASSES: Record<StockStatus, string> = {
  in: "bg-primary text-white",
  limited: "bg-accent text-[#0d3d1a]",
  out: "bg-ink/85 text-white",
};

const ON_REQUEST_BADGE = "bg-violet-600/90 text-white";

export function ProductCard({ product }: Props) {
  const { add } = useQuote();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<number | null>(null);
  const outOfStock = !product.trackInventory
    ? false
    : product.stockStatus === "out";
  const isOnRequest = !product.trackInventory;
  const badgeClass = isOnRequest
    ? ON_REQUEST_BADGE
    : product.stockStatus === "in"
      ? STOCK_BADGE_CLASSES.in
      : product.stockStatus === "limited"
        ? STOCK_BADGE_CLASSES.limited
        : STOCK_BADGE_CLASSES.out;

  const badgeText = isOnRequest
    ? "Available on Request"
    : product.stockStatus === "in"
      ? `${STOCK_LABEL.in} — ${product.stockQuantity} available`
      : product.stockStatus === "limited"
        ? `${STOCK_LABEL.limited} — only ${product.stockQuantity} left`
        : STOCK_LABEL.out;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = () => {
    add(product.slug);
    setAdded(true);
    track("add_to_quote", { product: product.slug, category: product.categoryId });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-alt transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_12px_40px_rgba(13,61,26,0.12)] sm:rounded-[16px]">
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width:1280px) 25vw, (min-width:640px) 33vw, 50vw"
          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${outOfStock ? "opacity-70 grayscale" : ""}`}
        />
        <span aria-hidden="true" className="shine-sweep" />
        <span
          className={`absolute left-3 top-3 rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
        >
          {badgeText}
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
        <p
          className={`mt-auto flex items-baseline gap-2 pt-3 font-mono tracking-tight transition-[transform,color] duration-200 group-hover:scale-[1.03] group-hover:text-accent-dark ${
            product.pricingMode === "fixed" ? "text-[15px] font-bold" : "text-[13px] font-semibold text-ink-muted"
          }`}
        >
          {product.pricingMode === "fixed" ? (
            product.unitPrice
          ) : (
            <span className="text-[13px] font-semibold tracking-tight">Price on request</span>
          )}
          <span className="text-[11px] font-normal tracking-normal text-ink-muted">{product.unit}</span>
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {siteConfig.responsePromise}
        </p>
        {outOfStock || isOnRequest ? (
          <a
            href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(`Hi, I'd like to enquire about ${product.name}. Is this available?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] bg-violet-600/15 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-600/25 sm:px-3 sm:py-2"
          >
            Request Quote
          </a>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className={`mt-3 inline-flex items-center justify-center gap-2 rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.98] sm:px-3 sm:py-2 ${
              added
                ? "add-pulse bg-accent text-[#0d3d1a]"
                : "bg-accent text-[#0d3d1a] hover:bg-accent-light"
            }`}
          >
            <span aria-live="polite">
              {added ? (
                <>
                  <Check weight="duotone" size={14} className="pop-in inline" aria-hidden="true" />
                  Added
                </>
              ) : (
                "Add to quote"
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
