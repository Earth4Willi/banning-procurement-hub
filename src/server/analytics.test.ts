import { describe, expect, it } from "vitest";
import { computeAnalytics, type AnalyticsQuote } from "./analytics";

const quote = (overrides: Partial<AnalyticsQuote> = {}): AnalyticsQuote => ({
  id: "q1",
  reference: "abc",
  name: "Ama",
  phone: "+233558850667",
  email: null,
  area: "Accra",
  note: null,
  items: [{ slug: "cement", label: "Cement", quantity: 2 }],
  status: "new",
  source: "web",
  created_at: "2026-09-01T10:00:00.000Z",
  ...overrides,
});

describe("computeAnalytics", () => {
  it("computes totals, funnel, source split, top items and areas", () => {
    const result = computeAnalytics({
      quotes: [
        quote({ status: "new", area: "Accra", source: "web" }),
        quote({ status: "won", area: "Accra", source: "whatsapp", items: [{ slug: "cement", label: "Cement", quantity: 5 }] }),
        quote({ status: "lost", area: "Tema", source: "contact", items: [{ slug: "sharp-sand", label: "Sharp Sand", quantity: 1 }] }),
      ],
      messages: [{ id: "m1", name: "Kojo", phone: "+233241234567", email: null, area: "", message: "hi", read: false, created_at: "2026-09-02T10:00:00.000Z" }],
      customersCount: 2,
      events: [{ id: 1, event: "signin_ok", metadata: {}, created_at: "2026-09-03T10:00:00.000Z" }],
    });

    expect(result.totals.quotes).toBe(3);
    expect(result.totals.contactMessages).toBe(1);
    expect(result.totals.customers).toBe(2);
    expect(result.totals.unreadMessages).toBe(1);
    expect(result.statusFunnel).toEqual({ new: 1, reviewed: 0, won: 1, lost: 1 });
    expect(result.sourceSplit).toEqual({ web: 1, whatsapp: 1, contact: 1 });
    expect(result.topItems[0]).toEqual({ label: "Cement", slug: "cement", quantity: 7 });
    expect(result.topAreas[0]).toEqual({ area: "Accra", count: 2 });
  });

  it("counts this-week new quotes against a rolling 7-day window", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = computeAnalytics({
      quotes: [quote({ created_at: future }), quote({ created_at: old })],
      messages: [],
      customersCount: 0,
      events: [],
    });
    expect(result.thisWeekNew).toBe(1);
  });

  it("merges recent activity newest-first and caps at 10", () => {
    const quotes = Array.from({ length: 6 }, (_, index) => quote({ created_at: `2026-09-0${index + 1}T00:00:00.000Z` }));
    const messages = Array.from({ length: 6 }, (_, index) => ({
      id: `m${index}`,
      name: "A",
      phone: "+233000000000",
      email: null,
      area: "",
      message: "x",
      read: false,
      created_at: `2026-09-0${index + 1}T12:00:00.000Z`,
    }));
    const result = computeAnalytics({ quotes, messages, customersCount: 0, events: [] });
    expect(result.recentActivity.length).toBe(10);
    for (let i = 1; i < result.recentActivity.length; i += 1) {
      expect(result.recentActivity[i - 1].created_at >= result.recentActivity[i].created_at).toBe(true);
    }
  });
});