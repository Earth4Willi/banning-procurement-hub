import { Skeleton } from "@/components/ui/skeleton";
import { ProductsGridSkeleton } from "@/components/skeletons/public";

function SkeletonBreadcrumb() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      <Skeleton className="h-4 w-14 rounded-md" />
      <span>/</span>
      <Skeleton className="h-4 w-20 rounded-md" />
      <span>/</span>
      <Skeleton className="h-4 w-24 rounded-md" />
    </div>
  );
}

export default function Loading() {
  return (
    <section className="py-12 lg:py-28" aria-label="Loading category">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <SkeletonBreadcrumb />
        <div className="mt-8">
          <ProductsGridSkeleton />
        </div>
      </div>
    </section>
  );
}
