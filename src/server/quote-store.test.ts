import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "./env";
import {
  acceptQuoteWithInventory,
  isQuoteStoreAvailable,
  listEvents,
  listQuotes,
  listQuotesByUser,
  persistQuote,
  reverseQuoteOrder,
  setQuoteStatus,
} from "./quote-store";
import { setTestEnv } from "./testing/env-fixture";

const auditMock = vi.hoisted(() => {
  const state: { client: Record<string, unknown> | null } = { client: null };
  return {
    getSupabaseClient: () => state.client,
    __setClient: (client: Record<string, unknown> | null) => {
      state.client = client;
    },
  };
});

vi.mock("./audit", () => ({ getSupabaseClient: auditMock.getSupabaseClient }));

/**
 * The quote store mirrors the audit module's contract: without a live
 * Supabase project every call degrades to a safe no-op instead of throwing.
 * The audit singleton caches its client, so this file always starts from the
 * missing-endpoint state to keep assertions deterministic.
 */
function dropSupabaseEnv(): void {
  setTestEnv();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetEnvCache();
}

describe("quote-store (degraded, no live Supabase)", () => {
  beforeEach(() => {
    dropSupabaseEnv();
  });

  it("reports unavailable when supabase env vars are absent", () => {
    expect(isQuoteStoreAvailable()).toBe(false);
  });

  it("persistQuote degrades to false without throwing", async () => {
    await expect(
      persistQuote({
        reference: "abc123",
        name: "Ama Asante",
        phone: "+233241234567",
        email: "ama@example.com",
        area: "Accra",
        note: "Delivery this week",
        items: [{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 50 }],
      }),
    ).resolves.toBe(false);
  });

  it("listQuotes and listEvents return empty arrays without throwing", async () => {
    await expect(listQuotes()).resolves.toEqual([]);
    await expect(listEvents()).resolves.toEqual([]);
  });

  it("listQuotesByUser returns an empty array for any user without throwing", async () => {
    await expect(listQuotesByUser("u1", 100)).resolves.toEqual([]);
  });

  it("persistQuote accepts customer attribution and degrades to false", async () => {
    await expect(
      persistQuote({
        reference: "abc123",
        name: "Ama Asante",
        phone: "+233241234567",
        area: "Accra",
        items: [{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 50 }],
        userId: "u1",
        deliveryAddress: "123 Street, Accra",
        intendedPaymentMethod: "mobile_money",
      }),
    ).resolves.toBe(false);
  });

  it("setQuoteStatus degrades to false without throwing", async () => {
    await expect(setQuoteStatus("some-id", "reviewed")).resolves.toBe(false);
  });

  it("acceptQuoteWithInventory degrades to error without throwing", async () => {
    const result = await acceptQuoteWithInventory("some-id", "owner@test.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("quote-store (live insert payload)", () => {
  afterEach(() => {
    auditMock.__setClient(null);
  });

  it("maps absent delivery address and payment method to empty strings for the NOT NULL DEFAULT columns", async () => {
    let inserted: Record<string, unknown> | null = null;
    auditMock.__setClient({
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          inserted = payload;
          return { error: null, data: null };
        },
      }),
    });

    const ok = await persistQuote({
      reference: "abc123",
      name: "Ama Asante",
      phone: "+233241234567",
      area: "Accra",
      items: [{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 50 }],
    });
    expect(ok).toBe(true);
    expect(inserted).toMatchObject({
      delivery_address: "",
      intended_payment_method: "",
    });

    await persistQuote({
      reference: "abc124",
      name: "Ama Asante",
      phone: "+233241234568",
      area: "Kumasi",
      deliveryAddress: "123 Street, Kumasi",
      intendedPaymentMethod: "bank",
      items: [{ slug: "cement-42-5", label: "Ghacem Supacem 42.5R", quantity: 20 }],
    });
    expect(inserted).toMatchObject({
      delivery_address: "123 Street, Kumasi",
      intended_payment_method: "bank",
    });
  });
});

/**
 * Chainable mock of the Supabase query builder narrowed to the calls the
 * accept/reverse inventory paths make. Recording every update/insert lets the
 * tests assert both the deduction ordering AND the compensating rollback.
 */
