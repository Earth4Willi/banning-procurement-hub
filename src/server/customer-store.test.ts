import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const customersData: Record<string, unknown>[] = [];
const quotesData: Record<string, unknown>[] = [];
const messagesData: Record<string, unknown>[] = [];

const datasets: Record<string, Record<string, unknown>[]> = {
  customers: customersData,
  quotes: quotesData,
  messages: messagesData,
};

const stub = {
  from: (table: string) => ({
    upsert: async (row: Record<string, unknown>) => {
      if (table === "customers") {
        const existing = customersData.findIndex((r) => r.phone === row.phone);
        if (existing >= 0) customersData[existing] = { ...customersData[existing], ...row };
        else customersData.push(row);
      }
      return { error: null };
    },
    select: (columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => {
      if (opts?.head) return { data: null, count: customersData.length, error: null };
      return { data: datasets[table] ?? [], error: null };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  }),
} as unknown as SupabaseClient;

vi.mock("./audit", () => ({ getSupabaseClient: () => stub }));

import { countCustomers, listCustomers, upsertCustomer, updateCustomer } from "./customer-store";

describe("upsertCustomer / updateCustomer", () => {
  it("upserts then updates the notes", async () => {
    expect(await upsertCustomer("+233558850667", { name: "Ama", email: "a@b.com" })).toBe(true);
    expect(customersData).toHaveLength(1);
    expect(await updateCustomer("+233558850667", { notes: "repeat buyer" })).toBe(true);
  });

  it("writes a non-blank email and never blanks an existing one", async () => {
    customersData.length = 0;
    await upsertCustomer("+233550000111", { name: "Kofi", email: "kofi@example.com" });
    expect(customersData[0]).toHaveProperty("email", "kofi@example.com");

    await upsertCustomer("+233550000111", { name: "Kofi", email: "" });
    expect(customersData[0]).toHaveProperty("email", "kofi@example.com");

    await upsertCustomer("+233550000111", { name: "Kofi" });
    expect(customersData[0]).toHaveProperty("email", "kofi@example.com");
  });

  it("counts customers exactly without loading rows", async () => {
    customersData.length = 0;
    customersData.push({ phone: "+233558850667" }, { phone: "+233551112223" });
    expect(await countCustomers()).toBe(2);
  });
});

describe("listCustomers", () => {
  it("derives customers from quotes, messages and customer rows", async () => {
    customersData.length = 0;
    quotesData.length = 0;
    messagesData.length = 0;
    quotesData.push({ phone: "+233558850667", source: "web", status: "won", created_at: "2026-09-01T00:00:00.000Z" });
    messagesData.push({ phone: "+233558850667", created_at: "2026-09-02T00:00:00.000Z" });
    customersData.push({ phone: "+233558850667", name: "Ama", email: "a@b.com", notes: "", status: "new", created_at: "", updated_at: "" });
    const rows = await listCustomers();
    expect(rows).toHaveLength(1);
    expect(rows[0].requestCount).toBe(2);
    expect(rows[0].bestStatus).toBe("won");
    expect(rows[0].sources).toContain("web");
    expect(rows[0].sources).toContain("contact");
  });
});