"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleNotch, LockKey, SignOut, X } from "@phosphor-icons/react";

type SessionLike = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  error?: string;
  signIn: (input: { email: string; password: string; totpCode: string }) => Promise<boolean>;
  signOut: () => Promise<void>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  session: SessionLike;
};

export function SignInDialog({ open, onClose, session }: Props) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const first = dialogRef.current?.querySelector<HTMLElement>("input");
    first?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || session.status !== "signed-out") return;
    setBusy(true);
    const ok = await session.signIn({ email, password, totpCode });
    setBusy(false);
    if (ok) {
      setEmail("");
      setPassword("");
      setTotpCode("");
      onClose();
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Owner sign in"
        className="relative w-full max-w-sm rounded-[16px] border border-primary/10 bg-surface p-6 shadow-[0_24px_60px_rgba(13,61,26,0.25)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Owner sign in</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Two-factor access for the site owner.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <X weight="duotone" size={18} />
          </button>
        </div>

        {session.status === "signed-in" ? (
          <div className="mt-5 flex flex-col items-start gap-3">
            <p className="text-sm text-ink">
              Signed in as <span className="font-semibold">{session.email}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                void session.signOut();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-xs font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light"
            >
              <SignOut weight="duotone" size={14} />
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
              Email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-normal text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent"
                placeholder="owner@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[10px] border border-primary/20 bg-surface px-3 py-2 text-sm font-normal text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent"
                placeholder="••••••••"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
              Authenticator code
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="rounded-[10px] border border-primary/20 bg-surface px-3 py-2 font-mono text-sm font-normal tracking-[0.3em] text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent"
                placeholder="000000"
              />
            </label>

            {session.error && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {session.error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LockKey weight="duotone" size={15} />
                  Sign in
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}