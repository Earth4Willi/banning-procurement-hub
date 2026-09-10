import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http-error";
import { setTestEnv } from "./testing/env-fixture";
import { hashPassword } from "./passwords";

const mock = vi.hoisted(() => {
  let limitResult = { success: true, limit: 20, remaining: 19, reset: Math.floor(Date.now() / 1000) + 60 };
  const limit = vi.fn(async () => limitResult);
  const MockRatelimit = class {
    limit = limit;
    static slidingWindow = () => ({});
  };
  return {
    MockRatelimit,
    undo: () => {
      limitResult = { success: true, limit: 20, remaining: 19, reset: Math.floor(Date.now() / 1000) + 60 };
    },
    setResult: (r: typeof limitResult) => {
      limitResult = r;
    },
  };
});

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: mock.MockRatelimit,
}));

const users: Record<string, unknown>[] = [];
const quotes: Record<string, unknown>[] = [];

function buildStub(): SupabaseClient {
  function queryOn(table: string, data: Record<string, unknown>[]) {
    let _select: string | undefined;
    const chain: Record<string, unknown> = {};

    chain.select = (cols?: string) => {
      _select = cols;
      return chain;
    };

    chain.eq = (col: string, val: unknown) => {
      const filtered = data.filter((row) => row[col] === val);
      return {
        ...chain,
        maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
        single: async () => {
          if (filtered.length === 0) return { data: null, error: { message: "not found" } };
          return { data: filtered[0], error: null };
        },
        limit: async (n: number) => ({ data: filtered.slice(0, n), error: null }),
        order: () => ({
          limit: async (n: number) => ({ data: filtered.slice(0, n), error: null }),
        }),
        is: (col2: string, val2: unknown) => {
          const filtered2 = filtered.filter((row) => row[col2] === val2);
          return {
            select: () => ({
              limit: async (n: number) => ({ data: filtered2.slice(0, n), error: null }),
            }),
          };
        },
        update: (patch: Record<string, unknown>) => {
          for (const row of filtered) Object.assign(row, patch);
          return {
            eq: () => chain,
            is: () => chain,
            select: () => ({
              limit: async (n: number) => ({ data: filtered.slice(0, n), error: null }),
            }),
          };
        },
      };
    };

    chain.insert = (row: Record<string, unknown>) => {
      const id = `u${data.length + 1}`;
      const inserted = { ...row, id };
      data.push(inserted);
      return {
        select: () => ({
          single: () => ({ data: inserted, error: null }),
        }),
      };
    };

    return chain;
  }

  return {
    from: (table: string) => {
      const data = table === "users" ? users : quotes;
      return queryOn(table, data);
    },
  } as unknown as SupabaseClient;
}

vi.mock("./audit", () => ({
  getSupabaseClient: () => buildStub(),
  audit: async () => {},
}));

const request = {
  method: "POST",
  headers: new Headers({ "x-forwarded-for": "10.0.0.7" }),
} as unknown as NextRequest;

describe("registerCustomer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.undo();
    users.length = 0;
    quotes.length = 0;
  });

  it("creates a user and returns it", async () => {
    setTestEnv();
    const { registerCustomer } = await import("./customer-auth");
    const user = await registerCustomer({
      request,
      name: "Ama",
      email: "ama@example.com",
      phone: "0558850667",
      password: "Hunter2pass",
    });
    expect(user).toBeTruthy();
    expect(user!.email).toBe("ama@example.com");
    expect(user!.name).toBe("Ama");
  });

  it("throws 400 email_taken when email already exists", async () => {
    setTestEnv();
    users.push({ id: "u1", email: "ama@example.com", phone: "+233558850667", name: "Ama", area: "", address: "", password_hash: "x" });
    const { registerCustomer } = await import("./customer-auth");
    await expect(
      registerCustomer({
        request,
        name: "Other",
        email: "ama@example.com",
        phone: "0241234567",
        password: "Hunter2pass",
      }),
    ).rejects.toMatchObject({ status: 400, code: "email_taken" });
  });

  it("throws 400 phone_taken when phone already exists", async () => {
    setTestEnv();
    users.push({ id: "u1", email: "other@example.com", phone: "+233558850667", name: "Ama", area: "", address: "", password_hash: "x" });
    const { registerCustomer } = await import("./customer-auth");
    await expect(
      registerCustomer({
        request,
        name: "Other",
        email: "other2@example.com",
        phone: "0558850667",
        password: "Hunter2pass",
      }),
    ).rejects.toMatchObject({ status: 400, code: "phone_taken" });
  });

  it("throws 429 when rate-limited", async () => {
    setTestEnv();
    mock.setResult({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
    const { registerCustomer } = await import("./customer-auth");
    await expect(
      registerCustomer({
        request,
        name: "Ama",
        email: "ama@example.com",
        phone: "0558850667",
        password: "Hunter2pass",
      }),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("loginCustomer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.undo();
    users.length = 0;
    quotes.length = 0;
  });

  it("returns a CustomerPrincipal on success", async () => {
    setTestEnv();
    const hash = await hashPassword("correctpass");
    users.push({
      id: "u1",
      email: "ama@example.com",
      phone: "+233558850667",
      name: "Ama",
      area: "Accra",
      address: "123 St",
      password_hash: hash,
    });
    const { loginCustomer } = await import("./customer-auth");
    const principal = await loginCustomer({
      request,
      email: "ama@example.com",
      password: "correctpass",
    });
    expect(principal).toMatchObject({
      role: "customer",
      email: "ama@example.com",
      name: "Ama",
      phone: "+233558850667",
    });
  });

  it("throws 401 generic for wrong password", async () => {
    setTestEnv();
    const hash = await hashPassword("correctpass");
    users.push({
      id: "u1",
      email: "ama@example.com",
      phone: "+233558850667",
      name: "Ama",
      area: "",
      address: "",
      password_hash: hash,
    });
    const { loginCustomer } = await import("./customer-auth");
    await expect(
      loginCustomer({ request, email: "ama@example.com", password: "wrongpass" }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });
  });

  it("throws 401 generic for unknown email", async () => {
    setTestEnv();
    const { loginCustomer } = await import("./customer-auth");
    await expect(
      loginCustomer({ request, email: "nobody@example.com", password: "anything1" }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });
  });

  it("throws 429 when rate-limited", async () => {
    setTestEnv();
    mock.setResult({
      success: false,
      limit: 15,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
    const { loginCustomer } = await import("./customer-auth");
    await expect(
      loginCustomer({ request, email: "ama@example.com", password: "anything1" }),
    ).rejects.toMatchObject({ status: 429 });
  });
});
