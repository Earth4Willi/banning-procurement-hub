"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Quotes, SignIn, SignOut, User } from "@phosphor-icons/react";
import { siteConfig, stats } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";
import { formatItemCount } from "@/lib/format";
import { useSession } from "@/lib/use-session";
import { BrandLogo } from "./brand-logo";
import { MobileMenu } from "./mobile-menu";
import { SignInDialog } from "./sign-in-dialog";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Materials", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const regionsStat = stats.find((s) => s.value === "16");
const FALLBACK_TICKER = [
  siteConfig.responsePromise,
  regionsStat ? `Delivered across all ${regionsStat.value} regions` : "Delivered across Ghana",
];

type SettingsMarquee = { marquee?: { messages?: string[] } };

/** Reads the DB-backed marquee messages once on mount; falls back to static copy. */
function useMarqueeMessages(): string[] {
  const [messages, setMessages] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { credentials: "same-origin" })
      .then((res) => (res.ok ? (res.json() as Promise<SettingsMarquee>) : null))
      .then((data) => {
        if (cancelled) return;
        const raw = data?.marquee?.messages;
        const clean = Array.isArray(raw) ? raw.map((m) => m.trim()).filter(Boolean) : [];
        if (clean.length > 0) setMessages(clean);
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return messages && messages.length > 0 ? messages : FALLBACK_TICKER;
}

function TickerBand() {
  const messages = useMarqueeMessages();
  return (
    <div className="relative overflow-hidden bg-accent">
      <div className="ticker-track flex w-max items-center text-[#0d3d1a]">
        {[0, 1].map((dup) => (
          <div key={dup} aria-hidden={dup === 1} className="flex shrink-0 items-center gap-8 pr-8">
            {messages.map((msg, index) => (
              <span
                key={`${dup}-${index}`}
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
  );
}

export function Header() {
  const { count } = useQuote();
  const session = useSession();
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const [signInOpen, setSignInOpen] = useState(false);
  const openSignIn = () => setSignInOpen(true);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void session.refresh();
  }, [pathname, session.refresh]);

  const customerSignedIn = session.status === "signed-in" && session.role === "customer";
  const adminSignedIn = session.status === "signed-in" && (session.role === "owner" || session.role === "staff");

  return (
    <>
      {/* Compact mobile nav bar: quote ticker, logo, dark mode toggle, hamburger only */}
      <header
        className="sticky top-0 z-50 border-b border-primary/10 bg-surface/80 backdrop-blur-md lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <TickerBand />
        <div className="flex min-h-16 items-center justify-between px-4 sm:px-6">
          <BrandLogo imgClassName="h-12 w-auto" />

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/quote"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-2 text-xs font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light"
            >
              <Quotes weight="duotone" size={14} aria-hidden="true" />
              <span className="hidden min-[380px]:inline">
                {count > 0 ? formatItemCount(count) : "Request a Quote"}
              </span>
            </Link>
            <ThemeToggle compact />
            <MobileMenu
              role={session.status === "signed-in" ? (session.role ?? "customer") : undefined}
              onOpenSignIn={openSignIn}
              onSignOut={() => void session.signOut()}
            />
          </div>
        </div>
      </header>

      {/* Desktop nav bar */}
      <header
        className="sticky top-0 z-50 hidden border-b border-primary/10 bg-surface/80 backdrop-blur-md lg:block"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <TickerBand />
        <div className="relative flex min-h-20 items-center sm:min-h-24">
          {/* Logo pinned to absolute left */}
          <div className="flex shrink-0 items-center">
            <BrandLogo />
          </div>

          {/* Nav links dead-centred in the viewport */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex" aria-label="Main nav">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[10px] px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right-side actions pinned to absolute right */}
          <div className="ml-auto flex shrink-0 items-center gap-2 pr-4 sm:pr-6">
            {customerSignedIn ? (
              <>
                <Link
                  href="/account"
                  className="hidden items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-alt sm:inline-flex"
                >
                  <User weight="duotone" size={14} aria-hidden="true" />
                  My account
                </Link>
                <button
                  type="button"
                  onClick={() => void session.signOut()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="hidden h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink sm:inline-flex"
                >
                  <SignOut weight="duotone" size={16} aria-hidden="true" />
                </button>
              </>
            ) : adminSignedIn ? (
              <>
                <Link
                  href="/admin"
                  className="hidden items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-alt sm:inline-flex"
                >
                  <Gauge weight="duotone" size={14} aria-hidden="true" />
                  Admin
                </Link>
                <button
                  type="button"
                  onClick={() => void session.signOut()}
                  aria-label="Sign out"
                  title="Sign out"
                  className="hidden h-9 w-9 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink sm:inline-flex"
                >
                  <SignOut weight="duotone" size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-alt sm:inline-flex"
                >
                  <SignIn weight="duotone" size={14} aria-hidden="true" />
                  Sign in
                </Link>
                {process.env.NODE_ENV === "development" && (
                  <button
                    type="button"
                    onClick={() => setSignInOpen(true)}
                    className="hidden items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink sm:inline-flex"
                  >
                    Owner sign in
                  </button>
                )}
              </>
            )}
            <Link
              href="/quote"
              className="hidden items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-xs font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light sm:inline-flex"
            >
              <Quotes weight="duotone" size={14} />
              <span>{count > 0 ? formatItemCount(count) : "Request a Quote"}</span>
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} session={session} />
    </>
  );
}
