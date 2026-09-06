export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="inline-flex items-center" aria-label="Banning Procurement Hub home">
      <img
        src="/logo.svg"
        alt="Banning Procurement Hub"
        height={72}
        decoding="async"
        className="h-[68px] w-auto sm:h-20"
      />
    </a>
  );
}
