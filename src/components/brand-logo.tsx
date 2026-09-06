export function BrandLogo({
  href = "/",
  imgClassName = "h-14 w-auto sm:h-20",
}: { href?: string; imgClassName?: string }) {
  return (
    <a href={href} className="inline-flex items-center" aria-label="Banning Procurement Hub home">
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        height={72}
        decoding="async"
        className={`logo-light-mode ${imgClassName}`}
      />
      <img
        src="/logo-dark.svg"
        alt="Banning Procurement Hub"
        height={72}
        decoding="async"
        className={`logo-dark-mode ${imgClassName}`}
      />
    </a>
  );
}