import { describe, expect, it, vi } from "vitest";
import type { Redis } from "@upstash/redis";
import { newPendingId, RedisPendingLoginStore, type PendingLogin } from "./pending-login";

function fakeRedis() {
  const map = new Map<string, unknown>();
  return {
    map,
    redis: {
      set: vi.fn(async (key: string, value: unknown, cmd: { ex: number }) => {
        map.set(key, value);
        return "OK";
      }),
      getdel: vi.fn(async (key: string) => {
        const value = map.get(key);
        map.delete(key);
        return value;
      }),
    } as unknown as Redis,
  };
}

const record: PendingLogin = { email: "banning173@gmail.com", ip: "10.0.0.7", createdAt: Date.now() };

describe("RedisPendingLoginStore", () => {
  it("stores a pending login with a TTL", async () => {
    const { redis, map } = fakeRedis();
    const store = new RedisPendingLoginStore(redis);
    await store.create("id-1", record, 120);
    expect(map.get("login:pending:id-1")).toBe(JSON.stringify(record));
    expect(redis.set).toHaveBeenCalledWith("login:pending:id-1", JSON.stringify(record), { ex: 120 });
  });

  it("consumes a pending login exactly once", async () => {
    const { redis, map } = fakeRedis();
    const store = new RedisPendingLoginStore(redis);
    await store.create("id-2", record, 120);
    await expect(store.consume("id-2")).resolves.toEqual(record);
    await expect(store.consume("id-2")).resolves.toBeNull();
    expect(map.size).toBe(0);
  });

  it("returns null for an unknown pending login", async () => {
    const { redis } = fakeRedis();
    const store = new RedisPendingLoginStore(redis);
    await expect(store.consume("missing")).resolves.toBeNull();
  });

  it("consumes a payload the store auto-deserialized to an object", async () => {
    const { redis, map } = fakeRedis();
    redis.getdel = vi.fn(async (key: string) => {
      const value = map.get(key);
      map.delete(key);
      return typeof value === "string" ? JSON.parse(value) : value;
    });
    const store = new RedisPendingLoginStore(redis);
    await store.create("id-auto", record, 120);
    await expect(store.consume("id-auto")).resolves.toEqual(record);
    expect(map.size).toBe(0);
  });

  it("treats malformed payloads as consumed-and-invalid", async () => {
    const { redis, map } = fakeRedis();
    const store = new RedisPendingLoginStore(redis);
    map.set("login:pending:bad", "{not json");
    await expect(store.consume("bad")).resolves.toBeNull();
    expect(map.size).toBe(0);
  });

  it("honors a custom prefix", async () => {
    const { redis, map } = fakeRedis();
    const store = new RedisPendingLoginStore(redis, { prefix: "pending:" });
    await store.create("id-3", record, 60);
    expect(map.has("pending:id-3")).toBe(true);
  });

  it("generates unique pending ids", () => {
    expect(newPendingId()).not.toBe(newPendingId());
    expect(newPendingId()).toBeTruthy();
  });
});