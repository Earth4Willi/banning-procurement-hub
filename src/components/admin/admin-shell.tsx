"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { useSession } from "@/lib/use-session";
import { SignInDialog } from "@/components/sign-in-dialog";
import { SidebarNav, signOutFlow, visibleViews, type AdminView } from "./sidebar";
import { MessagesView } from "./messages-view";
import { CustomersView } from "./customers-view";
import { MaterialsView } from "./materials-view";
import { InventoryView } from "./inventory-view";
import { SettingsView } from "./settings-view";
import { AnalyticsView } from "./analytics-view";
import { StaffView } from "./staff-view";
import type { Session } from "./helpers";
import { AdminShellSkeleton } from "@/components/skeletons/admin";

const DEFAULT_VIEW = "messages";

export default function AdminShell() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") ?? DEFAULT_VIEW) as AdminView;
  const tab = searchParams.get("tab") ?? undefined;
  const [badges, setBadges] = useState<Partial<Record<AdminView, number>>>({});
  const [signInOpen, setSignInOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refreshBadges = useCallback(async () => {
    try {
      const [q, m] = await Promise.all([
        fetch("/api/admin/quotes", { credentials: "same-origin" }),
        fetch("/api/admin/messages", { credentials: "same-origin" }),
      ]);
      if (!q.ok || !m.ok) return;
      const quotes = (await q.json()) as { quotes: { status: string }[] };
      const messages = (await m.json()) as { messages: { read: boolean }[] };
      setBadges({
        messages:
          quotes.quotes.filter((x) => x.status === "new").length +
          messages.messages.filter((x) => !x.read).length,
      });
    } catch {
      /* ignore polling failures */
    }
  }, []);

  useEffect(() => {
    void refreshBadges();
    const id = setInterval(() => void refreshBadges(), 30_000);
    const onFocus = () => void refreshBadges();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshBadges]);

  // Close the mobile menu when the active view changes (e.g. after a navigate).
  useEffect(() => {
    setMobileNavOpen(false);
  }, [view]);

  // Close the mobile menu on Escape.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Signed-out: open the sign-in dialog instead of redirecting. Staff in
  // production land here because the public "Owner sign in" buttons are
  // dev-only; the dialog is how they gain access.
  useEffect(() => {
    if (session.status === "signed-out") setSignInOpen(true);
  }, [session.status]);

  const navigate = (next: AdminView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    if (next !== "messages") params.delete("tab");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const views = visibleViews(session.role, session.scopes);

  // Guard manually-entered ?view= params the caller lacks scope for.
  useEffect(() => {
    if (session.status !== "signed-in") return;
    const requested = view as AdminView;
    if (!views.includes(requested)) navigate(views[0] ?? DEFAULT_VIEW);
  }, [view, views, session.status]);

  if (session.status === "loading") return <AdminShellSkeleton />;

  const signedIn = session.status === "signed-in";

  if (!signedIn) {
    return (
      <SignInDialog
        open={signInOpen || session.status === "signed-out"}
        onClose={() => setSignInOpen(false)}
        session={session}
      />
    );
  }

  const content = (() => {
    switch (view) {
      case "customers":
        return (
          <CustomersView
            session={session}
            onNeedRefresh={refreshBadges}
          />
        );
      case "materials":
        return (
          <MaterialsView
            session={session}
            tab="products"
            onNeedRefresh={refreshBadges}
          />
        );
      case "inventory":
        return <InventoryView session={session} />;
      case "settings":
        return (
          <SettingsView
            session={session}
            onNeedRefresh={refreshBadges}
          />
        );
      case "analytics":
        return <AnalyticsView session={session} />;
      case "staff":
        return <StaffView session={session} onNeedRefresh={refreshBadges} />;
      case "messages":
      default:
        return (
          <MessagesView
            session={session}
            tab={tab === "contact" ? "contact" : "quotes"}
            onNeedRefresh={refreshBadges}
          />
        );
    }
  })();

  return (
    <>
      <ShellLayout
        session={session}
        active={view}
        onNavigate={navigate}
        badges={badges}
        views={views}
        content={content}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
      />
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} session={session} />
    </>
  );
}

function ShellLayout(props: {
  session: Session;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  badges: Partial<Record<AdminView, number>>;
  views: AdminView[];
  content: React.ReactNode;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
}) {
  const { session, active, onNavigate, badges, views, content, mobileNavOpen, onToggleMobileNav } = props;

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip lg:flex-row">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 shrink-0 hidden lg:block">
        <SidebarNav
          session={session}
          active={active}
          onNavigate={onNavigate}
          badges={badges}
        />
      </aside>
      <MobileShellNav
        session={session}
        active={active}
        onNavigate={onNavigate}
        badges={badges}
        views={views}
        open={mobileNavOpen}
        onToggle={onToggleMobileNav}
      />
      <div className="min-w-0 flex-1 lg:pl-64">
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{content}</main>
      </div>
    </div>
  );
}

function MobileShellNav(props: {
  session: Session;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  badges: Partial<Record<AdminView, number>>;
  views: AdminView[];
  open: boolean;
  onToggle: () => void;
}) {
  const { session, active, onNavigate, badges, views, open, onToggle } = props;

  return (
    <>
      <div
        className="sticky top-0 z-30 w-full shrink-0 border-b border-primary/10 bg-surface/80 backdrop-blur lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="admin-drawer"
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="inline-flex shrink-0 items-center justify-center rounded-[10px] p-2 text-ink transition-colors hover:bg-surface-alt hover:text-ink"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            {open ? <X weight="duotone" size={20} aria-hidden="true" /> : <List weight="duotone" size={20} aria-hidden="true" />}
          </button>
          <span className="min-w-0 flex-1">
            <img
              src="/logo.svg"
              alt=""
              aria-hidden="true"
              decoding="async"
              height={32}
              className="logo-light-mode h-8 w-auto"
            />
            <img
              src="/logo-dark.svg"
              alt="Banning Procurement Hub"
              decoding="async"
              height={32}
              className="logo-dark-mode h-8 w-auto"
            />
          </span>
        </div>
        <nav
          className="hidden items-center gap-2 overflow-x-auto px-3 pb-2 md:flex"
          aria-label="Admin sections"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {views.map((view) => {
            const isActive = active === view;
            const badge = badges[view];
            return (
              <button
                key={view}
                type="button"
                onClick={() => onNavigate(view)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex shrink-0 items-center rounded-full px-4 text-sm font-semibold capitalize transition-colors ${
                  isActive
                    ? "bg-[#0d3d1a] text-white"
                    : "text-ink-muted hover:bg-surface-alt hover:text-ink"
                }`}
                style={{ minHeight: 40 }}
              >
                {view}
                {badge ? (
                  <span className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-4 text-[#0d3d1a]">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Slide-in drawer reusing the desktop sidebar (bg image included). */}
      <div
        id="admin-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        <div
          aria-hidden="true"
          onClick={onToggle}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[min(86%,19rem)] overflow-hidden shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarNav
            session={session}
            active={active}
            onNavigate={onNavigate}
            badges={badges}
          />
        </div>
      </div>
    </>
  );
}
