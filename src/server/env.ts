import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  SESSION_ABS_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  SESSION_IDLE_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  OWNER_EMAIL: z.string().email(),
  OWNER_PASSWORD_HASH: z.string().min(60),
  OWNER_TOTP_SECRET: z.string().min(16),
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
  cached = result.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}