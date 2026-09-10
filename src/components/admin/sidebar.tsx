"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowSquareOut, ChatCircleText, Gear, SignOut, SquaresFour, UsersThree } from "@phosphor-icons/react";
import type { Session } from "./helpers";

export type AdminView = "messages" | "customers" | "materials" | "settings";

const ICONS: Record<AdminView, typeof ChatCircleText> = {
  messages: ChatCircleText,
  customers: UsersThree,
  materials: SquaresFour,
  settings: Gear,
};

export function signOutFlow(session: Session, router: ReturnType<typeof useRouter>): void {
  void (async () => {
    await session.signOut();
    router.push("/");
  })();
}

export function SidebarNav(props: {
  session: Session;
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  badges: Partial<Record<AdminView, number>>;
}) {
  const { session, active, onNavigate, badges } = props;
  const router = useRouter();
  const pathname = usePathname();

  const firstName = session.email?.split("@")[0] ?? "owner";

  return (
    <nav
      className="sticky top-0 flex h-dvh flex-col overflow-y-auto text-white"
      aria-label="Admin navigation"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgb(13 61 26 / 0.94) 0%, rgb(10 42 19 / 0.97) 60%, rgb(7 31 14 / 0.98) 100%), url(/owner-hero.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "top center",
      }}
    >
      <div className="relative">
        <div className="relative z-10 flex items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold tracking-tight text-accent">Banning Procurement Hub</p>
            <h1 className="mt-0.5 break-words font-display text-lg font-semibold leading-snug tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="mt-0.5 break-all text-xs leading-snug text-white/70">{session.email}</p>
          </div>
        </div>
      </div>

      <ul className="mt-2 flex flex-col gap-1 px-3">
        {Object.entries(ICONS).map(([view, Icon]) => {
          const current = view as AdminView;
          const isActive = active === current;
          const badge = badges[current];
          return (
            <li key={view}>
              <Link
                href={`${pathname}?view=${current}`}
                onClick={() => onNavigate(current)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
                <Icon weight={isActive ? "duotone" : "regular"} size={18} aria-hidden="true" />
                <span className="flex-1 capitalize">{current}</span>
                {badge ? (
                  <span className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center font-mono text-[10px] font-bold leading-none text-[#0d3d1a]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-1 p-3">
        <a
          href="/"
          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowSquareOut weight="duotone" size={18} aria-hidden="true" />
          Back to site
        </a>
        <button
          type="button"
          onClick={() => signOutFlow(session, router)}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <SignOut weight="duotone" size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </nav>
  );
}
