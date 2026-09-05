import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ProductSearch } from "@/components/product-search";

export const metadata: Metadata = {
  title: "Browse Building Materials",
  description:
    "Browse cement, iron rods, tiles, roofing, plumbing and electrical materials with live search. Request a quote and get nationwide delivery across Ghana.",
  alternates: { canonical: "/products/" },
};

export default function ProductsPage() {
  return (
    <>
      <section className="py-20 lg:py-28" aria-label="Catalogue overview">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
              Catalogue
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Browse materials
            </h1>
            <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
              Six categories covering cement, iron rods, tiles, roofing, plumbing and electricals, all
              available to quote and delivered across Ghana.
            </p>
          </Reveal>

          <div className="mt-12">
            <Reveal>
              <ProductSearch />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-[#0d3d1a] py-20 lg:py-24" aria-label="Request a quote">
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
