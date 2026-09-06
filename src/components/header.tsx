"use client";

import { Quotes } from "@phosphor-icons/react";
import { categories, siteConfig } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";
import { formatItemCount } from "@/lib/format";
import { BrandLogo } from "./brand-logo";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Materials", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const { count } = useQuote();

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-surface/80 backdrop-blur-md">
      <div className="relative flex h-20 items-center sm:h-24">
        {/* Logo pinned to absolute left */}
        <div className="flex shrink-0 items-center">
          <BrandLogo />
        </div>

        {/* Nav links dead-centred in the viewport */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex" aria-label="Main nav">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-[10px] px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right-side actions pinned to absolute right */}
        <div className="ml-auto flex shrink-0 items-center gap-2 pr-4 sm:pr-6">
          <a
            href="/quote"
            className="hidden items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-xs font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light sm:inline-flex"
          >
            <Quotes weight="duotone" size={14} />
            <span>{count > 0 ? formatItemCount(count) : "Get a Quote"}</span>
          </a>

          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
