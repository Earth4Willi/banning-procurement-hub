"use client";

import { Quotes } from "@phosphor-icons/react";
import { categories, siteConfig, stats } from "@/lib/site";
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

const regionsStat = stats.find((s) => s.value === "16");
const TICKER = [
  siteConfig.responsePromise,
  regionsStat ? `Delivered across all ${regionsStat.value} regions` : "Delivered across Ghana",
];

export function Header() {
  const { count } = useQuote();

  return (
    <>
      {/* Compact mobile nav bar: quote ticker, logo, dark mode toggle, hamburger only */}
      <header
        className="sticky top-0 z-50 border-b border-primary/10 bg-surface/80 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative overflow-hidden bg-accent">
          <div className="ticker-track flex w-max items-center text-[#0d3d1a]">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center gap-8 pr-8">
                {TICKER.map((msg) => (
                  <span
                    key={msg}
                    className="flex items-center gap-2 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-wider"
                  >
                    <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                    {msg}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-16 items-center justify-between px-4 sm:px-6">
          <BrandLogo imgClassName="h-9 w-auto" />

          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle compact />
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Desktop nav bar */}
      <header
        className="sticky top-0 z-50 hidden border-b border-primary/10 bg-surface/80 backdrop-blur-md lg:block"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative flex min-h-20 items-center sm:min-h-24">
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
          </div>
        </div>
      </header>
    </>
  );
}
