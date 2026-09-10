import { describe, expect, it, vi } from "vitest";
import {
  autoAdoptQuotes,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  updateCustomerPasswordHash,
  updateCustomerProfile,
} from "./user-store";

vi.mock("./audit", () => ({ getSupabaseClient: () => null }));

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