import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "./env";
import {
  isQuoteStoreAvailable,
  listEvents,
  listQuotes,
  listQuotesByUser,
  persistQuote,
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