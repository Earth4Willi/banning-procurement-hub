import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { loginWithPassword } from "./auth";
import { HttpError } from "./http-error";
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

async function messageOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    return (error as HttpError).message;
  }
  throw new Error("expected the call to fail");
}

describe("loginWithPassword", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mock.undo();
  });

  it("accepts the real owner with correct credentials", async () => {
    setTestEnv();
    const principal = await loginWithPassword({
      request,
      email: "banning173@gmail.com",
      password: "hunter2",
      totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET),
    });
    expect(principal).toEqual({ id: "owner", role: "owner", email: "banning173@gmail.com" });
  });

  it("rejects a wrong password with a generic error", async () => {
    setTestEnv();
    await expect(
      loginWithPassword({
        request,
        email: "banning173@gmail.com",
        password: "wrong",
        totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET),
      }),
    ).rejects.toMatchObject({ status: 401, code: "invalid_credentials" });
  });

  it("returns the identical error for a wrong password and an unknown email", async () => {
    setTestEnv();
    const wrongPassword = await messageOf(() =>
      loginWithPassword({
        request,
        email: "banning173@gmail.com",
        password: "wrong",
        totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET),
      }),
    );
    const unknownEmail = await messageOf(() =>
      loginWithPassword({
        request,
        email: "someone@else.com",
        password: "hunter2",
        totpCode: totpCode(TEST_ENV.OWNER_TOTP_SECRET),
      }),
    );
    expect(unknownEmail).toBe(wrongPassword);
  });

  it("rejects a wrong TOTP code", async () => {
    setTestEnv();
    await expect(
      loginWithPassword({
        request,
        email: "banning173@gmail.com",
        password: "hunter2",
        totpCode: "000000",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});