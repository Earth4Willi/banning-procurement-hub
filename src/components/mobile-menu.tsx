"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Gauge,
  List,
  X,
  House,
  Package,
  TreeStructure,
  Phone,
  Info,
  SignIn,
  SignOut,
  User,
} from "@phosphor-icons/react";

const PRIMARY = [
  { label: "Home", href: "/", icon: House },
  { label: "Materials", href: "/products", icon: Package },
  { label: "Categories", href: "/products", icon: TreeStructure },
];

const SECONDARY = [
  { label: "Contact", href: "/contact", icon: Phone },
  { label: "About", href: "/about", icon: Info },
];

type Props = {
  role?: "owner" | "staff" | "customer";
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
};

export function MobileMenu({ role, onOpenSignIn, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

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
              aria-hidden={!open || undefined}
              inert={!open || undefined}
              className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem+1px)] z-50 max-h-[calc(100dvh-calc(env(safe-area-inset-top)+4rem+1px))] overflow-y-auto border-b border-primary/10 bg-surface transition-transform duration-300 ${
                open
                  ? "translate-y-0"
                  : "-translate-y-[calc(100%+calc(env(safe-area-inset-top)+4rem+1px))] pointer-events-none"
              }`}
              style={{ maxHeight: "min(60vh, 500px)" }}
            >
              <nav className="flex flex-col gap-1 p-3" aria-label="Mobile nav">
                {role === "customer" && (
                  <>
                    <Link
                      href="/account"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                    >
                      <User weight="duotone" size={20} className="shrink-0 text-accent-dark" />
                      My account
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onSignOut?.();
                      }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                    >
                      <SignOut weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                      Sign out
                    </button>
                  </>
                )}

                {(role === "owner" || role === "staff") && (
                  <>
                    <Link
                      href="/admin"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                    >
                      <Gauge weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                      Admin dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onSignOut?.();
                      }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                    >
                      <SignOut weight="duotone" size={20} className="shrink-0 text-accent-dark" />
                      {role === "owner" ? "Owner · Sign out" : "Sign out"}
                    </button>
                  </>
                )}

                {!role && (
                  <>
                    <Link
                      href="/login"
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                    >
                      <SignIn weight="duotone" size={20} className="shrink-0 text-accent-dark" />
                      Sign in
                    </Link>
                    {process.env.NODE_ENV === "development" && (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          onOpenSignIn?.();
                        }}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
                      >
                        <Gauge weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                        Owner sign in
                      </button>
                    )}
                  </>
                )}

                <div className="my-1 border-t border-primary/10" />

                {PRIMARY.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                  >
                    <item.icon weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                    {item.label}
                  </Link>
                ))}

                <div className="my-1 border-t border-primary/10" />

                {SECONDARY.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                  >
                    <item.icon weight="duotone" size={20} className="shrink-0 text-ink-muted" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}