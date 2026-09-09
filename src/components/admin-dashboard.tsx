"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadSimple, Lock } from "@phosphor-icons/react";
import { useSession } from "@/lib/use-session";

const STATUSES = ["new", "reviewed", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

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

  return (
    <div className="space-y-12">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight text-ink">
              <img
                src="/owner.jpg"
                alt="Owner portrait, William Trowell"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover ring-2 ring-accent/60"
              />
              Owner dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-muted">Quote requests and security events. Signed in as {session.email}.</p>
          </div>
          <a
            href={URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))}
            download="bph-quotes.csv"
            aria-disabled={quotes.length === 0}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-primary/20 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-alt disabled:pointer-events-none disabled:opacity-50"
          >
            <DownloadSimple weight="duotone" size={14} aria-hidden="true" />
            Export CSV {quotes.length > 0 ? `(${quotes.length})` : ""}
          </a>
        </div>
      </div>

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