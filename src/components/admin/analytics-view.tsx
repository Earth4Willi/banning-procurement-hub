"use client";

import { useEffect, useState } from "react";
import { formatDate, type Session } from "./helpers";

type AnalyticsData = {
  totals: { quotes: number; contactMessages: number; customers: number; unreadMessages: number };
  thisWeekNew: number;
  statusFunnel: { new: number; reviewed: number; won: number; lost: number };
  topItems: { label: string; slug: string; quantity: number }[];
  topAreas: { area: string; count: number }[];
  sourceSplit: { web: number; whatsapp: number; contact: number };
  recentActivity: { kind: string; label: string; created_at: string; meta: Record<string, unknown> }[];
};

const STATUS_LABELS: Record<keyof AnalyticsData["statusFunnel"], string> = {
  new: "New",
  reviewed: "Reviewed",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS: Record<keyof AnalyticsData["statusFunnel"], string> = {
  new: "bg-accent/70",
  reviewed: "bg-sky-500",
  won: "bg-emerald-600",
  lost: "bg-rose-500/80",
};

export function AnalyticsView({ session }: { session: Session }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    let cancelled = false;
    fetch("/api/admin/analytics", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`Analytics unavailable (${r.status}).`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setData(d?.analytics ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load analytics.");
      });
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  if (!data) return <AnalyticsSkeleton />;

  const statusTotal = data.statusFunnel.new + data.statusFunnel.reviewed + data.statusFunnel.won + data.statusFunnel.lost;
  const sourceTotal = data.sourceSplit.web + data.sourceSplit.whatsapp + data.sourceSplit.contact;

  const sourceRows = [
    { key: "web", label: "Web", value: data.sourceSplit.web },
    { key: "whatsapp", label: "WhatsApp", value: data.sourceSplit.whatsapp },
    { key: "contact", label: "Contact form", value: data.sourceSplit.contact },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Analytics</h2>
        <p className="mt-1 text-sm text-ink-muted">Activity across quotes, messages and customers.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Quotes" value={data.totals.quotes} sub={`${data.thisWeekNew} this week`} />
        <StatCard label="Contact messages" value={data.totals.contactMessages} sub={`${data.totals.unreadMessages} unread`} />
        <StatCard label="Customers" value={data.totals.customers} />
        <StatCard label="Won" value={data.statusFunnel.won} sub={`${data.statusFunnel.lost} lost`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">Status funnel</h3>
          {statusTotal === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No quotes yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(Object.keys(STATUS_LABELS) as (keyof AnalyticsData["statusFunnel"])[])
                .map((status) => ({
                  status,
                  label: STATUS_LABELS[status],
                  value: data.statusFunnel[status],
                  color: STATUS_COLORS[status],
                }))
                .sort((a, b) => b.value - a.value)
                .map(({ status, label, value, color }) => {
                  const pct = statusTotal === 0 ? 0 : Math.round((value / statusTotal) * 100);
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{label}</span>
                        <span className="tabular-nums text-ink-muted">
                          {value} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">Lead sources</h3>
          {sourceTotal === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No leads yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {sourceRows.map((row) => {
                const pct = Math.round((row.value / sourceTotal) * 100);
                return (
                  <div key={row.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{row.label}</span>
                      <span className="tabular-nums text-ink-muted">{row.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">Most requested items</h3>
          {data.topItems.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No item requests yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-primary/10">
              {data.topItems.map((item) => (
                <li key={item.slug} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate font-medium text-ink">{item.label}</span>
                  <span className="shrink-0 tabular-nums text-ink-muted">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">Top areas</h3>
          {data.topAreas.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No location data yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-primary/10">
              {data.topAreas.map((area) => (
                <li key={area.area} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate font-medium text-ink">{area.area}</span>
                  <span className="shrink-0 tabular-nums text-ink-muted">{area.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0d3d1a]">Recent activity</h3>
        {data.recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-primary/10">
            {data.recentActivity.map((entry, i) => (
              <li key={`${entry.kind}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate font-medium text-ink">{entry.label}</span>
                <span className="shrink-0 text-xs text-ink-muted">{formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard(props: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-surface p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-ink">{props.value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-muted">{props.label}</p>
      {props.sub ? <p className="mt-0.5 text-[11px] text-ink-muted/70">{props.sub}</p> : null}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-40 animate-pulse rounded bg-primary/10" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-primary/10" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-primary/10" />
    </div>
  );
}