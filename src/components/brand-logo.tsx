import { QuotationMark } from "./quotation-mark";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-2.5" aria-label="Banning Procurement Hub home">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-accent">
        <QuotationMark className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Banning<span className="text-primary-500"> Procurement</span> Hub
      </span>
    </a>
  );
}
