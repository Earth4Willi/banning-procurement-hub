"use client";

import { useCallback, useEffect, useState } from "react";
import { ChartPie, DownloadSimple, EnvelopeSimple, Hourglass, UsersThree } from "@phosphor-icons/react";
import type { AnalyticsResult } from "@/server/analytics";
import type { QuoteRow, Session } from "./helpers";
import { buildCsv, formatDate, formatItems, STATUSES, statusPill } from "./helpers";

type LoadState = { loading: boolean; error: string | null };

export function AnalyticsView(props: { session: Session; onNeedRefresh: () => void }) {
  const { onNeedRefresh } = props;
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [load, setLoad] = useState<LoadState>({ loading: true, error: null });

  const loadData = useCallback(async () => {
    setLoad({ loading: true, error: null });
    try {
      const [analyticsRes, quotesRes, eventsRes] = await Promise.all([
        fetch("/api/admin/analytics", { credentials: "same-origin" }),
        fetch("/api/admin/quotes", { credentials: "same-origin" }),
        fetch("/api/admin/events", { credentials: "same-origin" }),
      ]);
      if (!analyticsRes.ok || !quotesRes.ok || !eventsRes.ok) {
        setLoad({ loading: false, error: "Could not load analytics." });
        return;
      }
      const analytics = (await analyticsRes.json()) as { analytics: AnalyticsResult; dbAvailable: boolean };
      const quoteData = (await quotesRes.json()) as { quotes: QuoteRow[] };
      const eventData = (await eventsRes.json()) as { events: { id: number; event: string; metadata: Record<string, unknown>; created_at: string }[] };
      setData(analytics.analytics);
      setQuotes(quoteData.quotes);
      setEvents(eventData.events);
      setLoad({ loading: false, error: null });
    } catch {
      setLoad({ loading: false, error: "Could not load analytics." });
    }
  }, []);

  const [events, setEvents] = useState<{ id: number; event: string; metadata: Record<string, unknown>; created_at: string }[]>([]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const exportCsv = () => {
    if (quotes.length === 0) return;
    buildCsv(quotes, "bph-quotes.csv");
  };

  if (load.loading) {
    return <p className="text-sm text-ink-muted">Loading analytics…</p>;
  }
  if (load.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
        {load.error}
      </div>
    );
  }
  if (!data) return null;

  const openQuotes = data.statusFunnel.new + data.statusFunnel.reviewed;
  const wonRate = data.totals.quotes > 0 ? Math.round((data.statusFunnel.won / data.totals.quotes) * 100) : 0;

  const kpis = [
    { label: "New requests (7d)", value: data.thisWeekNew, icon: Hourglass },
    { label: "Open quotes", value: openQuotes, icon: ChartPie },
    { label: "Won rate", value: `${wonRate}%`, icon: ChartPie },
    { label: "Customers", value: data.totals.customers, icon: UsersThree },
    { label: "Unread messages", value: data.totals.unreadMessages, icon: EnvelopeSimple },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Analytics</h2>
          <p className="mt-1 text-sm text-ink-muted">Business data across quotes, messages and customers.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={quotes.length === 0}
          className="inline-flex items-center gap-2 rounded-[10px] border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary/40 disabled:opacity-50"
        >
          <DownloadSimple weight="duotone" size={15} aria-hidden="true" />
          Export CSV {quotes.length > 0 ? `(${quotes.length})` : ""}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-primary/10 bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{kpi.label}</p>
              <kpi.icon weight="duotone" size={16} className="text-accent-dark" aria-hidden="true" />
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-primary/10 bg-surface p-6" aria-label="Status funnel">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Status funnel</h3>
          <div className="mt-4 space-y-3">
            {STATUSES.map((status) => {
              const count = data?.statusFunnel[status] ?? 0;
              const pct = (data?.totals.quotes ?? 0) > 0 ? Math.round((count / (data?.totals.quotes ?? 1)) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink">{status}</span>
                    <span className="font-mono text-xs text-ink-muted">{count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/10">
                    <div className={`h-full rounded-full ${barColor(status)}`} style={{ width: `${pct}%` }} aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-primary/10 bg-surface p-6" aria-label="Source split">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Where requests come from</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data.sourceSplit).map(([source, count]) => (
              <span
                key={source}
                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface-alt px-3 py-1.5 text-sm font-medium text-ink"
              >
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                <span className="capitalize">{source}</span>
                <span className="font-mono text-xs text-ink-muted">×{count}</span>
              </span>
            ))}
          </div>
          <h3 className="mt-8 font-display text-lg font-semibold tracking-tight text-ink">Top materials</h3>
          <ul className="mt-3 space-y-2">
            {data.topItems.length === 0 ? (
              <li className="text-sm text-ink-muted">No material lines yet.</li>
            ) : (
              data.topItems.map((item) => (
                <li key={item.slug} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{item.label}</span>
                  <span className="font-mono text-xs text-ink-muted">{item.quantity} units</span>
                </li>
              ))
            )}
          </ul>
          <h3 className="mt-8 font-display text-lg font-semibold tracking-tight text-ink">Top areas</h3>
          <ul className="mt-3 space-y-2">
            {data.topAreas.length === 0 ? (
              <li className="text-sm text-ink-muted">No delivery areas yet.</li>
            ) : (
              data.topAreas.map((area) => (
                <li key={area.area} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{area.area}</span>
                  <span className="font-mono text-xs text-ink-muted">{area.count} requests</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-primary/10 bg-surface p-6" aria-label="Recent activity">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Recent activity</h3>
          <button type="button" onClick={() => { onNeedRefresh(); void loadData(); }} className="text-xs font-semibold text-accent-dark hover:underline">
            Refresh
          </button>
        </div>
        <ul className="mt-4 divide-y divide-primary/10">
          {data.recentActivity.length === 0 ? (
            <li className="py-4 text-sm text-ink-muted">Nothing yet. Once quotes and messages arrive they show up here.</li>
          ) : (
            data.recentActivity.map((item, index) => (
              <li key={`${item.kind}-${index}`} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">{item.kind}</p>
                </div>
                <time className="whitespace-nowrap text-xs text-ink-muted">{formatDate(item.created_at)}</time>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-primary/10 bg-surface p-6" aria-label="Security events">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Security events</h3>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No security events recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-ink-muted whitespace-nowrap">{formatDate(event.created_at)}</span>
                <span className="font-mono text-xs text-accent-dark">{event.event}</span>
                <span className="truncate font-mono text-xs text-ink-muted">{JSON.stringify(event.metadata)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function barColor(status: string): string {
  switch (status) {
    case "won":
      return "bg-emerald-600";
    case "reviewed":
      return "bg-sky-600";
    case "lost":
      return "bg-rose-600";
    default:
      return "bg-accent";
  }
}