import { categories, productsByCategory } from "@/lib/site";
import { CategoryCard } from "@/components/category-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

export function CategoryGrid() {
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
          {categories.length > 0 ? (
            categories.map((category, index) => (
              <Reveal key={category.id} delay={(index % 3) * 0.08}>
                <CategoryCard category={category} count={productsByCategory(category.id).length} />
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