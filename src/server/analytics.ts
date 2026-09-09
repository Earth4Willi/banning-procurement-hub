import type { MessageRecord, QuoteSource } from "@/lib/catalog-types";

export type AnalyticsQuote = {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  note: string | null;
  items: { slug: string; label: string; quantity: number }[];
  status: "new" | "reviewed" | "won" | "lost";
  source: QuoteSource;
  created_at: string;
};

export type AnalyticsEvent = {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RecentActivityItem = {
  kind: "quote" | "message" | "event";
  label: string;
  created_at: string;
  meta: Record<string, unknown>;
};

export type AnalyticsResult = {
  totals: { quotes: number; contactMessages: number; customers: number; unreadMessages: number };
  thisWeekNew: number;
  statusFunnel: Record<AnalyticsQuote["status"], number>;
  topItems: { label: string; slug: string; quantity: number }[];
  topAreas: { area: string; count: number }[];
  sourceSplit: Record<QuoteSource, number>;
  recentActivity: RecentActivityItem[];
};

export function computeAnalytics(input: {
  quotes: AnalyticsQuote[];
  messages: MessageRecord[];
  customersCount: number;
  events: AnalyticsEvent[];
}): AnalyticsResult {
  const quotes = input.quotes;
  const messages = input.messages;

  const now = new Date();
  const weekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const statusFunnel: Record<AnalyticsQuote["status"], number> = {
    new: 0,
    reviewed: 0,
    won: 0,
    lost: 0,
  };
  const sourceSplit: Record<QuoteSource, number> = { web: 0, whatsapp: 0, contact: 0 };
  const items = new Map<string, { label: string; slug: string; quantity: number }>();
  const areas = new Map<string, number>();

  for (const quote of quotes) {
    statusFunnel[quote.status] = (statusFunnel[quote.status] ?? 0) + 1;
    sourceSplit[quote.source] = (sourceSplit[quote.source] ?? 0) + 1;
    for (const item of quote.items) {
      const entry = items.get(item.slug) ?? { label: item.label, slug: item.slug, quantity: 0 };
      entry.quantity += item.quantity;
      items.set(item.slug, entry);
    }
    if (quote.area) areas.set(quote.area, (areas.get(quote.area) ?? 0) + 1);
  }

  const activity: RecentActivityItem[] = [
    ...quotes.map((quote) => ({
      kind: "quote" as const,
      label: `${quote.name} — ${quote.reference}`,
      created_at: quote.created_at,
      meta: { id: quote.id, ref: quote.reference, status: quote.status, area: quote.area },
    })),
    ...messages.map((message) => ({
      kind: "message" as const,
      label: `${message.name} — contact message`,
      created_at: message.created_at,
      meta: { id: message.id },
    })),
    ...input.events.map((event) => ({
      kind: "event" as const,
      label: event.event,
      created_at: event.created_at,
      meta: event.metadata,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    totals: {
      quotes: quotes.length,
      contactMessages: messages.length,
      customers: input.customersCount,
      unreadMessages: messages.filter((message) => !message.read).length,
    },
    thisWeekNew: quotes.filter((quote) => new Date(quote.created_at) >= weekDate).length,
    statusFunnel,
    topItems: [...items.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    topAreas: [...areas.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    sourceSplit,
    recentActivity: activity.slice(0, 10),
  };
}