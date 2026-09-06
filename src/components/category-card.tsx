"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import type { Category } from "@/lib/site";

type Props = {
  category: Category;
  count: number;
};

export function CategoryCard({ category, count }: Props) {
  return (
    <Link
      href={`/products/${category.id}`}
      aria-label={`${category.name} materials`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-alt transition-transform duration-300 hover:-translate-y-1 sm:rounded-[16px]"
    >
      <div className="relative aspect-square overflow-hidden sm:aspect-[4/3]">
        <img
          src={category.image}
          alt={category.name}
          width={900}
          height={700}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-ink sm:text-lg">{category.name}</h3>
          <ArrowUpRight
            weight="duotone"
            size={18}
            className="mt-1 shrink-0 text-primary-500 transition-colors group-hover:text-accent"
          />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{category.short}</p>
        <p className="mt-auto pt-4 font-mono text-xs uppercase tracking-wider text-ink-muted">
          {count} {count === 1 ? "product" : "products"}
        </p>
      </div>
    </Link>
  );
}