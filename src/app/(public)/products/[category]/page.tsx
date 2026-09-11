import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { fetchCategories, fetchProducts } from "@/server/catalog-store";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { BreadcrumbSchema, ProductListSchema } from "@/components/schema";

export const revalidate = 60;

type Props = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const fetchedCategories = await fetchCategories();
  const cat = fetchedCategories.find((c) => c.id === category && c.visible !== false);
  return {
    title: cat ? `${cat.name} Materials` : "Materials",
    description: cat ? `Buy ${cat.name.toLowerCase()} in Ghana. ${cat.description}` : undefined,
    alternates: cat ? { canonical: `/products/${cat.id}/` } : undefined,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const [fetchedCategories, allProducts] = await Promise.all([fetchCategories(), fetchProducts()]);
  const categories = fetchedCategories.filter((c) => c.visible !== false);
  const cat = categories.find((c) => c.id === category);
  if (!cat) notFound();

  const products = allProducts.filter((p) => p.categoryId === cat.id && p.visible !== false);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
          { name: cat.name, href: `/products/${cat.id}/` },
        ]}
      />
      {products.length > 0 && <ProductListSchema products={products} />}
      <section className="py-12 lg:py-28" aria-label={`${cat.name} materials`}>
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Products", href: "/products" },
              { label: cat.name },
            ]}
          />

          <div className="mt-6 grid items-center gap-6 lg:mt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
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
                <Image
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

          {products.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.slug}>
                <Reveal delay={index * 0.06}>
                  <ProductCard product={product} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-primary/20 bg-surface-alt px-4 py-12 text-center text-sm text-ink-muted">
            No products in this category yet. Message us on WhatsApp and we&apos;ll source it
            for you.
          </p>
        )}
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
