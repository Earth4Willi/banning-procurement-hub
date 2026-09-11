type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton ${className ?? ""}`} />;
}

type SkeletonTextProps = {
  rows?: number;
  className?: string;
};

export function SkeletonText({ rows = 2, className }: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`h-3 rounded-md ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
