"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ClipboardText, DownloadSimple, Lock, X } from "@phosphor-icons/react";
import { useSession } from "@/lib/use-session";
import { siteConfig } from "@/lib/site";
import type { QuoteContact } from "@/lib/whatsapp";
import { validateQuoteContact } from "@/lib/validation";

const STATUSES = ["new", "reviewed", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

const MANUAL_EMPTY: QuoteContact = { name: "", phone: "", email: "", area: "", note: "" };

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_LIMIT_BYTES = 3 * 1024 * 1024;
const AVATAR_MIN_DIMENSION = 300;

type QuoteItem = { slug: string; label: string; quantity: number };
type Quote = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  note: string | null;
  items: QuoteItem[];
  status: Status;
  created_at: string;
};

type SecurityEvent = {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  dbAvailable: boolean;
};

export function AdminDashboard() {
  const session = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [load, setLoad] = useState<LoadState>({ loading: true, error: null, dbAvailable: true });
  const [busyId, setBusyId] = useState<string | null>(null);

  const [avatarSrc, setAvatarSrc] = useState<string>(session.avatarUrl ?? "/owner-hero.jpg");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState<QuoteContact>(MANUAL_EMPTY);
  const [manualErrors, setManualErrors] = useState<Partial<Record<keyof QuoteContact, string>>>({});
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoad((s) => ({ ...s, loading: true, error: null }));
    try {
      const [quotesRes, eventsRes] = await Promise.all([
        fetch("/api/admin/quotes", { credentials: "same-origin" }),
        fetch("/api/admin/events", { credentials: "same-origin" }),
      ]);
      if (!quotesRes.ok || !eventsRes.ok) {
        setLoad((s) => ({ ...s, loading: false, error: "Could not load dashboard data." }));
        return;
      }
      const quoteData = (await quotesRes.json()) as { quotes: Quote[]; dbAvailable: boolean };
      const eventData = (await eventsRes.json()) as { events: SecurityEvent[]; dbAvailable: boolean };
      setQuotes(quoteData.quotes);
      setEvents(eventData.events);
      setLoad({ loading: false, error: null, dbAvailable: quoteData.dbAvailable && eventData.dbAvailable });
    } catch {
      setLoad((s) => ({ ...s, loading: false, error: "Could not load dashboard data." }));
    }
  }, []);

  useEffect(() => {
    if (session.status === "signed-in") void loadData();
  }, [session.status, loadData]);

  const changeStatus = useCallback(
    async (quote: Quote, next: Status) => {
      if (next === quote.status) return;
      setBusyId(quote.id);
      try {
        const res = await fetch("/api/admin/quotes/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ id: quote.id, status: next }),
        });
        if (res.ok) {
          setQuotes((rows) => rows.map((row) => (row.id === quote.id ? { ...row, status: next } : row)));
        }
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const csv = useMemo(() => buildCsv(quotes), [quotes]);
  const newCount = quotes.filter((quote) => quote.status === "new").length;

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const rejected = avatarClientError(file);
    if (rejected) {
      setAvatarError(rejected);
      return;
    }
    const dimensions = await readImageSize(file).catch(() => null);
    if (!dimensions) {
      setAvatarError("Could not read that image. Try a JPEG, PNG, or WebP file.");
      return;
    }
    if (dimensions.width < AVATAR_MIN_DIMENSION || dimensions.height < AVATAR_MIN_DIMENSION) {
      setAvatarError(
        `Pick an image at least ${AVATAR_MIN_DIMENSION}×${AVATAR_MIN_DIMENSION} pixels (this one is ${dimensions.width}×${dimensions.height}).`,
      );
      return;
    }
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/profile/image", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
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

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateQuoteContact(manual);
    setManualErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setManualBusy(true);
    setManualError(null);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: manual.name,
          phone: manual.phone,
          email: manual.email ?? "",
          area: manual.area,
          note: manual.note ?? "",
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setManualError(data?.error?.message ?? "Could not save the quote.");
        return;
      }
      setManual(MANUAL_EMPTY);
      setManualErrors({});
      setManualOpen(false);
      void loadData();
    } catch {
      setManualError("Could not save the quote.");
    } finally {
      setManualBusy(false);
    }
  };

  const updateManual = (field: keyof QuoteContact, value: string) => {
    const next = { ...manual, [field]: value };
    setManual(next);
    setManualErrors((prev) => {
      const copy = { ...prev };
      if (field === "note") return copy;
      const error = validateQuoteContact(next)[field];
      if (error) copy[field] = error;
      else delete copy[field];
      return copy;
    });
  };

  if (session.status === "loading") {
    return <p className="text-sm text-ink-muted">Checking session…</p>;
  }

  if (session.status !== "signed-in") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-primary/10 bg-surface p-8 text-center">
        <Lock weight="duotone" size={28} className="mx-auto text-accent-dark" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">Owner sign-in required</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This dashboard is private. Use <span className="font-medium text-ink">Sign in</span> in the header to
          continue with your authenticator code.
        </p>
      </div>
    );
  }

  const firstName = session.email?.split("@")[0] ?? "owner";
  const manualInput = (field: keyof QuoteContact) =>
    `w-full rounded-[10px] border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:ring-2 ${
      manualErrors[field]
        ? "border-red-600 focus:border-red-600 focus:ring-red-600/40"
        : "border-primary/20 focus:border-primary focus:ring-accent/60"
    }`;

  return (
    <div className="space-y-12">
      {/* Hero band: portrait background + designed overlay + greeting */}
      <div className="relative overflow-hidden rounded-[20px] border border-primary/10">
        <img
          src="/owner-hero.jpg"
          alt=""
          aria-hidden="true"
          width={736}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d3d1a]/95 via-[#0d3d1a]/85 to-[#0d3d1a]/30" aria-hidden="true" />
        <div className="dashboard-grid-bg absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <img
                src={avatarSrc}
                alt="Owner profile photo"
                width={96}
                height={96}
                onError={(event) => {
                  if (event.currentTarget.src !== "/owner-hero.jpg") {
                    event.currentTarget.src = "/owner-hero.jpg";
                  }
                }}
                className="size-20 rounded-full object-cover ring-2 ring-accent/70 sm:size-24"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Upload profile picture"
                title="Upload profile picture"
                className="absolute -bottom-1 -right-1 inline-flex size-8 items-center justify-center rounded-full bg-accent text-[#0d3d1a] shadow-md transition-colors hover:bg-accent-light disabled:opacity-50"
              >
                <Camera weight="duotone" size={15} aria-hidden="true" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept={AVATAR_TYPES.join(",")}
                onChange={(event) => void handleAvatarPick(event)}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Owner dashboard
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1 text-sm text-white/70">Signed in as {session.email}.</p>
              {avatarError ? (
                <p role="alert" className="mt-2 text-xs font-medium text-accent-light">
                  {avatarError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!load.loading && quotes.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-white">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                {newCount} new
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setManualOpen((open) => !open)}
              aria-expanded={manualOpen}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              {manualOpen ? (
                <X weight="duotone" size={14} aria-hidden="true" />
              ) : (
                <ClipboardText weight="duotone" size={14} aria-hidden="true" />
              )}
              {manualOpen ? "Close" : "Add WhatsApp quote"}
            </button>
            <a
              href={URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))}
              download="bph-quotes.csv"
              aria-disabled={quotes.length === 0}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <DownloadSimple weight="duotone" size={14} aria-hidden="true" />
              Export CSV {quotes.length > 0 ? `(${quotes.length})` : ""}
            </a>
          </div>
        </div>
      </div>

      {manualOpen ? (
        <section
          aria-label="Add a WhatsApp quote"
          className="rounded-2xl border border-primary/10 bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                Add a WhatsApp quote
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                For messages you received directly on WhatsApp. The quote is saved to your inbox.
              </p>
            </div>
            <span className="rounded-[8px] bg-accent/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent-dark">
              Direct chat
            </span>
          </div>

          <form onSubmit={(event) => void handleManualSubmit(event)} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" noValidate>
            <div>
              <label htmlFor="manual-name" className="text-sm font-medium text-ink">
                Full name <span className="text-accent-dark">*</span>
              </label>
              <input
                id="manual-name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={manual.name}
                onChange={(event) => updateManual("name", event.target.value)}
                aria-invalid={manualErrors.name ? true : undefined}
                className={`mt-2 ${manualInput("name")}`}
              />
              {manualErrors.name ? (
                <p role="alert" className="mt-1 text-xs text-red-700">
                  {manualErrors.name}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="manual-phone" className="text-sm font-medium text-ink">
                Phone <span className="text-accent-dark">*</span>
              </label>
              <input
                id="manual-phone"
                type="tel"
                autoComplete="tel"
                value={manual.phone}
                onChange={(event) => updateManual("phone", event.target.value)}
                placeholder="055 885 0667"
                aria-invalid={manualErrors.phone ? true : undefined}
                className={`mt-2 ${manualInput("phone")}`}
              />
              {manualErrors.phone ? (
                <p role="alert" className="mt-1 text-xs text-red-700">
                  {manualErrors.phone}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="manual-area" className="text-sm font-medium text-ink">
                Delivery area <span className="text-accent-dark">*</span>
              </label>
              <select
                id="manual-area"
                value={manual.area}
                onChange={(event) => updateManual("area", event.target.value)}
                aria-invalid={manualErrors.area ? true : undefined}
                className={`mt-2 ${manualInput("area")}`}
              >
                <option value="" disabled>
                  Select your area…
                </option>
                {siteConfig.deliveryAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              {manualErrors.area ? (
                <p role="alert" className="mt-1 text-xs text-red-700">
                  {manualErrors.area}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="manual-note" className="text-sm font-medium text-ink">
                What they asked for
              </label>
              <textarea
                id="manual-note"
                rows={1}
                maxLength={2000}
                value={manual.note ?? ""}
                onChange={(event) => updateManual("note", event.target.value)}
                className={`mt-2 ${manualInput("note")}`}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={manualBusy}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-[#0d3d1a] transition-colors hover:bg-accent-light disabled:opacity-60"
              >
                <ClipboardText weight="duotone" size={14} aria-hidden="true" />
                {manualBusy ? "Saving…" : "Save quote"}
              </button>
              {manualError ? (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {manualError}
                </p>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {load.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {load.error} {!load.dbAvailable && "The dashboard depends on a live database."}
        </div>
      )}

      {!load.error && !load.dbAvailable && (
        <div className="rounded-xl border border-primary/20 bg-accent/10 p-4 text-sm text-ink" role="status">
          Live database not configured yet — quote requests are being accepted but not stored. Set the
          Supabase project credentials to start capturing them here.
        </div>
      )}

      {load.loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <section aria-label="Quote inbox">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Quote requests</h2>
            {quotes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
                No quote requests yet. Submissions appear here the moment the live database is connected.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium">Received</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Location</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="align-top">
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">{quote.reference}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">{formatDate(quote.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{quote.name}</div>
                          <div className="text-xs text-ink-muted">{quote.phone}</div>
                          {quote.email && <div className="text-xs text-ink-muted">{quote.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">{quote.area}</td>
                        <td className="max-w-[260px] px-4 py-3 text-xs text-ink-muted">
                          <div className="line-clamp-2" title={formatItems(quote.items)}>
                            {formatItems(quote.items)}
                          </div>
                          {quote.note && (
                            <div className="mt-1 border-l-2 border-primary/20 pl-2 text-ink-muted" title={quote.note}>
                              “{truncate(quote.note, 120)}”
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={quote.status}
                            disabled={busyId === quote.id}
                            onChange={(e) => void changeStatus(quote, e.target.value as Status)}
                            className="rounded-[8px] border border-primary/20 bg-surface px-2 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-label="Security events">
            <h2 className="font-display text-xl font-semibold tracking-tight text-ink">Security events</h2>
            {events.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-primary/20 bg-surface p-10 text-center text-sm text-ink-muted">
                No security events recorded yet.
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-primary/10 bg-surface">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary/10 text-xs uppercase tracking-wider text-ink-muted">
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">{formatDate(event.created_at)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-accent-dark">{event.event}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">{JSON.stringify(event.metadata)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function avatarClientError(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "Upload a JPEG, PNG, or WebP image.";
  if (file.size > AVATAR_LIMIT_BYTES) return "Image is too large — keep it under 3 MB.";
  return null;
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    image.src = url;
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function formatItems(items: QuoteItem[]): string {
  return items.map((item) => `${item.label} ×${item.quantity}`).join(" · ");
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildCsv(quotes: Quote[]): string {
  const header = ["reference", "created_at", "status", "name", "phone", "email", "area", "items", "note"];
  const rows = quotes.map((quote) => [
    quote.reference,
    quote.created_at,
    quote.status,
    quote.name,
    quote.phone,
    quote.email ?? "",
    quote.area,
    formatItems(quote.items),
    quote.note ?? "",
  ]);
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [header, ...rows].map((row) => row.map(escape).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}