import { ProductsGridSkeleton } from "@/components/skeletons/public";

export default function Loading() {
  return (
    <section className="py-12 lg:py-20" aria-label="Loading products">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <ProductsGridSkeleton />
      </div>
    </section>
  );
}
