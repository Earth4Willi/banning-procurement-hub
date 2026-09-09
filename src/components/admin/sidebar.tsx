"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Camera,
  ChartBar,
  ChatCircleText,
  SignOut,
  SquaresFour,
  UsersThree,
} from "@phosphor-icons/react";
import type { Session } from "./helpers";
import { AVATAR_TYPES, readImageSize, validateImageClient } from "./avatar";

export type AdminView = "analytics" | "messages" | "customers" | "materials";

const ICONS: Record<AdminView, typeof ChartBar> = {
  analytics: ChartBar,
  messages: ChatCircleText,
  customers: UsersThree,
  materials: SquaresFour,
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
  const [avatarSrc, setAvatarSrc] = useState<string>(session.avatarUrl ?? "/owner-hero.jpg");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const firstName = session.email?.split("@")[0] ?? "owner";

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const rejected = validateImageClient(file);
    if (rejected) {
      setAvatarError(rejected);
      return;
    }
    const dimensions = await readImageSize(file).catch(() => null);
    if (!dimensions) {
      setAvatarError("Could not read that image. Try a JPEG, PNG, or WebP file.");
      return;
    }
    if (dimensions.width < 300 || dimensions.height < 300) {
      setAvatarError(`Pick an image at least 300×300 pixels (this one is ${dimensions.width}×${dimensions.height}).`);
      return;
    }
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/profile/image", { method: "POST", body, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;
      if (res.ok && data?.url) {
        setAvatarSrc(`${data.url}?v=${Date.now()}`);
        void session.refresh();
      } else {
        setAvatarError(data?.error?.message ?? "Upload failed. Try again.");
      }
    } catch {
      setAvatarError("Upload failed. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <nav className="sticky top-0 flex h-dvh flex-col overflow-y-auto bg-[#0d3d1a] text-white" aria-label="Admin navigation">
      <div className="dashboard-grid-bg relative">
        <div className="relative z-10 flex items-center gap-3 p-5">
          <div className="relative shrink-0">
            <img
              src={avatarSrc}
              alt="Owner profile photo"
              width={64}
              height={64}
              onError={(event) => {
                if (event.currentTarget.src !== "/owner-hero.jpg") event.currentTarget.src = "/owner-hero.jpg";
              }}
              className="size-14 rounded-full object-cover ring-2 ring-accent/70"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              aria-label="Upload profile picture"
              title="Upload profile picture"
              className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full bg-accent text-[#0d3d1a] shadow-md transition-colors hover:bg-accent-light disabled:opacity-50"
            >
              <Camera weight="duotone" size={13} aria-hidden="true" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              onChange={(event) => void handleAvatarPick(event)}
              className="hidden"
            />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Banning Procurement
            </p>
            <h1 className="truncate font-display text-base font-semibold tracking-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="truncate text-xs text-white/70">{session.email}</p>
          </div>
        </div>
        {avatarError ? (
          <p role="alert" className="relative z-10 px-5 pb-3 text-xs font-medium text-accent-light">
            {avatarError}
          </p>
        ) : null}
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

      <div className="mt-auto p-3">
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