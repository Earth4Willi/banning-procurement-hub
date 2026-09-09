import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { setTestEnv } from "./testing/env-fixture";
import { requireOwner } from "./require-owner";

describe("requireOwner", () => {
  it("returns null when no session cookie is present", async () => {
    setTestEnv();
    const request = new NextRequest("https://example.com/api/admin/quotes");
    await expect(requireOwner(request)).resolves.toBeNull();
  });

  it("returns the owner principal in development when the bypass flag is set", async () => {
    setTestEnv({ NODE_ENV: "development", DEV_OWNER_BYPASS: "1" });
    const request = new NextRequest("https://example.com/api/admin/quotes");
    await expect(requireOwner(request)).resolves.toEqual({
      id: "owner",
      role: "owner",
      email: "banning173@gmail.com",
    });
  });

  it("ignores the bypass in production even when the flag is set", async () => {
    setTestEnv({ NODE_ENV: "production", DEV_OWNER_BYPASS: "1" });
    const request = new NextRequest("https://example.com/api/admin/quotes");
    await expect(requireOwner(request)).resolves.toBeNull();
  });

  it("requires the flag in development", async () => {
    setTestEnv({ NODE_ENV: "development" });
    delete process.env.DEV_OWNER_BYPASS;
    const request = new NextRequest("https://example.com/api/admin/quotes");
    await expect(requireOwner(request)).resolves.toBeNull();
  });
});