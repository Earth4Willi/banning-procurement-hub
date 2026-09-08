import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { getEnv } from "./env";
import { HttpError } from "./http-error";

let warned = false;

function createRedis(): Redis {
  const env = getEnv();
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function toIso(reset: number): string {
  const ms = reset < 1e12 ? reset * 1000 : reset;
  return new Date(ms).toISOString();
}

/**
 * Sliding-window limiter with graceful degradation: if the Redis store is
 * unreachable we log once and let traffic through instead of bricking the site.
 */
export async function rateLimit(options: {
  prefix: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ success: boolean; headers: Headers }> {
  const headers = new Headers({ "X-RateLimit-Limit": String(options.limit) });
  const limiter = new Ratelimit({
    redis: createRedis(),
    limiter: Ratelimit.slidingWindow(options.limit, `${options.windowSeconds} s`),
    prefix: options.prefix,
  });
  try {
    const result = await limiter.limit(options.identifier);
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", toIso(result.reset));
    return { success: result.success, headers };
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn("[rate-limit] Redis unavailable, letting request through:", error);
    }
    return { success: true, headers };
  }
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns the rate-limit headers, or throws 429 (with Retry-After) when the
 * budget is exhausted. Calls rateLimit() for graceful degradation.
 */
export async function enforceRateLimit(
  request: NextRequest,
  options: { prefix: string; identifier: string; limit: number; windowSeconds: number },
): Promise<Headers> {
  const result = await rateLimit(options);
  if (!result.success) {
    const reset = result.headers.get("X-RateLimit-Reset");
    const retryAfter = reset
      ? String(Math.max(1, Math.ceil((Date.parse(reset) - Date.now()) / 1000)))
      : undefined;
    const headers = new Headers();
    if (retryAfter) headers.set("Retry-After", retryAfter);
    throw new HttpError(429, "rate_limited", "Too many requests. Try again later.", undefined, headers);
  }
  return result.headers;
}