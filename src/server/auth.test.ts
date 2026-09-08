import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { beginOwnerLogin, CODE_ERROR, completeOwnerLogin, GENERIC } from "./auth";
import { HttpError } from "./http-error";
import type { PendingLogin, PendingLoginStore } from "./pending-login";
import { setTestEnv, TEST_ENV } from "./testing/env-fixture";
import { totpCode } from "./totp";

const mock = vi.hoisted(() => {
  let limitResult = { success: true, limit: 5, remaining: 4, reset: Math.floor(Date.now() / 1000) + 60 };
  const limit = vi.fn(async () => limitResult);
  const MockRatelimit = class {
    limit = limit;
    static slidingWindow = () => ({});
  };
  return { MockRatelimit, undo: () => { limitResult = { success: true, limit: 5, remaining: 4, reset: Math.floor(Date.now() / 1000) + 60 }; } };
});

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: mock.MockRatelimit,
}));

const request = {
  method: "POST",
  headers: new Headers({ "x-forwarded-for": "10.0.0.7" }),
} as unknown as NextRequest;

const otherIpRequest = {
  method: "POST",
  headers: new Headers({ "x-forwarded-for": "10.0.0.99" }),
} as unknown as NextRequest;

class MemoryPendingStore implements PendingLoginStore {
  private store = new Map<string, PendingLogin>();

  async create(id: string, record: PendingLogin): Promise<void> {
    this.store.set(id, record);
  }

  async consume(id: string): Promise<PendingLogin | null> {
    const record = this.store.get(id);
    this.store.delete(id);
    return record ?? null;
  }
}

async function messageOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    return (error as HttpError).message;
  }
  throw new Error("expected the call to fail");
}

describe("beginOwnerLogin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.undo();
  });

  it("issues a pending login to the real owner", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const { pendingId, ip } = await beginOwnerLogin({
      request,
      store,
      email: "banning173@gmail.com",
      password: "hunter2",
    });
    expect(pendingId).toBeTruthy();
    expect(ip).toBe("10.0.0.7");
    await expect(store.consume(pendingId)).resolves.toMatchObject({ email: "banning173@gmail.com" });
  });

  it("rejects a wrong password with a generic error and no pending login", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    await expect(
      beginOwnerLogin({ request, store, email: "banning173@gmail.com", password: "wrong" }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });
    expect((store as unknown as { store: Map<string, unknown> }).store.size).toBe(0);
  });

  it("returns the identical error for a wrong password and an unknown email", async () => {
    setTestEnv();
    const wrongPassword = await messageOf(() =>
      beginOwnerLogin({ request, store: new MemoryPendingStore(), email: "banning173@gmail.com", password: "wrong" }),
    );
    const unknownEmail = await messageOf(() =>
      beginOwnerLogin({ request, store: new MemoryPendingStore(), email: "someone@else.com", password: "hunter2" }),
    );
    expect(unknownEmail).toBe(wrongPassword);
    expect(wrongPassword).toBe(GENERIC);
  });

  it("normalizes email case before matching", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const { pendingId } = await beginOwnerLogin({
      request,
      store,
      email: "  Banning173@Gmail.com ",
      password: "hunter2",
    });
    await expect(store.consume(pendingId)).resolves.toMatchObject({ email: "banning173@gmail.com" });
  });
});

describe("completeOwnerLogin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.undo();
  });

  async function begin(store: PendingLoginStore): Promise<string> {
    const { pendingId } = await beginOwnerLogin({
      request,
      store,
      email: "banning173@gmail.com",
      password: "hunter2",
    });
    return pendingId;
  }

  it("completes login with the correct code", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const pendingId = await begin(store);
    const principal = await completeOwnerLogin({
      request,
      store,
      pendingId,
      totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET),
    });
    expect(principal).toEqual({ id: "owner", role: "owner", email: "banning173@gmail.com" });
  });

  it("rejects the wrong code with a generic error", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const pendingId = await begin(store);
    await expect(
      completeOwnerLogin({ request, store, pendingId, totpCode: "000000" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_code", message: CODE_ERROR });
  });

  it("consumes the pending login so it cannot be replayed", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const pendingId = await begin(store);
    await completeOwnerLogin({ request, store, pendingId, totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET) });
    await expect(
      completeOwnerLogin({ request, store, pendingId, totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET) }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_code" });
  });

  it("rejects a pending login from a different ip", async () => {
    setTestEnv();
    const store = new MemoryPendingStore();
    const pendingId = await begin(store);
    await expect(
      completeOwnerLogin({ request: otherIpRequest, store, pendingId, totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET) }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_code" });
  });

  it("rejects a missing or expired pending login", async () => {
    setTestEnv();
    await expect(
      completeOwnerLogin({ request, store: new MemoryPendingStore(), pendingId: "nope", totpCode: "123456" }),
    ).rejects.toMatchObject({ status: 400, code: "invalid_code" });
  });
});