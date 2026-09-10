"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { useSession } from "@/lib/use-session";
import { SidebarNav, signOutFlow, type AdminView } from "./sidebar";
import { MessagesView } from "./messages-view";
import { CustomersView } from "./customers-view";
import { MaterialsView } from "./materials-view";
import type { Session } from "./helpers";

const VIEWS: AdminView[] = ["messages", "customers", "materials"];

export default function AdminShell() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") ?? "messages") as AdminView;
  const tab = searchParams.get("tab") ?? undefined;
  const [badges, setBadges] = useState<Partial<Record<AdminView, number>>>({});

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

  useEffect(() => {
    if (session.status === "signed-out") {
      router.replace("/admin/login");
    }
  }, [session.status, router]);

  const navigate = (next: AdminView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    if (next !== "messages") params.delete("tab");
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (session.status === "loading")
    return <p className="p-6 text-sm text-ink-muted">Checking session…</p>;
  if (session.status === "signed-out") return null;

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
    <ShellLayout
      session={session}
      active={view}
      onNavigate={navigate}
      badges={badges}
      content={content}
    />
  );
}

function ShellLayout(props: {
  session: Session;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  badges: Partial<Record<AdminView, number>>;
  content: React.ReactNode;
}) {
  const { session, active, onNavigate, badges, content } = props;
  const router = useRouter();

  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 w-64 hidden lg:block">
        <SidebarNav
          session={session}
          active={active}
          onNavigate={onNavigate}
          badges={badges}
        />
      </aside>
      <div className="flex-1 lg:pl-64">
        <MobilePillNav
          active={active}
          onNavigate={onNavigate}
          badges={badges}
          session={session}
          router={router}
        />
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{content}</main>
      </div>
    </div>
  );
}

function MobilePillNav(props: {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  badges: Partial<Record<AdminView, number>>;
  session: Session;
  router: ReturnType<typeof useRouter>;
}) {
  const { active, onNavigate, badges, session, router } = props;

  return (
    <nav
      className="sticky top-0 z-30 flex items-center gap-2 overflow-x-auto border-b border-primary/10 bg-surface/80 px-4 py-2 backdrop-blur lg:hidden"
      aria-label="Admin navigation"
    >
      {VIEWS.map((view) => {
        const isActive = active === view;
        const badge = badges[view];
        return (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            aria-current={isActive ? "page" : undefined}
            className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              isActive
                ? "bg-[#0d3d1a] text-white"
                : "text-ink-muted hover:bg-surface-alt hover:text-ink"
            }`}
          >
            {view}
            {badge ? (
              <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-accent font-mono text-[9px] font-bold text-[#0d3d1a]">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => signOutFlow(session, router)}
        className="ml-auto shrink-0 inline-flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
        aria-label="Sign out"
      >
        <SignOut weight="duotone" size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
