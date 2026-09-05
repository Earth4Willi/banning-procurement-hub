"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { List, X, Phone, WhatsappLogo } from "@phosphor-icons/react";
import { categories, siteConfig } from "@/lib/site";
import { BrandLogo } from "./brand-logo";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Materials", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

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
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-ink transition-colors hover:bg-surface-alt"
      >
        {open ? <X weight="duotone" size={22} /> : <List weight="duotone" size={22} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={close} aria-hidden="true" />
      )}

      <div
        id="mobile-menu-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-primary/10 bg-surface transition-transform duration-300 ${
          open ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
        style={{ maxHeight: "min(80vh, 600px)" }}
      >
        <nav className="flex flex-col gap-1 p-4" aria-label="Mobile nav">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={close}
              className="rounded-[10px] px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
            >
              {item.label}
            </a>
          ))}

          <hr className="my-2 border-primary/10" />

          <span className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Categories
          </span>
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/products/${cat.id}`}
              onClick={close}
              className="rounded-[10px] px-4 py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
            >
              {cat.name}
            </a>
          ))}

          <hr className="my-2 border-primary/10" />

          <a
            href={`tel:${siteConfig.phoneIntl}`}
            className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            <Phone weight="duotone" size={18} className="text-primary-500" />
            Call {siteConfig.phoneDisplay}
          </a>

          <a
            href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("Hello Banning Procurement Hub, I would like a quote.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            <WhatsappLogo weight="duotone" size={18} className="text-[#25D366]" />
            WhatsApp Us
          </a>

          <a
            href="/quote"
            onClick={close}
            className="mt-2 inline-flex items-center justify-center rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent-light"
          >
            Get a Quote
          </a>
        </nav>
      </div>
    </div>
  );
}
