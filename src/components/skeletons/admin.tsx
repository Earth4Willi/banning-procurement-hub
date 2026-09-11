import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

type AdminTableSkeletonProps = {
  columns?: number;
  framed?: boolean;
};

export function AdminTableSkeleton({ columns = 5, framed = true }: AdminTableSkeletonProps) {
  const table = (
    <table className="w-full min-w-[700px] text-left text-sm" aria-hidden="true">
      <thead>
        <tr className="border-b border-primary/10">
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-3 w-16 rounded-md" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 5 }, (_, row) => (
          <tr key={row} className="border-b border-primary/10 last:border-0">
            {Array.from({ length: columns }, (_, col) => (
              <td key={col} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {col === 0 ? <Skeleton className="h-8 w-8 shrink-0 rounded-lg" /> : null}
                  <Skeleton className="h-3 w-full max-w-28 rounded-md" />
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!framed) return table;
  return <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-surface">{table}</div>;
}

export function MessagesListSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading messages
      </p>
      <ul className="grid gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-start justify-between gap-4 rounded-2xl border border-primary/10 bg-surface p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SettingsFormSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading settings
      </p>
      <div className="space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <section key={i} className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
            <Skeleton className="h-5 w-40 rounded-md" />
            <div className="mt-4 space-y-4">
              <div>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-10 w-full rounded-[10px]" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading admin
      </p>
      <Skeleton className="h-8 w-48 rounded-md" />
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/10 bg-surface p-4">
        <AdminTableSkeleton columns={5} framed={false} />
      </div>
    </div>
  );
}

export function QuoteHistorySkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading quote history
      </p>
      <div className="mt-3 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-primary/10 pb-2">
            <SkeletonText rows={1} className="w-1/3" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
