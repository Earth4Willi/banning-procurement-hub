import bcrypt from "bcryptjs";
import { resetEnvCache } from "../env";

export const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:3000",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  UPSTASH_REDIS_REST_URL: "http://127.0.0.1:59999",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  AUTH_SECRET: "a".repeat(32),
  SESSION_ABS_TTL_SECONDS: "3600",
  SESSION_IDLE_TTL_SECONDS: "300",
  OWNER_EMAIL: "banning173@gmail.com",
  OWNER_PASSWORD_HASH: bcrypt.hashSync("hunter2", 4),
  OWNER_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
};

export function setTestEnv(overrides: Record<string, string> = {}): void {
  resetEnvCache();
  for (const key of Object.keys(TEST_ENV)) delete process.env[key];
  for (const [key, value] of Object.entries({ ...TEST_ENV, ...overrides })) {
    process.env[key] = value;
  }
}