class MockSupabase {
  constructor(
    public cfg: {
      quote?: Record<string, unknown>;
      products?: Array<Record<string, unknown>>;
      historyRows?: Array<Record<string, unknown>>;
      failQuoteStatusUpdate?: boolean;
      failProductUpdateFor?: string[];
    },
  ) {}

  productUpdates: Array<{ payload: Record<string, unknown>; slug: string }> = [];
  quoteUpdates: Array<Record<string, unknown>> = [];
  historyInserts: Array<Record<string, unknown>> = [];

  from(table: string): Record<string, unknown> {
    if (table === "products") {
      return {
        select: () => {
          const q: Record<string, unknown> & { then?: unknown } = {} as never;
          const filters: Array<[string, unknown]> = [];
          q.eq = (col: string, value: unknown) => {
            filters.push([col, value]);
            return q;
          };
          q.order = () => q;
          q.maybeSingle = async () => {
            const row = (this.cfg.products ?? []).find((r) =>
              filters.every(([c, v]) => r[c] === v),
            );
            return { data: row ?? null, error: null };
          };
          q.then = (resolve: (v: unknown) => void) =>
            resolve({
              data: (this.cfg.products ?? []).filter((r) =>
                filters.every(([c, v]) => r[c] === v),
              ),
              error: null,
            });
          return q;
        },
        update: (payload: Record<string, unknown>) => {
          return {
            eq: async (_col: string, slug: string) => {
              this.productUpdates.push({ payload, slug });
              if (this.cfg.failProductUpdateFor?.includes(slug)) {
                return { error: { message: "update boom" } };
              }
              return { error: null };
            },
          };
        },
      };
    }
    if (table === "quotes") {
      return {
        select: () => {
          const q: Record<string, unknown> & { then?: unknown } = {} as never;
          q.eq = () => q;
          q.maybeSingle = async () => ({ data: this.cfg.quote ?? null, error: null });
          return q;
        },
        update: (payload: Record<string, unknown>) => {
          this.quoteUpdates.push(payload);
          return {
            eq: async () => {
              if (this.cfg.failQuoteStatusUpdate) return { error: { message: "status boom" } };
              return { error: null };
            },
          };
        },
      };
    }
    if (table === "inventory_history") {
      return {
        select: () => {
          const q: Record<string, unknown> & { then?: unknown } = {} as never;
          const filters: Array<[string, unknown]> = [];
          q.eq = (col: string, value: unknown) => {
            filters.push([col, value]);
            return q;
          };
          q.maybeSingle = async () => {
            const rows = (this.cfg.historyRows ?? []).filter((r) =>
              filters.every(([c, v]) => r[c] === v),
            );
            return { data: rows[0] ?? null, error: null };
          };
          q.then = (resolve: (v: unknown) => void) =>
            resolve({
              data: (this.cfg.historyRows ?? []).filter((r) => filters.every(([c, v]) => r[c] === v)),
              error: null,
            });
          return q;
        },
        insert: async (payload: Record<string, unknown>) => {
          this.historyInserts.push(payload);
          return { error: null, data: null };
        },
      };
    }
    throw new Error(`unexpected table ${table}`);
  }
}

const trackedBag = (id: string, slug: string, stock: number) => ({
  id,
  slug,
  name: slug,
  unit: "bag",
  stock_quantity: stock,
  track_inventory: true,
});

