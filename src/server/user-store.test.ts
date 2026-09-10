import { afterEach, describe, expect, it, vi } from "vitest";
import {
  autoAdoptQuotes,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  updateCustomerPasswordHash,
  updateCustomerProfile,
} from "./user-store";

const state = vi.hoisted(() => {
  const updatePayloads: Record<string, unknown>[] = [];
  const stub = {
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        updatePayloads.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    }),
  };
  return { updatePayloads, stub, client: null as unknown | null };
});

vi.mock("./audit", () => ({ getSupabaseClient: () => state.client }));

describe("user-store (best-effort fallback)", () => {
  it("createUser returns null when Supabase is unconfigured", async () => {
    await expect(
      createUser({ email: "ama@test.com", phone: "+233558850667", name: "Ama", passwordHash: "hash" }),
    ).resolves.toBeNull();
  });

  it("findUserByEmail returns null when Supabase is unconfigured", async () => {
    await expect(findUserByEmail("ama@test.com")).resolves.toBeNull();
  });

  it("findUserByPhone returns null when Supabase is unconfigured", async () => {
    await expect(findUserByPhone("+233558850667")).resolves.toBeNull();
  });

  it("findUserById returns null when Supabase is unconfigured", async () => {
    await expect(findUserById("u1")).resolves.toBeNull();
  });

  it("updateCustomerProfile returns false when Supabase is unconfigured", async () => {
    await expect(updateCustomerProfile("u1", { name: "Ama" })).resolves.toBe(false);
  });

  it("updateCustomerPasswordHash returns false when Supabase is unconfigured", async () => {
    await expect(updateCustomerPasswordHash("u1", "hash")).resolves.toBe(false);
  });

  it("autoAdoptQuotes returns 0 when Supabase is unconfigured", async () => {
    await expect(autoAdoptQuotes("+233558850667", "u1")).resolves.toBe(0);
  });
});

describe("updateCustomerProfile (partial updates)", () => {
  afterEach(() => {
    state.client = null;
    state.updatePayloads.length = 0;
  });

  it("omits untouched fields so a partial update never nulls them", async () => {
    state.client = state.stub;
    await expect(updateCustomerProfile("u1", { name: "Kojo" })).resolves.toBe(true);
    expect(state.updatePayloads).toHaveLength(1);
    const payload = state.updatePayloads[0];
    expect(payload.name).toBe("Kojo");
    expect(payload.updated_at).toBeTruthy();
    const keys = Object.keys(payload);
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("area");
    expect(keys).not.toContain("address");
  });

  it("includes every provided field in the update payload", async () => {
    state.client = state.stub;
    await expect(
      updateCustomerProfile("u1", {
        name: "Kojo",
        email: "kojo@example.com",
        phone: "+233241234567",
        area: "Tema",
        address: "1 Main Rd",
      }),
    ).resolves.toBe(true);
    const payload = state.updatePayloads[0];
    expect(payload).toMatchObject({
      name: "Kojo",
      email: "kojo@example.com",
      phone: "+233241234567",
      area: "Tema",
      address: "1 Main Rd",
    });
  });
});