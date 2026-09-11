import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export function ProductsGridSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading products
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-xl border border-primary/10 bg-surface-alt sm:rounded-[16px]"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-[16/10]" />
            <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
              <Skeleton className="h-3 w-2/3 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="mt-auto h-4 w-1/3 rounded-md" />
              <Skeleton className="h-8 w-1/2 rounded-[10px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuoteTokenSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading quote
      </p>
      <div className="rounded-2xl border border-primary/10 bg-surface p-6">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="mt-3 h-7 w-56 rounded-md" />
        <Skeleton className="mt-1 h-4 w-40 rounded-md" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <SkeletonText rows={1} className="w-1/2" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-primary/10 bg-surface-alt p-4">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="mt-2 h-6 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ContactSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading contact form
      </p>
      <Skeleton className="h-7 w-40 rounded-md" />
      <div className="mt-6 rounded-2xl border border-primary/10 bg-surface p-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="mb-4">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
          </div>
        ))}
        <div className="mb-4">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="mt-2 h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[10px]" />
      </div>
    </div>
  );
}
