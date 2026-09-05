import Link from "next/link";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  items: Crumb[];
};

export function Breadcrumbs({ items }: Props) {
  return (
    <nav aria-label="Breadcrumbs" className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {isLast || !item.href ? (
              <span aria-current="page" className="font-medium text-ink">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="transition-colors hover:text-ink">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
