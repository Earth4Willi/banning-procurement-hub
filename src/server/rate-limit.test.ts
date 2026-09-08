import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { clientIp, enforceRateLimit, rateLimit } from "./rate-limit";
import { HttpError } from "./http-error";
import { setTestEnv } from "./testing/env-fixture";

type LimitResult = { success: boolean; limit: number; remaining: number; reset: number | Date };

const mock = vi.hoisted(() => {
  const limit = vi.fn(async (): Promise<LimitResult> => {
    throw new Error("simulated unreachable redis");
  });
  const MockRatelimit = class {
    limit = limit;
    static slidingWindow = () => ({});
  };
  const setLimitResult = (result: LimitResult) => {
    limit.mockReset();
    limit.mockImplementation(async () => result);
  };
  return { limit, MockRatelimit, setLimitResult };
});

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: mock.MockRatelimit,
}));

describe("clientIp", () => {
  const req = (headers: Headers) =>
    ({ headers, ip: undefined }) as unknown as NextRequest;

  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(req(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(req(new Headers({ "x-real-ip": "9.9.9.9" })))).toBe("9.9.9.9");
    expect(clientIp(req(new Headers({})))).toBe("unknown");
  });
});

describe("rateLimit", () => {
  afterEach(() => {
    mock.limit.mockReset();
    mock.limit.mockImplementation(async () => {
      throw new Error("simulated unreachable redis");
    });
  });

  it("degrades gracefully when the store call fails", async () => {
    setTestEnv();
    const result = await rateLimit({
      prefix: "rl:test",
      identifier: "1.2.3.4",
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.success).toBe(true);
    expect(result.headers.get("X-RateLimit-Limit")).toBe("5");
  });

  it("reports exhaustion when the limiter blocks", async () => {
    setTestEnv();
    mock.setLimitResult({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
    const result = await rateLimit({
      prefix: "rl:test",
      identifier: "1.2.3.4",
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.success).toBe(false);
    expect(result.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

describe("enforceRateLimit", () => {
  afterEach(() => {
    mock.limit.mockReset();
    mock.limit.mockImplementation(async () => {
      throw new Error("simulated unreachable redis");
    });
  });

  it("passes when not exhausted", async () => {
    setTestEnv();
    mock.setLimitResult({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
    const request = { headers: new Headers(), method: "POST" } as unknown as NextRequest;
    const headers = await enforceRateLimit(request, {
      prefix: "rl:test",
      identifier: "1.2.3.4",
      limit: 5,
      windowSeconds: 60,
    });
    expect(headers.get("X-RateLimit-Remaining")).toBe("4");
  });

  it("throws 429 with Retry-After when exhausted", async () => {
    setTestEnv();
    mock.setLimitResult({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) + 60,
    });
    const request = { headers: new Headers(), method: "POST" } as unknown as NextRequest;
    try {
      await enforceRateLimit(request, {
        prefix: "rl:test",
        identifier: "1.2.3.4",
        limit: 5,
        windowSeconds: 60,
      });
      throw new Error("expected the call to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(429);
      expect((error as HttpError).code).toBe("rate_limited");
      expect((error as HttpError).headers?.get("Retry-After")).toBeTruthy();
    }
  });
});