describe("acceptQuoteWithInventory rollback", () => {
  afterEach(() => {
    auditMock.__setClient(null);
  });

  it("restores every deduction when the final status flip fails", async () => {
    const mock = new MockSupabase({
      quote: {
        id: "q1",
        status: "reviewed",
        items: [
          { slug: "cement", label: "Cement", quantity: 5 },
          { slug: "rod", label: "Rod", quantity: 3 },
        ],
      },
      products: [trackedBag("p1", "cement", 10), trackedBag("p2", "rod", 20)],
      failQuoteStatusUpdate: true,
    });
    auditMock.__setClient(mock as unknown as Record<string, unknown>);

    const result = await acceptQuoteWithInventory("q1", "owner@test.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("rolled back");

    expect(mock.productUpdates.map((u) => u.payload.stock_quantity)).toEqual([5, 17, 10, 20]);
    expect(mock.productUpdates.map((u) => u.slug)).toEqual(["cement", "rod", "cement", "rod"]);

    const types = mock.historyInserts.map((h) => h.change_type);
    expect(types).toEqual(["order", "order", "order_cancellation", "order_cancellation"]);
    expect(mock.historyInserts[2]).toMatchObject({ product_id: "p1", previous_quantity: 5, quantity_changed: 5, new_quantity: 10 });
    expect(mock.historyInserts[3]).toMatchObject({ product_id: "p2", previous_quantity: 17, quantity_changed: 3, new_quantity: 20 });
  });

  it("rolls back only the items already deducted when a mid-loop update fails", async () => {
    const mock = new MockSupabase({
      quote: {
        id: "q2",
        status: "reviewed",
        items: [
          { slug: "cement", label: "Cement", quantity: 5 },
          { slug: "rod", label: "Rod", quantity: 3 },
        ],
      },
      products: [trackedBag("p1", "cement", 10), trackedBag("p2", "rod", 20)],
      failProductUpdateFor: ["rod"],
    });
    auditMock.__setClient(mock as unknown as Record<string, unknown>);

    const result = await acceptQuoteWithInventory("q2", "owner@test.com");
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(mock.productUpdates.map((u) => u.payload.stock_quantity)).toEqual([5, 17, 10]);
    expect(mock.productUpdates.map((u) => u.slug)).toEqual(["cement", "rod", "cement"]);
    expect(mock.historyInserts).toHaveLength(2);
    expect(mock.historyInserts.map((h) => h.change_type)).toEqual(["order", "order_cancellation"]);
  });
});

describe("reverseQuoteOrder", () => {
  afterEach(() => {
    auditMock.__setClient(null);
  });

  it("restores the deducted quantities, logs cancellation, and flips the status", async () => {
    const mock = new MockSupabase({
      quote: { id: "q1", status: "won", items: [] },
      products: [trackedBag("p1", "cement", 5), trackedBag("p2", "rod", 17)],
      historyRows: [
        { product_id: "p1", previous_quantity: 10, quantity_changed: -5, new_quantity: 5, change_type: "order", reference_id: "q1" },
        { product_id: "p2", previous_quantity: 20, quantity_changed: -3, new_quantity: 17, change_type: "order", reference_id: "q1" },
      ],
    });
    auditMock.__setClient(mock as unknown as Record<string, unknown>);

    const result = await reverseQuoteOrder("q1", "owner@test.com", "lost");
    expect(result.ok).toBe(true);

    expect(mock.productUpdates.map((u) => u.payload.stock_quantity)).toEqual([10, 20]);
    expect(mock.historyInserts).toHaveLength(2);
    expect(mock.historyInserts.every((h) => h.change_type === "order_cancellation")).toBe(true);
    expect(mock.historyInserts.every((h) => h.reference_id === "q1")).toBe(true);
    expect(mock.quoteUpdates).toEqual([{ accepted_at: null, status: "lost" }]);
  });

  it("is idempotent — already-reversed products are never restored twice", async () => {
    const cancelledRows = [
      { product_id: "p1", previous_quantity: 5, quantity_changed: 5, new_quantity: 10, change_type: "order_cancellation", reference_id: "q1" },
      { product_id: "p2", previous_quantity: 17, quantity_changed: 3, new_quantity: 20, change_type: "order_cancellation", reference_id: "q1" },
    ];
    const mock = new MockSupabase({
      quote: { id: "q1", status: "won", items: [] },
      products: [trackedBag("p1", "cement", 10), trackedBag("p2", "rod", 20)],
      historyRows: [
        { product_id: "p1", previous_quantity: 10, quantity_changed: -5, new_quantity: 5, change_type: "order", reference_id: "q1" },
        { product_id: "p2", previous_quantity: 20, quantity_changed: -3, new_quantity: 17, change_type: "order", reference_id: "q1" },
        ...cancelledRows,
      ],
    });
    auditMock.__setClient(mock as unknown as Record<string, unknown>);

    const result = await reverseQuoteOrder("q1", "owner@test.com", "lost");
    expect(result.ok).toBe(true);
    expect(mock.productUpdates).toHaveLength(0);
    expect(mock.historyInserts).toHaveLength(0);
    expect(mock.quoteUpdates).toEqual([{ accepted_at: null, status: "lost" }]);
  });
});