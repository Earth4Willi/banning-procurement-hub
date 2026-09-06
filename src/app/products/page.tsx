import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ProductSearch } from "@/components/product-search";
import { categories, productsByCategory } from "@/lib/site";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "Browse Building Materials",
  description:
    "Browse cement, iron rods, tiles, roofing, plumbing and electrical materials with live search. Request a quote and get nationwide delivery across Ghana.",
  alternates: { canonical: "/products/" },
};

export default function ProductsPage() {
  return (
    <>
      <section className="pb-4 pt-14 lg:pt-28" aria-label="Catalogue overview">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Catalogue
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Browse materials
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Six categories covering cement, iron rods, tiles, roofing, plumbing and electricals.
              Browse by material, or search across everything.
            </p>
          </Reveal>

          <div className="mt-10">
            <Reveal>
              <ProductSearch />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-20" aria-label="Materials by category">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <nav
            aria-label="Jump to category"
            className="sticky top-[calc(env(safe-area-inset-top)+4rem+1px)] z-30 -mx-4 border-b border-primary/10 bg-surface/95 px-4 py-3 backdrop-blur-sm lg:top-[calc(env(safe-area-inset-top)+6rem+1px)]"
          >
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className="rounded-[10px] border border-primary/15 bg-surface px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary transition-all duration-300 hover:-translate-y-1 hover:bg-primary hover:text-white"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 space-y-10 lg:mt-12 lg:space-y-16">
            {categories.map((category) => {
              const products = productsByCategory(category.id);
              return (
                <section
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-32"
                  aria-label={`${category.name} materials`}
                >
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                        {category.name}
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">{category.short}</p>
                    </div>
                    <Link
                      href={`/products/${category.id}`}
                      className="font-mono text-xs font-semibold uppercase tracking-wider text-accent-dark transition-colors hover:text-primary"
                    >
                      View all
                    </Link>
                  </div>
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.map((product, index) => (
                      <li key={product.slug}>
                        <Reveal delay={(index % 4) * 0.05}>
                          <ProductCard product={product} />
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0d3d1a] py-14 lg:py-24" aria-label="Request a quote">
        <div className="mx-auto max-w-[1400px] px-4 text-center md:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              Need a price for your project?
            </h2>
            <p className="mx-auto mt-4 max-w-[65ch] text-base leading-relaxed text-white/80">
              Tell us what you need, and we will confirm pricing and delivery within 24 hours.
            </p>
            <div className="mt-8">
              <Link
                href="/quote"
                className="inline-flex rounded-[10px] bg-accent px-7 py-3 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light active:scale-[0.98]"
              >
                Get a Quote
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
