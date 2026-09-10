import { fetchCategories, fetchProducts } from "@/server/catalog-store";
import { CategoryCard } from "@/components/category-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-types";

export function buildCategoryCounts(
  categories: CatalogCategory[],
  products: CatalogProduct[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (product.visible === false) continue;
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
  }
  return counts;
}

export async function CategoryGrid() {
  const [fetchedCategories, fetchedProducts] = await Promise.all([
    fetchCategories(),
    fetchProducts(),
  ]);
  const visibleCategories = fetchedCategories.filter((category) => category.visible !== false);
  const counts = buildCategoryCounts(visibleCategories, fetchedProducts);

  return (
    <section className="py-24 lg:py-28" aria-label="Shop by material">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Reveal>
          <SectionHeading
            title="Shop by material"
            description="Nine categories, one verified supplier, and delivery measured bag for bag and piece for piece."
          />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.length > 0 ? (
            visibleCategories.map((category, index) => (
              <Reveal key={category.id} delay={(index % 3) * 0.08}>
                <CategoryCard category={category} count={counts.get(category.id) ?? 0} />
              </Reveal>
            ))
          ) : (
            <p className="text-base text-ink-muted">Real categories are coming soon.</p>
          )}
        </div>
      </div>
    </section>
  );
}