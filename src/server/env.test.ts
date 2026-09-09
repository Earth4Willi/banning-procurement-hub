import { describe, expect, it } from "vitest";
import { getEnv, resetEnvCache } from "./env";

const FULL = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  UPSTASH_REDIS_REST_URL: "https://upstash.example.com",
  UPSTASH_REDIS_REST_TOKEN: "token",
  AUTH_SECRET: "x".repeat(32),
  OWNER_EMAIL: "banning173@gmail.com",
  OWNER_PASSWORD_HASH: `$2b$04$${"x".repeat(53)}`,
  OWNER_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
};

describe("getEnv", () => {
  it("allows missing Supabase vars (degraded until the DB phase)", () => {
    resetEnvCache();
    const { SUPABASE_URL: _dropUrl, SUPABASE_ANON_KEY: _dropAnon, SUPABASE_SERVICE_ROLE_KEY: _dropSvc, ...rest } = FULL;
    const env = getEnv({ ...rest, NODE_ENV: "test" });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.UPSTASH_REDIS_REST_URL).toBe(FULL.UPSTASH_REDIS_REST_URL);
    resetEnvCache();
  });

  it("rejects a short AUTH_SECRET", () => {
    resetEnvCache();
    expect(() => getEnv({ ...FULL, AUTH_SECRET: "short", NODE_ENV: "test" })).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("applies defaults for session TTLs and environment", () => {
    resetEnvCache();
    const env = getEnv({ ...FULL, NODE_ENV: "test" });
    expect(env.SESSION_ABS_TTL_SECONDS).toBe(604800);
    expect(env.SESSION_IDLE_TTL_SECONDS).toBe(1800);
    expect(env.APP_ORIGIN).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("test");
    resetEnvCache();
  });
});