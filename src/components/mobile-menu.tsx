"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  List,
  X,
  House,
  Package,
  TreeStructure,
  FileText,
  Phone,
  Info,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { siteConfig } from "@/lib/site";
import { useQuote } from "@/lib/quote-context";

const PRIMARY = [
  { label: "Home", href: "/", icon: House },
  { label: "Materials", href: "/products", icon: Package },
  { label: "Categories", href: "/products", icon: TreeStructure },
];

const SECONDARY = [
  { label: "Contact", href: "/contact", icon: Phone },
  { label: "About", href: "/about", icon: Info },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { count } = useQuote();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative z-50 inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink transition-colors hover:bg-surface-alt"
      >
        {open ? <X weight="duotone" size={20} /> : <List weight="duotone" size={20} />}
      </button>

      {mounted &&
        createPortal(
          <>
            {open && (
              <div className="fixed inset-0 z-40 bg-black/30" onClick={close} aria-hidden="true" />
            )}

            <div
              id="mobile-menu-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem+1px)] z-50 max-h-[calc(100dvh-calc(env(safe-area-inset-top)+4rem+1px))] overflow-y-auto border-b border-primary/10 bg-surface transition-transform duration-300 ${
                open
                  ? "translate-y-0"
                  : "-translate-y-[calc(100%+calc(env(safe-area-inset-top)+4rem+1px))] pointer-events-none"
              }`}
              style={{ maxHeight: "min(60vh, 500px)" }}
            >
              <nav className="flex flex-col gap-1 p-3" aria-label="Mobile nav">
                {PRIMARY.map((item) => (
                  <a
                    key={item.href + item.label}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                  >
                    <item.icon weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                    {item.label}
                  </a>
                ))}

                <div className="my-1 border-t border-primary/10" />

                <a
                  href="/quote"
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                >
                  <FileText weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                  Get a Quote
                  {count > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold text-[#0d3d1a]">
                      {count}
                    </span>
                  )}
                </a>

                {SECONDARY.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                  >
                    <item.icon weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                    {item.label}
                  </a>
                ))}

                <div className="my-1 border-t border-primary/10" />

                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("Hello Banning Procurement Hub, I would like a quote.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                >
                  <WhatsappLogo weight="duotone" size={20} className="shrink-0 text-[#25D366]" />
                  WhatsApp Us
                </a>
              </nav>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}