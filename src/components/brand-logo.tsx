export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-2.5" aria-label="Banning Procurement Hub home">
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px]">
        <img
          src="/main-logo.jpg"
          alt=""
          width={1152}
          height={864}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Banning<span className="text-primary-500"> Procurement</span> Hub
      </span>
    </a>
  );
}
