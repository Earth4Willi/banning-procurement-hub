"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Product } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const { add } = useQuote();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    add(product.slug);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-primary/10 bg-surface-alt">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          width={900}
          height={700}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-dark">
          {product.brand}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink">{product.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{product.description}</p>
        <p className="mt-auto pt-4 font-mono text-sm font-semibold text-ink">
          {product.unitPrice}
          <span className="ml-2 text-xs font-normal text-ink-muted">{product.unit}</span>
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
        >
          <span aria-live="polite">
            {added ? (
              <>
                <Check weight="bold" size={16} className="inline" aria-hidden="true" />
                Added
              </>
            ) : (
              "Add to Quote"
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
