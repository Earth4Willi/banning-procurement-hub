import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, productsByCategory } from "@/lib/site";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";

type Props = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  return {
    title: cat ? `${cat.name} Materials` : "Materials",
    description: cat ? `Buy ${cat.name.toLowerCase()} in Ghana. ${cat.description}` : undefined,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const products = productsByCategory(cat.id);

  return (
    <>
      <section className="py-20 lg:py-28" aria-label={`${cat.name} materials`}>
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Products", href: "/products" },
              { label: cat.name },
            ]}
          />

          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <Reveal>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-dark">
                {cat.name}
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-5xl">
                {cat.name} materials
              </h1>
              <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted">
                {products.length} {products.length === 1 ? "product" : "products"}
              </p>
              <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-muted md:text-lg">
                {cat.description}
              </p>
            </Reveal>

            <Reveal delay={0.15} className="relative">
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={cat.image}
                  alt={cat.name}
                  width={900}
                  height={700}
                  loading="lazy"
                  className="h-auto w-full object-cover"
                />
              </div>
            </Reveal>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => (
              <li key={product.slug}>
                <Reveal delay={index * 0.06}>
                  <ProductCard product={product} />
                </Reveal>
              </li>
            ))}
          </ul>
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
