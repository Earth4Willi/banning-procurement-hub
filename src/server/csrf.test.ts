import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { verifySameOrigin } from "./csrf";
import { setTestEnv } from "./testing/env-fixture";

const makeRequest = (method: string, origin?: string) =>
  ({
    method,
    headers: new Headers(origin ? { origin } : undefined),
  }) as unknown as NextRequest;

describe("verifySameOrigin", () => {
  it("passes a same-origin POST", () => {
    setTestEnv();
    expect(() => verifySameOrigin(makeRequest("POST", "http://localhost:3000"))).not.toThrow();
  });

  it("rejects a cross-origin POST", () => {
    setTestEnv();
    expect(() => verifySameOrigin(makeRequest("POST", "https://evil.example.com"))).toThrow(
      expect.objectContaining({ status: 403, code: "csrf" }),
    );
  });

  it("rejects a POST with no Origin header", () => {
    setTestEnv();
    expect(() => verifySameOrigin(makeRequest("POST"))).toThrow(
      expect.objectContaining({ status: 403, code: "csrf" }),
    );
  });

  it("ignores safe methods", () => {
    setTestEnv();
    expect(() => verifySameOrigin(makeRequest("GET"))).not.toThrow();
  });
});