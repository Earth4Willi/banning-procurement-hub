import { describe, expect, it } from "vitest";
import {
  createSession,
  type CustomerPrincipal,
  type OwnerPrincipal,
  readSession,
  revokeSession,
  rotateSession,
  sessionCookieConfig,
  type SessionRecord,
  type SessionStore,
} from "./session";
import { setTestEnv } from "./testing/env-fixture";

class MemoryStore implements SessionStore {
  private store = new Map<string, { record: SessionRecord; expiresAt: number }>();

  async create(id: string, record: SessionRecord, absTtlSeconds: number): Promise<void> {
    this.store.set(id, { record, expiresAt: Date.now() + absTtlSeconds * 1000 });
  }

  async read(id: string): Promise<SessionRecord | null> {
    const entry = this.store.get(id);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(id);
      return null;
    }
    return entry.record;
  }

  async touch(id: string, lastSeen: number): Promise<void> {
    const entry = this.store.get(id);
    if (entry) entry.record.lastSeen = lastSeen;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

const ownerPrincipal: OwnerPrincipal = { id: "owner", role: "owner", email: "banning173@gmail.com" };
const customerPrincipal: CustomerPrincipal = { id: "c-1", role: "customer", email: "ama@test.com", name: "Ama", phone: "+233558850667" };

describe("sessions", () => {
  it("creates and reads back an owner session", async () => {
    setTestEnv();
    const store = new MemoryStore();
    const id = await createSession(store, ownerPrincipal);
    expect(id).toBeTruthy();
    await expect(readSession(store, id)).resolves.toEqual(ownerPrincipal);
  });

  it("returns null for a missing session id", async () => {
    setTestEnv();
    await expect(readSession(new MemoryStore(), "nope")).resolves.toBeNull();
  });

  it("expires an idle session and deletes it", async () => {
    setTestEnv();
    const store = new MemoryStore();
    await store.create("stale", { principal: ownerPrincipal, lastSeen: Date.now() - 400_000 }, 3600);
    await expect(readSession(store, "stale")).resolves.toBeNull();
    await expect(store.read("stale")).resolves.toBeNull();
  });

  it("respects absolute expiry via the store TTL", async () => {
    setTestEnv();
    const store = new MemoryStore();
    await store.create("short", { principal: ownerPrincipal, lastSeen: Date.now() }, 1);
    await new Promise((resolve) => setTimeout(resolve, 1050));
    await expect(readSession(store, "short")).resolves.toBeNull();
  });

  it("rotates to a new id and preserves the owner principal", async () => {
    setTestEnv();
    const store = new MemoryStore();
    const oldId = await createSession(store, ownerPrincipal);
    const newId = await rotateSession(store, oldId, ownerPrincipal);
    expect(newId).not.toBe(oldId);
    await expect(readSession(store, oldId)).resolves.toBeNull();
    await expect(readSession(store, newId)).resolves.toEqual(ownerPrincipal);
  });

  it("revokes a session", async () => {
    setTestEnv();
    const store = new MemoryStore();
    const id = await createSession(store, ownerPrincipal);
    await revokeSession(store, id);
    await expect(readSession(store, id)).resolves.toBeNull();
  });

  it("builds a hardened cookie config", () => {
    setTestEnv({ NODE_ENV: "production" });
    const config = sessionCookieConfig("abc");
    expect(config.httpOnly).toBe(true);
    expect(config.sameSite).toBe("lax");
    expect(config.secure).toBe(true);
    expect(config.maxAge).toBe(3600);
    expect(config.path).toBe("/");
  });

  it("creates and reads back a customer session round-trip", async () => {
    setTestEnv();
    const store = new MemoryStore();
    const id = await createSession(store, customerPrincipal);
    expect(id).toBeTruthy();
    const read = await readSession(store, id);
    expect(read).toEqual(customerPrincipal);
    expect(read).not.toBeNull();
    expect(read!.role).toBe("customer");
  });

  it("rotates to a new id and preserves the customer principal", async () => {
    setTestEnv();
    const store = new MemoryStore();
    const oldId = await createSession(store, customerPrincipal);
    const newId = await rotateSession(store, oldId, customerPrincipal);
    expect(newId).not.toBe(oldId);
    const oldRead = await readSession(store, oldId);
    expect(oldRead).toBeNull();
    const newRead = await readSession(store, newId);
    expect(newRead).toEqual(customerPrincipal);
    expect(newRead!.role).toBe("customer");
  });
});