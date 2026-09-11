import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  SESSION_ABS_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  SESSION_IDLE_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  OWNER_EMAIL: z.string().email(),
  OWNER_PASSWORD_HASH: z.string().min(60),
  OWNER_TOTP_SECRET: z.string().min(16),
  DEV_OWNER_BYPASS: z.enum(["1", "true"]).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
});

export type ParsedEnv = z.infer<typeof envSchema>;

let cached: ParsedEnv | null = null;

export function getEnv(source: NodeJS.ProcessEnv = process.env): ParsedEnv {
  if (cached) return cached;
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = result.data;
  if (env.NODE_ENV === "production" && /^https?:\/\/localhost(?::\d+)?$/i.test(env.APP_ORIGIN)) {
    throw new Error("APP_ORIGIN must not be a loopback address in production.");
  }
  const missingSupabase = !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY;
  if (missingSupabase && env.NODE_ENV === "production") {
    console.warn(
      "[env] SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not set. " +
        "The admin dashboard and security events log will be unavailable until the database is configured.",
    );
  }
  cached = env;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}