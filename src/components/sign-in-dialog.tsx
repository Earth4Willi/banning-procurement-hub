"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CircleNotch, LockKey, SignOut, X } from "@phosphor-icons/react";
import type { BeginLoginResult } from "@/lib/use-session";

type SessionLike = {
  status: "loading" | "signed-out" | "signed-in";
  email?: string;
  error?: string;
  beginLogin: (input: { email: string; password: string }) => Promise<BeginLoginResult>;
  verifyCode: (pendingId: string, totpCode: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  session: SessionLike;
};

export function SignInDialog({ open, onClose, session }: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("credentials");
    setEmail("");
    setPassword("");
    setTotpCode("");
    setPendingId("");
    setBusy(false);
  }, [open]);

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
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timer);
    };
  }, [open, step]);

  async function handleCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await session.beginLogin({ email, password });
    setBusy(false);
    if (result.ok && result.pendingId) {
      setPendingId(result.pendingId);
      setTotpCode("");
      setStep("code");
    }
  }

  async function handleCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !pendingId) return;
    setBusy(true);
    const ok = await session.verifyCode(pendingId, totpCode);
    setBusy(false);
    if (ok) {
      setEmail("");
      setPassword("");
      setTotpCode("");
      setPendingId("");
      setStep("credentials");
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
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-primary/10 bg-surface shadow-[0_24px_60px_rgba(13,61,26,0.35)] sm:max-w-lg sm:flex-row"
      >
        <div
          className="relative h-32 w-full shrink-0 bg-cover bg-center sm:h-auto sm:w-2/5"
          style={{ backgroundImage: "url(/login-bg.jpg)" }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                {step === "code" ? "Enter your code" : "Owner sign in"}
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                {step === "code"
                  ? "Open your authenticator app for the 6-digit code."
                  : "Two-factor access for the site owner."}
              </p>
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

          <div className="mt-5">
            {session.status === "signed-in" ? (
              <div className="flex flex-col items-start gap-3">
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
            ) : step === "code" ? (
              <form onSubmit={handleCode} className="flex flex-col gap-3">
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
                    className="rounded-[10px] border border-primary/20 bg-surface px-3 py-2 font-mono text-base tracking-[0.3em] text-ink outline-none transition-colors placeholder:text-ink-muted/60 focus:border-accent"
                    placeholder="000000"
                  />
                </label>

                {session.error && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {session.error}
                  </p>
                )}

                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("credentials")}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt"
                  >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <CircleNotch size={16} className="animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      "Verify & sign in"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCredentials} className="flex flex-col gap-3">
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
                      Checking…
                    </>
                  ) : (
                    <>
                      <LockKey weight="duotone" size={15} />
                      Continue
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-ink-muted">
                  A 6-digit code from your authenticator app is the next step.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}